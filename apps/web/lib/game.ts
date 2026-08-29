/**
 * CarbonLoop game core.
 *
 * Pure, framework-free, and the single source of game rules. The browser store
 * (`use-game.ts`) and the HTTP API (`demo-api.ts`) are both thin adapters over
 * this module, so gameplay can never drift between them.
 *
 * Every value here is synthetic or simulated. Nothing represents real campus
 * data, real emissions, real money, a carbon credit, or an offset.
 */
import { reproduceHistoricalCalculation, type CarbonCalculationResult } from "@carbonloop/carbon-engine";
import { requireHistoricalFactorSnapshot, type FactorVersion } from "@carbonloop/factor-registry";
import {
  appendQuestTransition,
  simulateActivity,
  type QuestTransitionEvent,
  type SimulatedActivity,
} from "@carbonloop/quest-engine";
import {
  appendRedemptionEvent,
  seededMockRewardCatalogue,
  type MockReward,
  type RedemptionEvent,
  type RedemptionState,
} from "@carbonloop/marketplace";
import {
  SYNTHETIC_LEVEL_XP_THRESHOLD,
  appendScoreEvent,
  deriveLevel,
  deriveScoreBalances,
  deriveStreak,
  greenPointsForAvoidedKgCo2e,
  type ScoreEvent,
} from "@carbonloop/scoring";

export const TRUTH_LABELS = ["SIMULATED_DEMO_ONLY", "SYNTHETIC_TEST_ONLY", "MOCK_DEMO_ONLY"] as const;

/** Fixed so a reset is byte-identical every time and the demo stays reproducible. */
export const SEED_AT = "2026-08-28T00:00:00.000Z";
export const SHUTTLE_TOKEN = "SIMULATED_DEMO_ONLY_shuttle_token_one";

// ---------------------------------------------------------------------------
// Synthetic emission factors
// ---------------------------------------------------------------------------

/**
 * Synthetic kgCO2e per km. These are demo placeholders, NOT published factors.
 * `shuttle` is deliberately non-zero: a shared ride still emits, so a shuttle
 * mission must never be scored as if the player walked.
 */
const FACTOR_VALUES = {
  motorbike: "0.100",
  walking: "0.000",
  cycling: "0.000",
  shuttle: "0.030",
} as const;

type FactorKey = keyof typeof FACTOR_VALUES;

function syntheticFactor(activityType: FactorKey): FactorVersion {
  return requireHistoricalFactorSnapshot({
    factorId: `SYNTHETIC_TEST_ONLY_${activityType}_factor`,
    versionId: `SYNTHETIC_TEST_ONLY_${activityType}_v1`,
    category: "transport",
    activityType,
    quantityUnit: "km",
    factorUnit: "kgCO2e/km",
    decimalValue: FACTOR_VALUES[activityType],
    sourceTitle: "SYNTHETIC_TEST_ONLY demo factor",
    sourcePublisher: "SYNTHETIC_TEST_ONLY",
    sourceReference: "SYNTHETIC_TEST_ONLY",
    geography: "SYNTHETIC_TEST_ONLY",
    dataLabel: "SYNTHETIC_TEST_ONLY",
    methodologyVersion: "SYNTHETIC_TEST_ONLY_v1",
    effectiveFrom: "2026-01-01",
    qualityLabel: "synthetic",
    uncertainty: "synthetic",
    createdAt: SEED_AT,
  });
}

const FACTORS: Readonly<Record<FactorKey, FactorVersion>> = {
  motorbike: syntheticFactor("motorbike"),
  walking: syntheticFactor("walking"),
  cycling: syntheticFactor("cycling"),
  shuttle: syntheticFactor("shuttle"),
};

// ---------------------------------------------------------------------------
// Mission catalogue
// ---------------------------------------------------------------------------

export type MissionDifficulty = "EASY" | "MEDIUM" | "HARD";

