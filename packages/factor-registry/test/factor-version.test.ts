import { describe, expect, it } from "vitest";
import { factorVersionSchema } from "../src/index.js";

const SYNTHETIC_TEST_ONLY_DECIMAL_VALUE = "0.123";
const syntheticFactor = {
  factorId: "synthetic_factor",
  versionId: "synthetic_v1",
  category: "SYNTHETIC_TEST_ONLY",
  activityType: "SYNTHETIC_TEST_ONLY",
  quantityUnit: "SYNTHETIC_TEST_ONLY",
  factorUnit: "SYNTHETIC_TEST_ONLY",
  decimalValue: SYNTHETIC_TEST_ONLY_DECIMAL_VALUE,
  sourceTitle: "SYNTHETIC_TEST_ONLY",
  sourcePublisher: "SYNTHETIC_TEST_ONLY",
  sourceReference: "SYNTHETIC_TEST_ONLY",
  geography: "SYNTHETIC_TEST_ONLY",
  methodologyVersion: "SYNTHETIC_TEST_ONLY",
  effectiveFrom: "2026-01-01",
  qualityLabel: "SYNTHETIC_TEST_ONLY",
  uncertainty: "SYNTHETIC_TEST_ONLY",
  createdAt: "2026-01-01T00:00:00.000Z",
} as const;

describe("factorVersionSchema", () => {
  it("accepts a valid synthetic factor", () => {
    expect(factorVersionSchema.safeParse(syntheticFactor).success).toBe(true);
  });

  it("rejects a factor with a missing source", () => {
    expect(factorVersionSchema.safeParse({ ...syntheticFactor, sourceTitle: "" }).success).toBe(false);
  });

  it("rejects a negative decimal value", () => {
    expect(factorVersionSchema.safeParse({ ...syntheticFactor, decimalValue: "-0.123" }).success).toBe(false);
  });

  it("rejects a malformed decimal value", () => {
    expect(factorVersionSchema.safeParse({ ...syntheticFactor, decimalValue: "not-a-decimal" }).success).toBe(false);
  });

  it("rejects an effective-date range that ends before it begins", () => {
    expect(
      factorVersionSchema.safeParse({ ...syntheticFactor, effectiveTo: "2025-12-31" }).success,
    ).toBe(false);
  });
});
