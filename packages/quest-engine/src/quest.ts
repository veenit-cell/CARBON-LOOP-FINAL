import { gameActivityTypeSchema, gameQuestTypeSchema, isoTimestampSchema, opaqueIdSchema } from "@carbonloop/schemas";
import { z } from "zod";

export const questTypeSchema = gameQuestTypeSchema;
export const questStateSchema = z.enum(["available", "active", "paused", "completed", "rejected"]);

export const questTransitionEventSchema = z.object({
  eventId: opaqueIdSchema,
  questRunId: opaqueIdSchema,
  questType: questTypeSchema,
  from: questStateSchema,
  to: questStateSchema,
  occurredAt: isoTimestampSchema,
  idempotencyKey: opaqueIdSchema,
});

export type QuestTransitionEvent = z.infer<typeof questTransitionEventSchema>;
export type QuestState = z.infer<typeof questStateSchema>;

const validTransitions: Readonly<Record<QuestState, readonly QuestState[]>> = {
  available: ["active", "rejected"],
  active: ["paused", "completed", "rejected"],
  paused: ["active", "rejected"],
  completed: [],
  rejected: [],
};

export function canTransitionQuest(from: QuestState, to: QuestState): boolean {
  return validTransitions[from].includes(to);
}

export function deriveQuestState(history: readonly QuestTransitionEvent[]): QuestState {
  if (history.length === 0) return "available";
  const first = questTransitionEventSchema.parse(history[0]);
  let state: QuestState = "available";
  let questRunId = first.questRunId;
  let questType = first.questType;
  let previousTimestamp = "";
  const idempotencyKeys = new Set<string>();

  for (const rawEvent of history) {
    const event = questTransitionEventSchema.parse(rawEvent);
    if (event.questRunId !== questRunId || event.questType !== questType) {
      throw new Error("Quest history must use one quest run and quest type.");
    }
    if (event.from !== state || !canTransitionQuest(event.from, event.to)) {
      throw new Error("Invalid quest-state transition.");
    }
    if (previousTimestamp !== "" && event.occurredAt < previousTimestamp) {
      throw new Error("Quest event timestamps must not move backwards.");
    }
    if (idempotencyKeys.has(event.idempotencyKey)) {
      throw new Error("Quest transitions must be idempotent; duplicate event key rejected.");
    }
    idempotencyKeys.add(event.idempotencyKey);
    state = event.to;
    previousTimestamp = event.occurredAt;
  }

  return state;
}

export type AppendQuestTransitionResult =
  | { status: "appended"; history: readonly QuestTransitionEvent[]; state: QuestState }
  | { status: "idempotent"; history: readonly QuestTransitionEvent[]; state: QuestState }
  | { status: "rejected"; reason: string };

/** Appends a transition once; a repeated idempotency key is a no-op. */
export function appendQuestTransition(
  history: readonly QuestTransitionEvent[],
  rawEvent: unknown,
): AppendQuestTransitionResult {
  const event = questTransitionEventSchema.parse(rawEvent);
  const existing = history.find((candidate) => candidate.idempotencyKey === event.idempotencyKey);
  if (existing !== undefined) {
    if (JSON.stringify(existing) === JSON.stringify(event)) {
      return { status: "idempotent", history, state: deriveQuestState(history) };
    }
    return { status: "rejected", reason: "Idempotency key is already bound to another quest event." };
  }
  try {
    const nextHistory = [...history, event];
    return { status: "appended", history: nextHistory, state: deriveQuestState(nextHistory) };
  } catch (error) {
    return { status: "rejected", reason: error instanceof Error ? error.message : "Invalid quest transition." };
  }
}

export const SIMULATED_DEMO_ONLY = "SIMULATED_DEMO_ONLY" as const;
export const simulatedWalkingInputSchema = z.object({
  questRunId: opaqueIdSchema,
  occurredAt: isoTimestampSchema,
  distanceKm: z.string().regex(/^\d+(?:\.\d+)?$/),
});
export const simulatedWalkingActivitySchema = simulatedWalkingInputSchema.extend({
  adapterLabel: z.literal(SIMULATED_DEMO_ONLY),
  activityType: z.literal("walking"),
  quantityUnit: z.literal("km"),
});
export type SimulatedWalkingActivity = z.infer<typeof simulatedWalkingActivitySchema>;

/** Deterministic demo-only adapter: it never reads sensors, permissions, or location. */
export function simulateWalkingActivity(input: unknown): SimulatedWalkingActivity {
  const activity = simulatedWalkingInputSchema.parse(input);
  return { ...activity, adapterLabel: SIMULATED_DEMO_ONLY, activityType: "walking", quantityUnit: "km" };
}

export const simulatedActivityInputSchema = simulatedWalkingInputSchema.extend({
  activityType: gameActivityTypeSchema,
  /** `consumption` missions record no distance, so they carry no quantity unit. */
  distanceKm: z.string().regex(/^\d+(?:\.\d+)?$/).optional(),
});
export const simulatedActivitySchema = simulatedActivityInputSchema.extend({
  adapterLabel: z.literal(SIMULATED_DEMO_ONLY),
  quantityUnit: z.enum(["km", "meal"]),
});
export type SimulatedActivity = z.infer<typeof simulatedActivitySchema>;

/**
 * Deterministic demo-only adapter for every playable activity type. It never reads
 * sensors, permissions, or location; the caller supplies the simulated quantity.
 */
export function simulateActivity(input: unknown): SimulatedActivity {
  const activity = simulatedActivityInputSchema.parse(input);
  const distanceBased = activity.activityType !== "consumption";
  if (distanceBased && activity.distanceKm === undefined) {
    throw new Error("Distance-based activities require a simulated distanceKm.");
  }
  return { ...activity, adapterLabel: SIMULATED_DEMO_ONLY, quantityUnit: distanceBased ? "km" : "meal" };
}