export type Mission = {
  questTemplateId: string;
  questType: "walk_instead_of_ride" | "cycle_instead_of_ride" | "shuttle_journey" | "zero_waste_meal";
  activityType: "walking" | "cycling" | "shuttle" | "consumption";
  title: string;
  blurb: string;
  difficulty: MissionDifficulty;
  ecoXp: number;
  /** Simulated distance. Absent for `consumption` missions, which record no distance. */
  distanceKm?: string;
  evidenceTier: "V1" | "V2";
  evidenceSource: string;
  /**
   * Whether the mission may claim avoided CO2e. `false` means Eco XP only —
   * the honest outcome when nothing motorised was displaced.
   */
  carbonClaim: boolean;
  /** Requires a scanned synthetic token before it can be completed. */
  requiresToken: boolean;
};

export const MISSIONS: readonly Mission[] = [
  {
    questTemplateId: "SIMULATED_DEMO_ONLY_walk_quest",
    questType: "walk_instead_of_ride",
    activityType: "walking",
    title: "Walk to Campus",
    blurb: "Walk 2.5 km instead of taking a motorbike to the main campus building.",
    difficulty: "EASY",
    ecoXp: 25,
    distanceKm: "2.5",
    evidenceTier: "V2",
    evidenceSource: "simulated_pedometer",
    carbonClaim: true,
    requiresToken: false,
  },
  {
    questTemplateId: "SIMULATED_DEMO_ONLY_cycle_quest",
    questType: "cycle_instead_of_ride",
    activityType: "cycling",
    title: "Cycle the Ring Road",
    blurb: "Ride 6 km around campus instead of taking a motorbike.",
    difficulty: "MEDIUM",
    ecoXp: 40,
    distanceKm: "6.0",
    evidenceTier: "V2",
    evidenceSource: "simulated_pedometer",
    carbonClaim: true,
    requiresToken: false,
  },
  {
    questTemplateId: "SIMULATED_DEMO_ONLY_shuttle_quest",
    questType: "shuttle_journey",
    activityType: "shuttle",
    title: "Green Shuttle Check-in",
    blurb: "Scan the synthetic QR token at the North Green Shuttle stop for a 5 km shared ride.",
    difficulty: "MEDIUM",
    ecoXp: 30,
    distanceKm: "5.0",
    evidenceTier: "V1",
    evidenceSource: "synthetic_demo_token",
    carbonClaim: true,
    requiresToken: true,
  },
  {
    questTemplateId: "SIMULATED_DEMO_ONLY_zero_waste_quest",
    questType: "zero_waste_meal",
    activityType: "consumption",
    title: "Zero-Waste Lunch",
    blurb: "Buy a meal using only reusable containers. Nothing motorised is displaced, so this earns Eco XP only.",
    difficulty: "HARD",
    ecoXp: 60,
    evidenceTier: "V2",
    evidenceSource: "simulated_receipt",
    carbonClaim: false,
    requiresToken: false,
  },
];

export const REWARDS: readonly MockReward[] = seededMockRewardCatalogue;

export function findMission(questTemplateId: string): Mission | undefined {
  return MISSIONS.find((mission) => mission.questTemplateId === questTemplateId);
}

