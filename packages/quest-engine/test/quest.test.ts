import { describe, expect, it } from "vitest";
import { SIMULATED_DEMO_ONLY, appendQuestTransition, deriveQuestState, simulateWalkingActivity } from "../src/index.js";

const base = { questRunId: "SYNTHETIC_TEST_ONLY_run", questType: "walk_instead_of_ride" as const };
const active = { eventId: "SYNTHETIC_TEST_ONLY_event_active", ...base, from: "available" as const, to: "active" as const, occurredAt: "2026-08-28T09:00:00.000Z", idempotencyKey: "SYNTHETIC_TEST_ONLY_key_active" };
const complete = { eventId: "SYNTHETIC_TEST_ONLY_event_complete", ...base, from: "active" as const, to: "completed" as const, occurredAt: "2026-08-28T09:10:00.000Z", idempotencyKey: "SYNTHETIC_TEST_ONLY_key_complete" };

describe("quest engine", () => {
  it("allows available, active, paused, completed transitions", () => {
    const paused = { ...active, eventId: "SYNTHETIC_TEST_ONLY_event_paused", from: "active" as const, to: "paused" as const, occurredAt: "2026-08-28T09:05:00.000Z", idempotencyKey: "SYNTHETIC_TEST_ONLY_key_paused" };
    const resumed = { ...active, eventId: "SYNTHETIC_TEST_ONLY_event_resumed", from: "paused" as const, to: "active" as const, occurredAt: "2026-08-28T09:06:00.000Z", idempotencyKey: "SYNTHETIC_TEST_ONLY_key_resumed" };
    expect(deriveQuestState([active, paused, resumed, complete])).toBe("completed");
  });

  it("rejects invalid and terminal transitions", () => {
    expect(() => deriveQuestState([{ ...active, from: "paused" }])).toThrow("Invalid quest-state transition");
    expect(() => deriveQuestState([active, complete, { ...complete, eventId: "SYNTHETIC_TEST_ONLY_after", from: "completed", to: "active", occurredAt: "2026-08-28T09:11:00.000Z", idempotencyKey: "SYNTHETIC_TEST_ONLY_after_key" }])).toThrow("Invalid quest-state transition");
  });

  it("protects duplicate completion through idempotency", () => {
    const first = appendQuestTransition([active], complete);
    expect(first.status).toBe("appended");
    const duplicate = appendQuestTransition(first.status === "appended" ? first.history : [], complete);
    expect(duplicate.status).toBe("idempotent");
  });

  it("returns a clearly labelled deterministic simulated walking record", () => {
    const result = simulateWalkingActivity({ questRunId: base.questRunId, occurredAt: "2026-08-28T09:00:00.000Z", distanceKm: "SYNTHETIC_TEST_ONLY".replace("SYNTHETIC_TEST_ONLY", "1.25") });
    expect(result).toEqual({ questRunId: base.questRunId, occurredAt: "2026-08-28T09:00:00.000Z", distanceKm: "1.25", adapterLabel: SIMULATED_DEMO_ONLY, activityType: "walking", quantityUnit: "km" });
  });
});