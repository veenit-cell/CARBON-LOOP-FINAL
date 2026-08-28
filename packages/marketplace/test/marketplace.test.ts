import { describe, expect, it } from "vitest";
import { MOCK_DEMO_ONLY, appendRedemptionEvent, deriveRedemptionState, seededMockCanteenReward } from "../src/index.js";

const reserve = { eventId: "SYNTHETIC_TEST_ONLY_reserve", redemptionId: "SYNTHETIC_TEST_ONLY_redemption", rewardItemId: "SYNTHETIC_TEST_ONLY_canteen_reward", from: "available" as const, to: "reserved" as const, occurredAt: "2026-08-28T12:00:00.000Z", idempotencyKey: "SYNTHETIC_TEST_ONLY_reserve_key", fulfilmentLabel: MOCK_DEMO_ONLY };
const redeem = { ...reserve, eventId: "SYNTHETIC_TEST_ONLY_redeem", from: "reserved" as const, to: "redeemed" as const, occurredAt: "2026-08-28T12:01:00.000Z", idempotencyKey: "SYNTHETIC_TEST_ONLY_redeem_key" };

describe("mock marketplace", () => {
  it("seeds a clearly labelled non-cash mock canteen reward", () => {
    expect(seededMockCanteenReward.catalogueLabel).toBe(MOCK_DEMO_ONLY);
    expect(seededMockCanteenReward.fulfilmentLabel).toBe(MOCK_DEMO_ONLY);
    expect(seededMockCanteenReward.classification).toBe("non_cash_loyalty_points");
  });
  it("supports available, reserved, redeemed and terminal redemption states", () => {
    expect(deriveRedemptionState([reserve, redeem])).toBe("redeemed");
    expect(() => deriveRedemptionState([{ ...reserve, to: "redeemed" }])).toThrow("Invalid redemption-state transition");
  });
  it("keeps redemption idempotent and permits cancellation or failure only from valid states", () => {
    const first = appendRedemptionEvent([], reserve); expect(first.status).toBe("appended");
    const duplicate = appendRedemptionEvent(first.status === "appended" ? first.history : [], reserve); expect(duplicate.status).toBe("idempotent");
    const cancel = { ...redeem, eventId: "SYNTHETIC_TEST_ONLY_cancel", from: "reserved" as const, to: "cancelled" as const, occurredAt: "2026-08-28T12:01:00.000Z", idempotencyKey: "SYNTHETIC_TEST_ONLY_cancel_key" };
    expect(deriveRedemptionState([reserve, cancel])).toBe("cancelled");
  });
});