import { describe, expect, it } from "vitest";
import { apiErrorSchema, baselineSchema, carbonResultSchema, evidenceTierSchema, greenRewardPointsSchema, institutionalAggregateSchema, isoTimestampSchema, questTransitionSchema } from "../src/index.js";

const id = "item_1";
const time = "2026-08-28T00:00:00Z";

describe("contract validation", () => {
  it("rejects malformed timestamps", () => expect(isoTimestampSchema.safeParse("not-a-date").success).toBe(false));
  it("rejects invalid evidence tiers", () => expect(evidenceTierSchema.safeParse("V5").success).toBe(false));
  it("rejects verified carbon results without factor provenance", () => expect(carbonResultSchema.safeParse({ calculationId: id, verificationStatus: "verified", baseline: { quantity: 1, unit: "km", baselineType: "mode" }, actual: { quantity: 0, unit: "km" }, avoidedKgCo2e: 1, qualityLabel: "high", calculationEngineVersion: "v1" }).success).toBe(false));
  it("rejects Green Points without eligible evidence", () => expect(greenRewardPointsSchema.safeParse({ amount: 1, calculationId: id }).success).toBe(false));
  it("rejects invalid quest transitions", () => expect(questTransitionSchema.safeParse({ from: "draft", to: "submitted", occurredAt: time }).success).toBe(false));
  it("rejects aggregates without truth labels", () => expect(institutionalAggregateSchema.safeParse({ campusId: id, metricPeriodStart: time, metricPeriodEnd: time, privacyThresholdApplied: true, truthLabels: [], evidenceQuality: { V1: 0 }, metrics: {} }).success).toBe(false));
  it("rejects API errors without request IDs", () => expect(apiErrorSchema.safeParse({ code: "bad", message: "bad" }).success).toBe(false));
  it("accepts the four supported synthetic baseline kinds", () => {
    const kinds = ["personal_declared", "institutional_measured", "seeded_demonstration", "projected_scenario"] as const;
    for (const kind of kinds) {
      const truthLabels = kind === "seeded_demonstration" ? ["seeded"] : kind === "projected_scenario" ? ["projected"] : ["observed"];
      expect(baselineSchema.safeParse({ baselineId: `${kind}_synthetic`, kind, quantity: "1", unit: "SYNTHETIC_TEST_ONLY", dataLabel: "SYNTHETIC_TEST_ONLY", declaredAt: time, displacedMotorizedBaseline: false, truthLabels }).success).toBe(true);
    }
  });
  it("rejects seeded baselines without the seeded truth label", () => expect(baselineSchema.safeParse({ baselineId: "seeded_synthetic", kind: "seeded_demonstration", quantity: "1", unit: "SYNTHETIC_TEST_ONLY", dataLabel: "SYNTHETIC_TEST_ONLY", declaredAt: time, displacedMotorizedBaseline: false, truthLabels: ["observed"] }).success).toBe(false));
});