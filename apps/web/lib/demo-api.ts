/**
 * HTTP surface for the CarbonLoop demo.
 *
 * All carbon and points rules are imported from `lib/game.ts`, so this API and the
 * browser game can never disagree about what a mission is worth. What differs is
 * request flow only: this surface is stateless-per-process, allows concurrent quest
 * runs, and exposes shuttle check-in as a standalone endpoint.
 *
 * ponytail: state is module-level and process-local, which means a multi-instance
 * or serverless deploy gives each instance its own copy. That is fine for a labelled
 * demo and is stated in every response; swap this module for a real store if the
 * API ever needs to be authoritative.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { appendQuestTransition, simulateActivity, type QuestTransitionEvent } from "@carbonloop/quest-engine";
import {
  appendScoreEvent,
  deriveLevel,
  deriveScoreBalances,
  deriveStreak,
  greenPointsForAvoidedKgCo2e,
  type ScoreEvent,
} from "@carbonloop/scoring";
import { appendRedemptionEvent, seededMockRewardCatalogue } from "@carbonloop/marketplace";

import {
  MISSIONS,
  SEED_AT,
  SEED_EVENT,
  SHUTTLE_TOKEN,
  eligibleJourneyCount,
  evidenceTierCounts,
  findMission,
  syntheticCarbon,
  type Mission,
} from "@/lib/game";

type TruthLabel = "SIMULATED_DEMO_ONLY" | "SYNTHETIC_TEST_ONLY" | "MOCK_DEMO_ONLY" | "PROJECTED" | "VERIFIED";
const labels: TruthLabel[] = ["SIMULATED_DEMO_ONLY", "SYNTHETIC_TEST_ONLY", "MOCK_DEMO_ONLY"];

/** Frozen clock: the demo seed must reset byte-identically every time. */
const now = SEED_AT;

type RunRecord = {
  questRunId: string;
  questTemplateId: string;
  questType: Mission["questType"];
  state: "active" | "completed";
  history: QuestTransitionEvent[];
  completedAt?: string;
};

let sequence = 0;
const id = (prefix: string) => `${prefix}_${(sequence += 1)}`;
const runs = new Map<string, RunRecord>();
const usedTokens = new Set<string>();
const idempotent = new Map<string, { status: number; payload: Record<string, unknown> }>();
let scoreHistory: ScoreEvent[] = [];
/** Points already committed to mock redemptions, so a fresh key cannot overspend. */
let committedPoints = 0;

const resetResponseSchema = z.object({
  reset: z.literal("SIMULATED_DEMO_ONLY"),
  persistence: z.literal("SIMULATED_DEMO_ONLY process-local repository reset; not production persistence"),
  truthLabels: z.array(z.string()).min(1),
});

function response(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ...data, truthLabels: data.truthLabels ?? labels }, { status });
}

function requestId(request: Request) {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}

function error(request: Request, code: string, message: string, status: number) {
  return response({ code, message, requestId: requestId(request) }, status);
}

async function body<T>(request: Request, schema: z.ZodType<T>): Promise<T | NextResponse> {
  try {
    return schema.parse(await request.json());
  } catch {
    return error(request, "VALIDATION_ERROR", "Request body does not match the demo API contract.", 400);
  }
}

function key(request: Request): string | NextResponse {
  const value = request.headers.get("idempotency-key");
  return value?.trim()
    ? value
    : error(request, "IDEMPOTENCY_KEY_REQUIRED", "An Idempotency-Key header is required for demo writes.", 400);
}

/**
 * Appends a score event, returning the rejection reason instead of throwing so a
 * caller can respond with a 409 rather than tearing down a half-applied write.
 */
function appendScore(event: unknown): string | null {
  try {
    const result = appendScoreEvent(scoreHistory, event);
    if (result.status === "rejected") return result.reason;
    scoreHistory = [...result.history];
    return null;
  } catch (cause) {
    return cause instanceof Error ? cause.message : "Invalid score event.";
  }
}

function resetRepository() {
  sequence = 0;
  runs.clear();
  usedTokens.clear();
  idempotent.clear();
  scoreHistory = [SEED_EVENT];
  committedPoints = 0;
}

resetRepository();

/** Replays a previously stored response for a repeated idempotency key. */
function replay(storageKey: string) {
  const stored = idempotent.get(storageKey);
  return stored === undefined ? null : response(stored.payload, stored.status === 201 ? 200 : stored.status);
}

