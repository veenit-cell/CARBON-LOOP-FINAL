import { isoTimestampSchema, opaqueIdSchema } from "@carbonloop/schemas";
import { z } from "zod";

export const MOCK_DEMO_ONLY = "MOCK_DEMO_ONLY" as const;
export const greenPointsClassificationSchema = z.literal("non_cash_loyalty_points");
export const mockCanteenRewardSchema = z.object({
  rewardItemId: opaqueIdSchema,
  title: z.literal("SYNTHETIC_TEST_ONLY Mock Canteen Reward"),
  greenPointsCost: z.number().int().positive(),
  catalogueLabel: z.literal(MOCK_DEMO_ONLY),
  fulfilmentLabel: z.literal(MOCK_DEMO_ONLY),
  classification: greenPointsClassificationSchema,
});
export type MockCanteenReward = z.infer<typeof mockCanteenRewardSchema>;

export const redemptionStateSchema = z.enum(["available", "reserved", "redeemed", "cancelled", "failed"]);
export type RedemptionState = z.infer<typeof redemptionStateSchema>;
export const redemptionEventSchema = z.object({
  eventId: opaqueIdSchema,
  redemptionId: opaqueIdSchema,
  rewardItemId: opaqueIdSchema,
  from: redemptionStateSchema,
  to: redemptionStateSchema,
  occurredAt: isoTimestampSchema,
  idempotencyKey: opaqueIdSchema,
  fulfilmentLabel: z.literal(MOCK_DEMO_ONLY),
});
export type RedemptionEvent = z.infer<typeof redemptionEventSchema>;

const transitions: Readonly<Record<RedemptionState, readonly RedemptionState[]>> = {
  available: ["reserved", "failed"], reserved: ["redeemed", "cancelled", "failed"], redeemed: [], cancelled: [], failed: [],
};

export function deriveRedemptionState(history: readonly RedemptionEvent[]): RedemptionState {
  if (history.length === 0) return "available";
  let state: RedemptionState = "available";
  const first = redemptionEventSchema.parse(history[0]);
  const redemptionId = first.redemptionId;
  const rewardItemId = first.rewardItemId;
  let last = "";
  const keys = new Set<string>();
  for (const raw of history) {
    const event = redemptionEventSchema.parse(raw);
    if (event.redemptionId !== redemptionId || event.rewardItemId !== rewardItemId) throw new Error("Redemption history must retain one reward and redemption ID.");
    if (event.from !== state || !transitions[event.from].includes(event.to)) throw new Error("Invalid redemption-state transition.");
    if (last !== "" && event.occurredAt < last) throw new Error("Redemption timestamps must not move backwards.");
    if (keys.has(event.idempotencyKey)) throw new Error("Redemption requests must be idempotent.");
    state = event.to; last = event.occurredAt; keys.add(event.idempotencyKey);
  }
  return state;
}

export type AppendRedemptionResult =
  | { status: "appended"; history: readonly RedemptionEvent[]; state: RedemptionState }
  | { status: "idempotent"; history: readonly RedemptionEvent[]; state: RedemptionState }
  | { status: "rejected"; reason: string };

/** Mock-only redemption lifecycle; it never processes a payment, cash value, or offset. */
export function appendRedemptionEvent(history: readonly RedemptionEvent[], rawEvent: unknown): AppendRedemptionResult {
  const event = redemptionEventSchema.parse(rawEvent);
  const existing = history.find((candidate) => candidate.idempotencyKey === event.idempotencyKey);
  if (existing !== undefined) return JSON.stringify(existing) === JSON.stringify(event)
    ? { status: "idempotent", history, state: deriveRedemptionState(history) }
    : { status: "rejected", reason: "Idempotency key is already bound to another redemption event." };
  try { const next = [...history, event]; return { status: "appended", history: next, state: deriveRedemptionState(next) }; }
  catch (error) { return { status: "rejected", reason: error instanceof Error ? error.message : "Invalid redemption event." }; }
}

export const seededMockCanteenReward: MockCanteenReward = {
  rewardItemId: "SYNTHETIC_TEST_ONLY_canteen_reward",
  title: "SYNTHETIC_TEST_ONLY Mock Canteen Reward",
  greenPointsCost: 10,
  catalogueLabel: MOCK_DEMO_ONLY,
  fulfilmentLabel: MOCK_DEMO_ONLY,
  classification: "non_cash_loyalty_points",
};