/** Player-facing rank titles. Purely cosmetic progression flavour. */
const TITLES = ["Seedling", "Sprout", "Pathfinder", "Trailblazer", "Eco-Warrior", "Climate Steward"] as const;
export function levelTitle(level: number): string {
  return TITLES[Math.min(level - 1, TITLES.length - 1)] ?? TITLES[0];
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export type RunRecord = {
  questRunId: string;
  questTemplateId: string;
  questType: Mission["questType"];
  state: "active" | "completed";
  startedAt: string;
  completedAt?: string;
  history: QuestTransitionEvent[];
};

export type RedemptionRecord = {
  redemptionId: string;
  rewardItemId: string;
  state: RedemptionState;
  redeemedAt: string;
  history: RedemptionEvent[];
};

export type GameState = {
  /** Monotonic id counter. Kept in state so ids stay stable across reloads. */
  seq: number;
  events: ScoreEvent[];
  runs: RunRecord[];
  redemptions: RedemptionRecord[];
  usedTokens: string[];
};

/**
 * The API's deterministic reset seed. The browser game deliberately does not start
 * from it: a new player has completed nothing, so every counter must read zero rather
 * than crediting them with 2.5 kg they never avoided.
 */
export const SEED_EVENT: ScoreEvent = {
  eventId: "SYNTHETIC_TEST_ONLY_seed_green",
  questRunId: "SYNTHETIC_TEST_ONLY_seed_run",
  occurredAt: SEED_AT,
  idempotencyKey: "SYNTHETIC_TEST_ONLY_seed_green",
  type: "green_points_issued",
  amount: 10,
  calculationId: "SYNTHETIC_TEST_ONLY_seed_calculation",
  evidenceTier: "V2",
  activityType: "walking",
  avoidedKgCo2e: "0.250000",
  carbonResultStatus: "calculated",
};

export function initialState(): GameState {
  return { seq: 0, events: [], runs: [], redemptions: [], usedTokens: [] };
}

/**
 * Score and quest histories must never move backwards in time. A stale save or a
 * skewed clock would otherwise wedge the game permanently, so clamp forward.
 */
function timestamp(state: GameState, now: string): string {
  const latest = [
    ...state.events.map((event) => event.occurredAt),
    ...state.runs.flatMap((run) => run.history.map((event) => event.occurredAt)),
  ].reduce((max, value) => (value > max ? value : max), "");
  return now > latest ? now : latest;
}

type Issued = { state: GameState; nextId: (prefix: string) => string };
function withIds(state: GameState): Issued {
  let seq = state.seq;
  const next = { ...state, seq };
  return {
    state: next,
    nextId: (prefix: string) => {
      seq += 1;
      next.seq = seq;
      return `${prefix}_${seq}`;
    },
  };
}

export type ActionFailure = { ok: false; code: string; message: string };
function fail(code: string, message: string): ActionFailure {
  return { ok: false, code, message };
}

// ---------------------------------------------------------------------------
// Carbon
// ---------------------------------------------------------------------------

/**
 * Avoided CO2e for a distance travelled by `activityType` instead of by motorbike.
 * Every caller — the browser game and the HTTP demo API — routes through this, so
 * an activity can never be costed with another activity's emission factor.
 */
export function syntheticCarbon(input: {
  activityType: FactorKey;
  distanceKm: string;
  evidenceTier: "V1" | "V2";
  calculationId: string;
  calculatedAt: string;
}): CarbonCalculationResult {
  return reproduceHistoricalCalculation({
    calculationId: input.calculationId,
    activityType: input.activityType,
    baseline: {
      baselineId: "SYNTHETIC_TEST_ONLY_motorbike_baseline",
      kind: "seeded_demonstration",
      quantity: input.distanceKm,
      unit: "km",
      dataLabel: "SYNTHETIC_TEST_ONLY",
      declaredAt: SEED_AT,
      displacedMotorizedBaseline: true,
      truthLabels: ["seeded", "simulated"],
    },
    actualQuantity: input.distanceKm,
    actualUnit: "km",
    evidenceTier: input.evidenceTier,
    truthLabels: ["seeded", "simulated"],
    calculatedAt: input.calculatedAt,
    baselineFactorSnapshot: FACTORS.motorbike,
    actualFactorSnapshot: FACTORS[input.activityType],
  });
}

/**
 * Calculates avoided CO2e for a mission against a displaced motorbike baseline,
 * using the mission's own activity factor. A mission with `carbonClaim: false`
 * returns undefined: no baseline was displaced, so no claim is made.
 */
export function missionCarbon(
  mission: Mission,
  calculationId: string,
  calculatedAt: string,
): CarbonCalculationResult | undefined {
  if (!mission.carbonClaim || mission.distanceKm === undefined) return undefined;
  if (mission.activityType === "consumption") return undefined;
  return syntheticCarbon({
    activityType: mission.activityType,
    distanceKm: mission.distanceKm,
    evidenceTier: mission.evidenceTier,
    calculationId,
    calculatedAt,
  });
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type StartResult = { ok: true; state: GameState; run: RunRecord } | ActionFailure;

export function startMission(state: GameState, questTemplateId: string, now: string): StartResult {
  const mission = findMission(questTemplateId);
  if (mission === undefined)
    return fail("QUEST_TEMPLATE_NOT_FOUND", "That mission does not exist in the synthetic catalogue.");
  if (state.runs.some((run) => run.state === "active")) {
    return fail("MISSION_ALREADY_ACTIVE", "Finish or abandon the active mission before starting another.");
  }
  if (mission.requiresToken && state.usedTokens.includes(SHUTTLE_TOKEN)) {
    return fail(
      "SHUTTLE_TOKEN_REPLAYED",
      "The synthetic demo shuttle token was already used. Reset the demo to scan it again.",
    );
  }

  const { state: base, nextId } = withIds(state);
  const at = timestamp(base, now);
  const questRunId = nextId("SIMULATED_DEMO_ONLY_run");
  const transition = appendQuestTransition([], {
    eventId: nextId("quest_event"),
    questRunId,
    questType: mission.questType,
    from: "available",
    to: "active",
    occurredAt: at,
    idempotencyKey: `${questRunId}_start`,
  });
  if (transition.status === "rejected") return fail("QUEST_TRANSITION_REJECTED", transition.reason);

  const run: RunRecord = {
    questRunId,
    questTemplateId: mission.questTemplateId,
    questType: mission.questType,
    state: "active",
    startedAt: at,
    history: [...transition.history],
  };
  return { ok: true, state: { ...base, runs: [...base.runs, run] }, run };
}

export type CompletionOutcome = {
  run: RunRecord;
  mission: Mission;
  activity: SimulatedActivity;
  carbonResult?: CarbonCalculationResult;
  ecoXpIssued: number;
  greenPointsIssued: number;
  /** Set when the mission legitimately earns no Green Points, with the reason why. */
  noCarbonClaimReason?: string;
  leveledUpTo?: number;
};

export type CompleteResult = { ok: true; state: GameState; outcome: CompletionOutcome } | ActionFailure;

export function completeMission(state: GameState, questRunId: string, now: string): CompleteResult {
  const existing = state.runs.find((run) => run.questRunId === questRunId);
  if (existing === undefined) return fail("QUEST_RUN_NOT_FOUND", "The simulated quest run does not exist.");
  if (existing.state === "completed")
    return fail("QUEST_ALREADY_COMPLETED", "The simulated quest run is already complete.");
  const mission = findMission(existing.questTemplateId);
  if (mission === undefined)
    return fail("QUEST_TEMPLATE_NOT_FOUND", "That mission does not exist in the synthetic catalogue.");

  const { state: base, nextId } = withIds(state);
  const at = timestamp(base, now);

  const transition = appendQuestTransition(existing.history, {
    eventId: nextId("quest_event"),
    questRunId,
    questType: existing.questType,
    from: "active",
    to: "completed",
    occurredAt: at,
    idempotencyKey: `${questRunId}_complete`,
  });
  if (transition.status === "rejected") return fail("QUEST_TRANSITION_REJECTED", transition.reason);

  const activity = simulateActivity({
    questRunId,
    occurredAt: at,
    activityType: mission.activityType,
    ...(mission.distanceKm === undefined ? {} : { distanceKm: mission.distanceKm }),
  });

  const levelBefore = deriveLevel(deriveScoreBalances(base.events).ecoXp);
  const carbonResult = missionCarbon(mission, nextId("synthetic_calculation"), at);

  let events = base.events;
  const xp = appendScoreEvent(events, {
    eventId: nextId("xp"),
    questRunId,
    occurredAt: at,
    idempotencyKey: `${questRunId}_xp`,
    type: "eco_xp_issued",
    amount: mission.ecoXp,
    mission: { questRunId, questType: existing.questType, state: "completed", completedAt: at },
  });
  if (xp.status === "rejected") return fail("SCORE_REJECTED", xp.reason);
  events = [...xp.history];

  let greenPointsIssued = 0;
  let noCarbonClaimReason: string | undefined;
  if (carbonResult === undefined) {
    noCarbonClaimReason = "No motorised baseline was displaced, so no avoided CO2e is claimed. Eco XP only.";
  } else if (carbonResult.status !== "calculated") {
    noCarbonClaimReason = carbonResult.reason;
  } else {
    const points = greenPointsForAvoidedKgCo2e(carbonResult.avoidedKgCo2e);
    if (points <= 0) {
      noCarbonClaimReason = "Avoided CO2e rounded below one Green Point, so none were issued.";
    } else {
      const green = appendScoreEvent(events, {
        eventId: nextId("green"),
        questRunId,
        occurredAt: at,
        idempotencyKey: `${questRunId}_green`,
        type: "green_points_issued",
        amount: points,
        calculationId: carbonResult.calculationId,
        evidenceTier: mission.evidenceTier,
        activityType: mission.activityType,
        avoidedKgCo2e: carbonResult.avoidedKgCo2e,
        carbonResultStatus: "calculated",
      });
      if (green.status === "rejected") return fail("SCORE_REJECTED", green.reason);
      events = [...green.history];
      greenPointsIssued = points;
    }
  }

  const run: RunRecord = { ...existing, state: "completed", completedAt: at, history: [...transition.history] };
  const nextState: GameState = {
    ...base,
    events,
    runs: base.runs.map((candidate) => (candidate.questRunId === questRunId ? run : candidate)),
    usedTokens: mission.requiresToken ? [...new Set([...base.usedTokens, SHUTTLE_TOKEN])] : base.usedTokens,
  };

  const levelAfter = deriveLevel(deriveScoreBalances(events).ecoXp);
  return {
    ok: true,
    state: nextState,
    outcome: {
      run,
      mission,
      activity,
      carbonResult,
      ecoXpIssued: mission.ecoXp,
      greenPointsIssued,
      noCarbonClaimReason,
      ...(levelAfter > levelBefore ? { leveledUpTo: levelAfter } : {}),
    },
  };
}

export type RedeemResult = { ok: true; state: GameState; redemption: RedemptionRecord } | ActionFailure;

export function redeemReward(state: GameState, rewardItemId: string, now: string): RedeemResult {
  const reward = REWARDS.find((candidate) => candidate.rewardItemId === rewardItemId);
  if (reward === undefined) return fail("REWARD_NOT_FOUND", "That mock reward is not in the catalogue.");

  const spent = state.redemptions.reduce((total, redemption) => {
    const item = REWARDS.find((candidate) => candidate.rewardItemId === redemption.rewardItemId);
    return redemption.state === "reserved" || redemption.state === "redeemed"
      ? total + (item?.greenPointsCost ?? 0)
      : total;
  }, 0);
  const available = deriveScoreBalances(state.events).greenPoints - spent;
  if (available < reward.greenPointsCost) {
    return fail("INSUFFICIENT_GREEN_POINTS", "Synthetic demo balance is insufficient for this mock reward.");
  }

  const { state: base, nextId } = withIds(state);
  const at = timestamp(base, now);
  const redemptionId = nextId("MOCK_DEMO_ONLY_redemption");
  const appended = appendRedemptionEvent([], {
    eventId: nextId("redemption_event"),
    redemptionId,
    rewardItemId,
    from: "available",
    to: "reserved",
    occurredAt: at,
    idempotencyKey: `${redemptionId}_reserve`,
    fulfilmentLabel: "MOCK_DEMO_ONLY",
  });
  if (appended.status === "rejected") return fail("REDEMPTION_REJECTED", appended.reason);

  const redemption: RedemptionRecord = {
    redemptionId,
    rewardItemId,
    state: appended.state,
    redeemedAt: at,
    history: [...appended.history],
  };
  return { ok: true, state: { ...base, redemptions: [...base.redemptions, redemption] }, redemption };
}

export function resetGame(): GameState {
  return initialState();
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export type EvidenceTierCounts = { V1: number; V2: number; V3: number; V4: number };

/**
 * Real per-tier counts from a score ledger. Only Green Point events carry an
 * evidence tier, so XP-only completions are correctly absent rather than
 * silently counted as the strongest tier.
 */
export function evidenceTierCounts(events: readonly ScoreEvent[]): EvidenceTierCounts {
  const counts: EvidenceTierCounts = { V1: 0, V2: 0, V3: 0, V4: 0 };
  for (const event of events) {
    if (event.type === "green_points_issued") counts[event.evidenceTier] += 1;
  }
  return counts;
}

/** Journeys that produced an evidence-backed Green Point award. */
export function eligibleJourneyCount(events: readonly ScoreEvent[]): number {
  return events.filter((event) => event.type === "green_points_issued").length;
}

export type DerivedGame = {
  level: number;
  levelTitle: string;
  ecoXp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  greenPoints: number;
  /** Points not already committed to a reserved or redeemed mock reward. */
  spendableGreenPoints: number;
  avoidedKgCo2e: string;
  streakDays: number;
  missionsCompleted: number;
  completedTemplateIds: string[];
  activeRun?: RunRecord;
  tierCounts: EvidenceTierCounts;
  eligibleJourneys: number;
};

export function derive(state: GameState): DerivedGame {
  const balances = deriveScoreBalances(state.events);
  const level = deriveLevel(balances.ecoXp);
  const completed = state.runs.filter((run) => run.state === "completed");

  const tierCounts = evidenceTierCounts(state.events);
  const eligibleJourneys = eligibleJourneyCount(state.events);

  const spent = state.redemptions.reduce((total, redemption) => {
    const item = REWARDS.find((candidate) => candidate.rewardItemId === redemption.rewardItemId);
    return redemption.state === "reserved" || redemption.state === "redeemed"
      ? total + (item?.greenPointsCost ?? 0)
      : total;
  }, 0);

  return {
    level,
    levelTitle: levelTitle(level),
    ecoXp: balances.ecoXp,
    xpIntoLevel: balances.ecoXp % SYNTHETIC_LEVEL_XP_THRESHOLD,
    xpForNextLevel: SYNTHETIC_LEVEL_XP_THRESHOLD,
    greenPoints: balances.greenPoints,
    spendableGreenPoints: balances.greenPoints - spent,
    avoidedKgCo2e: balances.avoidedKgCo2e,
    streakDays: deriveStreak(
      completed.map((run) => ({ completedAt: run.completedAt ?? run.startedAt, eligible: true })),
    ),
    missionsCompleted: completed.length,
    completedTemplateIds: completed.map((run) => run.questTemplateId),
    activeRun: state.runs.find((run) => run.state === "active"),
    tierCounts,
    eligibleJourneys,
  };
}

/**
 * Synthetic cohort for the leaderboard. Fixed opponents, with the real player
 * ranked among them by actual Eco XP so the board responds to real play.
 */
const SYNTHETIC_COHORT = [
  { name: "NeonGlider", ecoXp: 1420 },
  { name: "EcoGhost_99", ecoXp: 1280 },
  { name: "SolarMoth", ecoXp: 960 },
  { name: "QuietPedal", ecoXp: 640 },
  { name: "RootSystem", ecoXp: 410 },
  { name: "PaperKite", ecoXp: 180 },
  { name: "FirstStep", ecoXp: 60 },
] as const;

export type LeaderboardRow = { rank: number; name: string; ecoXp: number; isPlayer: boolean };

export function leaderboard(ecoXp: number): LeaderboardRow[] {
  return [...SYNTHETIC_COHORT.map((row) => ({ ...row, isPlayer: false })), { name: "You", ecoXp, isPlayer: true }]
    .sort((left, right) => right.ecoXp - left.ecoXp || Number(left.isPlayer) - Number(right.isPlayer))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

/** Privacy-safe aggregate. Counts only; never a name, route, or per-player figure. */
export function campusAggregate(state: GameState) {
  const derived = derive(state);
  return {
    campusId: "SYNTHETIC_TEST_ONLY_campus",
    privacyThresholdApplied: true,
    minimumCohort: "SYNTHETIC_TEST_ONLY",
    metrics: {
      syntheticEligibleJourneys: derived.eligibleJourneys,
      syntheticMissionsCompleted: derived.missionsCompleted,
      syntheticAvoidedKgCo2e: Number(derived.avoidedKgCo2e),
    },
    evidenceQuality: derived.tierCounts,
    recordLabel: "SYNTHETIC_TEST_ONLY",
  };
}
