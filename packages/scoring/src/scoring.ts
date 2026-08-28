import type { CarbonCalculationResult } from "@carbonloop/carbon-engine";
import { evidenceTierSchema, isoTimestampSchema, opaqueIdSchema } from "@carbonloop/schemas";
import { z } from "zod";

export const SYNTHETIC_TEST_ONLY = "SYNTHETIC_TEST_ONLY" as const;
export const syntheticConversionRateSchema = z.object({ pointsPerKgCo2e: z.string().regex(/^\d+(?:\.\d+)?$/), dataLabel: z.literal(SYNTHETIC_TEST_ONLY) });
export const syntheticDemoConversionRate = { pointsPerKgCo2e: "4", dataLabel: SYNTHETIC_TEST_ONLY } as const;
export const missionCompletionSchema = z.object({ questRunId: opaqueIdSchema, questType: z.enum(["walk_instead_of_ride", "shuttle_journey"]), state: z.literal("completed"), completedAt: isoTimestampSchema });
const eventBase = { eventId: opaqueIdSchema, questRunId: opaqueIdSchema, occurredAt: isoTimestampSchema, idempotencyKey: opaqueIdSchema };
export const scoreEventSchema = z.discriminatedUnion("type", [
  z.object({ ...eventBase, type: z.literal("eco_xp_issued"), amount: z.number().int().positive(), mission: missionCompletionSchema }),
  z.object({ ...eventBase, type: z.literal("eco_xp_reversed"), reversalOfEventId: opaqueIdSchema, reason: z.string().trim().min(1) }),
  z.object({ ...eventBase, type: z.literal("green_points_issued"), amount: z.number().int().positive(), calculationId: opaqueIdSchema, evidenceTier: evidenceTierSchema, activityType: z.string().trim().min(1), avoidedKgCo2e: z.string().regex(/^\d+(?:\.\d+)?$/), carbonResultStatus: z.literal("calculated") }),
  z.object({ ...eventBase, type: z.literal("green_points_reversed"), reversalOfEventId: opaqueIdSchema, reason: z.string().trim().min(1) }),
]);
export type ScoreEvent = z.infer<typeof scoreEventSchema>;
export type AppendScoreEventResult = { status: "appended"; history: readonly ScoreEvent[] } | { status: "idempotent"; history: readonly ScoreEvent[] } | { status: "rejected"; reason: string };

function validateScoreHistory(history: readonly ScoreEvent[]): void {
  const eventIds = new Set<string>(); const idempotencyKeys = new Set<string>(); const reversed = new Set<string>(); let previousTimestamp = "";
  for (const raw of history) {
    const event = scoreEventSchema.parse(raw);
    if (eventIds.has(event.eventId) || idempotencyKeys.has(event.idempotencyKey)) throw new Error("Score events must be append-only and idempotent.");
    if (previousTimestamp !== "" && event.occurredAt < previousTimestamp) throw new Error("Score event timestamps must not move backwards.");
    if (event.type === "eco_xp_reversed" || event.type === "green_points_reversed") {
      const original = history.find((candidate) => candidate.eventId === event.reversalOfEventId);
      if (original === undefined || (original.type !== "eco_xp_issued" && original.type !== "green_points_issued")) throw new Error("A reversal must reference an issued event.");
      if (reversed.has(event.reversalOfEventId)) throw new Error("An issued score event can only be reversed once.");
      reversed.add(event.reversalOfEventId);
    }
    eventIds.add(event.eventId); idempotencyKeys.add(event.idempotencyKey); previousTimestamp = event.occurredAt;
  }
}

/** Adds one immutable score event; Green Points require a positive V1/V2 carbon result and never exercise alone. */
export function appendScoreEvent(history: readonly ScoreEvent[], rawEvent: unknown): AppendScoreEventResult {
  const event = scoreEventSchema.parse(rawEvent);
  if (event.type === "green_points_issued" && (event.activityType === "exercise" || !["V1", "V2"].includes(event.evidenceTier) || Number(event.avoidedKgCo2e) <= 0)) return { status: "rejected", reason: "Green Points require a positive evidence-backed carbon result and are never issued for exercise alone." };
  const existing = history.find((candidate) => candidate.idempotencyKey === event.idempotencyKey);
  if (existing !== undefined) return JSON.stringify(existing) === JSON.stringify(event) ? { status: "idempotent", history } : { status: "rejected", reason: "Idempotency key is already bound to another score event." };
  try { const next = [...history, event]; validateScoreHistory(next); return { status: "appended", history: next }; }
  catch (error) { return { status: "rejected", reason: error instanceof Error ? error.message : "Invalid score event." }; }
}

export function canIssueGreenPoints(result: CarbonCalculationResult, activityType: string): boolean { return result.status === "calculated" && activityType !== "exercise" && ["V1", "V2"].includes(result.evidenceTier) && Number(result.avoidedKgCo2e) > 0; }
export function deriveScoreBalances(history: readonly ScoreEvent[]): { ecoXp: number; greenPoints: number } {
  validateScoreHistory(history); const amountsById = new Map(history.flatMap((event) => event.type === "eco_xp_issued" || event.type === "green_points_issued" ? [[event.eventId, event.amount] as const] : []));
  return history.reduce((total, event) => { if (event.type === "eco_xp_issued") total.ecoXp += event.amount; if (event.type === "green_points_issued") total.greenPoints += event.amount; if (event.type === "eco_xp_reversed") total.ecoXp -= amountsById.get(event.reversalOfEventId) ?? 0; if (event.type === "green_points_reversed") total.greenPoints -= amountsById.get(event.reversalOfEventId) ?? 0; return total; }, { ecoXp: 0, greenPoints: 0 });
}
export const SYNTHETIC_LEVEL_XP_THRESHOLD = 100;
export function deriveLevel(lifetimeEcoXp: number): number { if (!Number.isInteger(lifetimeEcoXp) || lifetimeEcoXp < 0) throw new Error("Lifetime Eco XP must be a non-negative integer."); return 1 + Math.floor(lifetimeEcoXp / SYNTHETIC_LEVEL_XP_THRESHOLD); }
export const eligibleMissionDaySchema = z.object({ completedAt: isoTimestampSchema, eligible: z.boolean() });
export function deriveStreak(days: readonly z.infer<typeof eligibleMissionDaySchema>[]): number { const eligibleDates = [...new Set(days.filter((day) => day.eligible).map((day) => day.completedAt.slice(0, 10)))].sort(); if (eligibleDates.length === 0) return 0; let count = 1; for (let index = eligibleDates.length - 1; index > 0; index -= 1) { const current = new Date(`${eligibleDates[index]}T00:00:00.000Z`).valueOf(); const previous = new Date(`${eligibleDates[index - 1]}T00:00:00.000Z`).valueOf(); if (current - previous === 86_400_000) count += 1; else break; } return count; }
export const teamContributionSchema = z.object({ teamId: opaqueIdSchema, missionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), eligibleMissionCount: z.number().int().nonnegative() }).strict();
export function deriveTeamContribution(records: readonly z.infer<typeof teamContributionSchema>[]): { teamId: string; eligibleMissionCount: number }[] { const totals = new Map<string, number>(); for (const raw of records) { const record = teamContributionSchema.parse(raw); totals.set(record.teamId, (totals.get(record.teamId) ?? 0) + record.eligibleMissionCount); } return [...totals.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([teamId, eligibleMissionCount]) => ({ teamId, eligibleMissionCount })); }