function remember(storageKey: string, status: number, payload: Record<string, unknown>) {
  idempotent.set(storageKey, { status, payload });
  return response(payload, status);
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

export async function health() {
  return response({
    status: "ok",
    persistence: "SIMULATED_DEMO_ONLY process-local repository; not production persistence",
  });
}

export async function reset(request: Request) {
  const parsed = await body(request, z.object({}).strict());
  if (parsed instanceof NextResponse) return parsed;
  const requestKey = key(request);
  if (requestKey instanceof NextResponse) return requestKey;
  resetRepository();
  return NextResponse.json(
    resetResponseSchema.parse({
      reset: "SIMULATED_DEMO_ONLY",
      persistence: "SIMULATED_DEMO_ONLY process-local repository reset; not production persistence",
      truthLabels: labels,
    }),
  );
}

export async function quests() {
  return response({
    quests: MISSIONS.map((mission) => ({
      questTemplateId: mission.questTemplateId,
      title: `SIMULATED_DEMO_ONLY ${mission.title}`,
      type: mission.questType,
      difficulty: mission.difficulty,
      ecoXp: mission.ecoXp,
      simulatedDistanceKm: mission.distanceKm ?? null,
      evidenceTier: mission.evidenceTier,
      // Stated up front so a client cannot promise Green Points a mission never pays.
      claimsAvoidedCo2e: mission.carbonClaim,
    })),
  });
}

const createRunSchema = z.object({
  questTemplateId: z.enum(MISSIONS.map((mission) => mission.questTemplateId) as [string, ...string[]]),
});

export async function createRun(request: Request) {
  const parsed = await body(request, createRunSchema);
  if (parsed instanceof NextResponse) return parsed;
  const requestKey = key(request);
  if (requestKey instanceof NextResponse) return requestKey;
  const replayed = replay(requestKey);
  if (replayed !== null) return replayed;

  const mission = findMission(parsed.questTemplateId);
  if (mission === undefined) {
    return error(request, "QUEST_TEMPLATE_NOT_FOUND", "That mission does not exist in the synthetic catalogue.", 404);
  }

  const questRunId = id("SIMULATED_DEMO_ONLY_run");
  const transition = appendQuestTransition([], {
    eventId: id("quest_event"),
    questRunId,
    questType: mission.questType,
    from: "available",
    to: "active",
    occurredAt: now,
    idempotencyKey: `${requestKey}-transition`,
  });
  if (transition.status === "rejected") return error(request, "QUEST_TRANSITION_REJECTED", transition.reason, 409);

  runs.set(questRunId, {
    questRunId,
    questTemplateId: mission.questTemplateId,
    questType: mission.questType,
    state: "active",
    history: [...transition.history],
  });
  return remember(requestKey, 201, {
    questRun: { questRunId, questType: mission.questType, state: "active", recordLabel: "SIMULATED_DEMO_ONLY" },
  });
}

const completeRunSchema = z.object({
  // Client-asserted distance, so it is bounded. A demo must not let an unverified
  // claim mint an unbounded number of Green Points.
  distanceKm: z
    .string()
    .regex(/^\d+(?:\.\d+)?$/)
    .refine((value) => Number(value) > 0 && Number(value) <= 100, "distanceKm must be between 0 and 100."),
  replacedMotorizedBaseline: z.boolean(),
});

export async function completeRun(request: Request, questRunId: string) {
  const parsed = await body(request, completeRunSchema);
  if (parsed instanceof NextResponse) return parsed;
  const requestKey = key(request);
  if (requestKey instanceof NextResponse) return requestKey;
  const replayed = replay(requestKey);
  if (replayed !== null) return replayed;

  const run = runs.get(questRunId);
  if (run === undefined) return error(request, "QUEST_RUN_NOT_FOUND", "The simulated quest run does not exist.", 404);
  if (run.state === "completed") {
    return error(request, "QUEST_ALREADY_COMPLETED", "The simulated quest run is already complete.", 409);
  }
  const mission = findMission(run.questTemplateId);
  if (mission === undefined) {
    return error(request, "QUEST_TEMPLATE_NOT_FOUND", "That mission does not exist in the synthetic catalogue.", 404);
  }

  const transition = appendQuestTransition(run.history, {
    eventId: id("quest_event"),
    questRunId,
    questType: run.questType,
    from: "active",
    to: "completed",
    occurredAt: now,
    idempotencyKey: requestKey,
  });
  if (transition.status === "rejected") return error(request, "QUEST_TRANSITION_REJECTED", transition.reason, 409);

  const distanceBased = mission.activityType !== "consumption";
  const activity = simulateActivity({
    questRunId,
    occurredAt: now,
    activityType: mission.activityType,
    ...(distanceBased ? { distanceKm: parsed.distanceKm } : {}),
  });

  // Carbon is claimed only when the mission type allows it AND the caller asserts a
  // motorised baseline was displaced. Either being false means Eco XP only.
  const claims = mission.carbonClaim && parsed.replacedMotorizedBaseline && distanceBased;
  const carbonResult = claims
    ? syntheticCarbon({
        activityType: mission.activityType as "walking" | "cycling" | "shuttle",
        distanceKm: parsed.distanceKm,
        evidenceTier: mission.evidenceTier,
        calculationId: id("synthetic_calculation"),
        calculatedAt: now,
      })
    : undefined;

  const xpFailure = appendScore({
    eventId: id("xp"),
    questRunId,
    occurredAt: now,
    idempotencyKey: `${requestKey}-xp`,
    type: "eco_xp_issued",
    amount: mission.ecoXp,
    mission: { questRunId, questType: run.questType, state: "completed", completedAt: now },
  });
  if (xpFailure !== null) return error(request, "SCORE_REJECTED", xpFailure, 409);

  // Only mutate the run after the ledger write succeeds, so a rejected score can
  // never leave a completed run with no points behind it.
  run.history = [...transition.history];
  run.state = "completed";
  run.completedAt = now;

  let greenPointsIssued = 0;
  let noCarbonClaimReason: string | undefined;
  if (carbonResult === undefined) {
    noCarbonClaimReason = mission.carbonClaim
      ? "No motorised baseline was displaced, so no avoided CO2e is claimed."
      : "This mission type makes no avoided-CO2e claim. Eco XP only.";
  } else if (carbonResult.status !== "calculated") {
    noCarbonClaimReason = carbonResult.reason;
  } else {
    const points = greenPointsForAvoidedKgCo2e(carbonResult.avoidedKgCo2e);
    if (points <= 0) {
      noCarbonClaimReason = "Avoided CO2e rounded below one Green Point, so none were issued.";
    } else {
      const failure = appendScore({
        eventId: id("green"),
        questRunId,
        occurredAt: now,
        idempotencyKey: `${requestKey}-green`,
        type: "green_points_issued",
        amount: points,
        calculationId: carbonResult.calculationId,
        evidenceTier: mission.evidenceTier,
        activityType: mission.activityType,
        avoidedKgCo2e: carbonResult.avoidedKgCo2e,
        carbonResultStatus: "calculated",
      });
      if (failure !== null) return error(request, "SCORE_REJECTED", failure, 409);
      greenPointsIssued = points;
    }
  }

  return remember(requestKey, 200, {
    questRun: { ...run, recordLabel: "SIMULATED_DEMO_ONLY" },
    activity,
    carbonResult,
    ecoXpIssued: mission.ecoXp,
    greenPointsIssued,
    ...(noCarbonClaimReason === undefined ? {} : { noCarbonClaimReason }),
  });
}

const shuttleMission = MISSIONS.find((mission) => mission.requiresToken && mission.distanceKm !== undefined);
if (shuttleMission === undefined || shuttleMission.distanceKm === undefined) {
  throw new Error("The mission catalogue must contain a token-gated shuttle mission with a simulated distance.");
}
const shuttleDistanceKm = shuttleMission.distanceKm;
const shuttleEvidenceSource = shuttleMission.evidenceSource;

export async function shuttle(request: Request) {
  const parsed = await body(request, z.object({ token: z.literal(SHUTTLE_TOKEN) }));
  if (parsed instanceof NextResponse) return parsed;
  const requestKey = key(request);
  if (requestKey instanceof NextResponse) return requestKey;
  const replayed = replay(requestKey);
  if (replayed !== null) return replayed;

  if (usedTokens.has(parsed.token)) {
    return error(request, "SHUTTLE_TOKEN_REPLAYED", "The synthetic demo shuttle token was already used.", 409);
  }

  const questRunId = id("SIMULATED_DEMO_ONLY_shuttle_run");
  const carbonResult = syntheticCarbon({
    // The shuttle is a shared motorised ride, so it is costed with the shuttle
    // factor. It used to be costed as walking, which credited it with zero emissions.
    activityType: "shuttle",
    distanceKm: shuttleDistanceKm,
    evidenceTier: "V1",
    calculationId: id("synthetic_calculation"),
    calculatedAt: now,
  });

  let greenPointsIssued = 0;
  if (carbonResult.status === "calculated") {
    const points = greenPointsForAvoidedKgCo2e(carbonResult.avoidedKgCo2e);
    if (points > 0) {
      const failure = appendScore({
        eventId: id("green"),
        questRunId,
        occurredAt: now,
        idempotencyKey: `${requestKey}-green`,
        type: "green_points_issued",
        amount: points,
        calculationId: carbonResult.calculationId,
        evidenceTier: "V1",
        activityType: "shuttle",
        avoidedKgCo2e: carbonResult.avoidedKgCo2e,
        carbonResultStatus: "calculated",
      });
      if (failure !== null) return error(request, "SCORE_REJECTED", failure, 409);
      greenPointsIssued = points;
    }
  }
  usedTokens.add(parsed.token);

  return remember(requestKey, 200, {
    evidence: {
      evidenceId: id("SIMULATED_DEMO_ONLY_evidence"),
      tier: "V1",
      source: shuttleEvidenceSource,
      verificationLabel: "VERIFIED",
      recordLabel: "SIMULATED_DEMO_ONLY",
    },
    carbonResult,
    greenPointsIssued,
    truthLabels: [...labels, "VERIFIED"],
  });
}

export async function progress() {
  const balances = deriveScoreBalances(scoreHistory);
  const completed = [...runs.values()].filter((run) => run.state === "completed");
  return response({
    player: { playerId: "SYNTHETIC_TEST_ONLY_player", recordLabel: "SYNTHETIC_TEST_ONLY" },
    progress: {
      level: deriveLevel(balances.ecoXp),
      ecoXp: balances.ecoXp,
      streakDays: deriveStreak(completed.map((run) => ({ completedAt: run.completedAt ?? now, eligible: true }))),
      greenPoints: balances.greenPoints,
      avoidedKgCo2e: balances.avoidedKgCo2e,
      missionsCompleted: completed.length,
    },
  });
}

export async function ledger() {
  return response({
    events: scoreHistory,
    balances: deriveScoreBalances(scoreHistory),
    ledgerLabel: "SIMULATED_DEMO_ONLY append-only",
  });
}

export async function catalogue() {
  return response({
    rewards: seededMockRewardCatalogue.map((reward) => ({ ...reward, recordLabel: "MOCK_DEMO_ONLY" })),
  });
}

const redeemSchema = z.object({
  rewardItemId: z.enum(seededMockRewardCatalogue.map((reward) => reward.rewardItemId) as [string, ...string[]]),
});

export async function redeem(request: Request) {
  const parsed = await body(request, redeemSchema);
  if (parsed instanceof NextResponse) return parsed;
  const requestKey = key(request);
  if (requestKey instanceof NextResponse) return requestKey;
  const replayed = replay(requestKey);
  if (replayed !== null) return replayed;

  const reward = seededMockRewardCatalogue.find((candidate) => candidate.rewardItemId === parsed.rewardItemId);
  if (reward === undefined) return error(request, "REWARD_NOT_FOUND", "That mock reward is not in the catalogue.", 404);
  const spendable = deriveScoreBalances(scoreHistory).greenPoints - committedPoints;
  if (spendable < reward.greenPointsCost) {
    return error(
      request,
      "INSUFFICIENT_GREEN_POINTS",
      "Synthetic demo balance is insufficient for this mock reward.",
      409,
    );
  }

  const redemptionId = id("MOCK_DEMO_ONLY_redemption");
  const appended = appendRedemptionEvent([], {
    eventId: id("redemption_event"),
    redemptionId,
    rewardItemId: parsed.rewardItemId,
    from: "available",
    to: "reserved",
    occurredAt: now,
    idempotencyKey: requestKey,
    fulfilmentLabel: "MOCK_DEMO_ONLY",
  });
  if (appended.status === "rejected") return error(request, "REDEMPTION_REJECTED", appended.reason, 409);
  committedPoints += reward.greenPointsCost;

  return remember(requestKey, 201, {
    redemption: {
      redemptionId,
      state: appended.state,
      rewardItemId: parsed.rewardItemId,
      greenPointsCost: reward.greenPointsCost,
      recordLabel: "MOCK_DEMO_ONLY",
      fulfilment: "MOCK_DEMO_ONLY no payment or delivery",
    },
  });
}

export async function campus() {
  const balances = deriveScoreBalances(scoreHistory);
  return response({
    aggregate: {
      campusId: "SYNTHETIC_TEST_ONLY_campus",
      privacyThresholdApplied: true,
      minimumCohort: "SYNTHETIC_TEST_ONLY",
      metrics: {
        // Journeys are Green-Point-issuing events, not every ledger row: XP-only
        // completions are not journeys and must not inflate this count.
        syntheticEligibleJourneys: eligibleJourneyCount(scoreHistory),
        syntheticMissionsCompleted: [...runs.values()].filter((run) => run.state === "completed").length,
        syntheticAvoidedKgCo2e: balances.avoidedKgCo2e,
      },
      evidenceQuality: evidenceTierCounts(scoreHistory),
      recordLabel: "SYNTHETIC_TEST_ONLY",
    },
  });
}
