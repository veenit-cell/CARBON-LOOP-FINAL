import { describe, expect, it } from "vitest";
import { apiErrorSchema, carbonResultSchema, evidenceTierSchema, greenRewardPointsSchema, institutionalAggregateSchema, isoTimestampSchema, questTransitionSchema } from "../src/index.js";

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
});
