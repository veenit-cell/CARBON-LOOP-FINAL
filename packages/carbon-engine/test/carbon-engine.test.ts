import { describe, expect, it } from "vitest";
import {
  calculateCarbon,
  reproduceHistoricalCalculation,
} from "../src/index.js";
import type {
  CarbonCalculationRequest,
  CarbonCalculationResult,
  HistoricalCarbonCalculationRequest,
} from "../src/index.js";
import type { FactorSelectionResult, FactorVersion } from "@carbonloop/factor-registry";
import type { Baseline } from "@carbonloop/schemas";

const SYNTHETIC_TEST_ONLY_TIMESTAMP = "2026-08-28T00:00:00.000Z";
const SYNTHETIC_TEST_ONLY_FACTOR_ZERO = "0";
const SYNTHETIC_TEST_ONLY_FACTOR_ONE_TENTH = "0.1";
const SYNTHETIC_TEST_ONLY_FACTOR_TWO_TENTHS = "0.2";
const SYNTHETIC_TEST_ONLY_FACTOR_THREE_TENTHS = "0.3";
const SYNTHETIC_TEST_ONLY_FACTOR_FOUR_TENTHS = "0.4";

function factor(value: string, unit = "SYNTHETIC_TEST_ONLY_km", id = "SYNTHETIC_TEST_ONLY_factor"): FactorVersion {
  return {
    factorId: id,
    versionId: `${id}_SYNTHETIC_TEST_ONLY_version`,
    category: "SYNTHETIC_TEST_ONLY",
    activityType: "SYNTHETIC_TEST_ONLY",
    quantityUnit: unit,
    factorUnit: `SYNTHETIC_TEST_ONLY_kg/${unit}`,
    decimalValue: value,
    dataLabel: "SYNTHETIC_TEST_ONLY",
    sourceTitle: "SYNTHETIC_TEST_ONLY",
    sourcePublisher: "SYNTHETIC_TEST_ONLY",
    sourceReference: "SYNTHETIC_TEST_ONLY",
    geography: "SYNTHETIC_TEST_ONLY",
    methodologyVersion: "SYNTHETIC_TEST_ONLY",
    effectiveFrom: "2026-01-01",
    qualityLabel: "SYNTHETIC_TEST_ONLY",
    uncertainty: "SYNTHETIC_TEST_ONLY",
    createdAt: SYNTHETIC_TEST_ONLY_TIMESTAMP,
  };
}

function selected(value: string, unit = "SYNTHETIC_TEST_ONLY_km", id?: string): FactorSelectionResult {
  return {
    status: "selected",
    selectionRuleVersion: "4B.0",
    selectionPerformedAt: SYNTHETIC_TEST_ONLY_TIMESTAMP,
    selectionExplanation: "SYNTHETIC_TEST_ONLY",
    factorSnapshot: factor(value, unit, id),
    matchLevel: "campus",
    fallbackStatus: "not_used",
  };
}

const unsupported: FactorSelectionResult = {
  status: "unsupported",
  selectionRuleVersion: "4B.0",
  selectionPerformedAt: SYNTHETIC_TEST_ONLY_TIMESTAMP,
  selectionExplanation: "SYNTHETIC_TEST_ONLY",
};

const ambiguous: FactorSelectionResult = {
  status: "ambiguous",
  selectionRuleVersion: "4B.0",
  selectionPerformedAt: SYNTHETIC_TEST_ONLY_TIMESTAMP,
  selectionExplanation: "SYNTHETIC_TEST_ONLY",
  conflictingFactorSnapshots: [
    factor(SYNTHETIC_TEST_ONLY_FACTOR_ONE_TENTH, "SYNTHETIC_TEST_ONLY_km", "SYNTHETIC_TEST_ONLY_ambiguous_one"),
    factor(SYNTHETIC_TEST_ONLY_FACTOR_TWO_TENTHS, "SYNTHETIC_TEST_ONLY_km", "SYNTHETIC_TEST_ONLY_ambiguous_two"),
  ],
};

function baseline(
  quantity: string,
  unit = "SYNTHETIC_TEST_ONLY_km",
  displacedMotorizedBaseline = true,
  kind: Baseline["kind"] = "seeded_demonstration",
): Baseline {
  return {
    baselineId: "SYNTHETIC_TEST_ONLY_baseline",
    kind,
    quantity,
    unit,
    dataLabel: "SYNTHETIC_TEST_ONLY",
    declaredAt: SYNTHETIC_TEST_ONLY_TIMESTAMP,
    displacedMotorizedBaseline,
    truthLabels: kind === "projected_scenario" ? ["projected"] : kind === "seeded_demonstration" ? ["seeded"] : ["observed"],
  };
}

function request(overrides: Partial<CarbonCalculationRequest> = {}): CarbonCalculationRequest {
  return {
    calculationId: "SYNTHETIC_TEST_ONLY_calculation",
    activityType: "walking",
    baseline: baseline("2"),
    actualQuantity: "2",
    actualUnit: "SYNTHETIC_TEST_ONLY_km",
    baselineFactorSelection: selected(SYNTHETIC_TEST_ONLY_FACTOR_TWO_TENTHS),
    actualFactorSelection: selected(SYNTHETIC_TEST_ONLY_FACTOR_ZERO),
    evidenceTier: "V2",
    truthLabels: ["seeded"],
    calculatedAt: SYNTHETIC_TEST_ONLY_TIMESTAMP,
    ...overrides,
  };
}

function expectCalculated(result: CarbonCalculationResult) {
  expect(result.status).toBe("calculated");
  if (result.status !== "calculated") {
    throw new Error(`Expected calculated result, received ${result.status}`);
  }
  return result;
}

describe("synthetic hackathon carbon fixtures", () => {
  it("calculates walk instead of motorbike with a displaced motorized baseline", () => {
    expect(expectCalculated(calculateCarbon(request())).avoidedKgCo2e).toBe("0.400000");
  });

  it("calculates a verified shuttle result", () => {
    const result = calculateCarbon(request({
      activityType: "shuttle",
      evidenceTier: "V1",
      baselineFactorSelection: selected(SYNTHETIC_TEST_ONLY_FACTOR_THREE_TENTHS),
      actualFactorSelection: selected(SYNTHETIC_TEST_ONLY_FACTOR_ONE_TENTH),
    }));
    expect(expectCalculated(result).avoidedKgCo2e).toBe("0.400000");
  });

  it("calculates an electricity reduction", () => {
    const result = calculateCarbon(request({
      activityType: "electricity",
      baseline: baseline("10", "SYNTHETIC_TEST_ONLY_kWh"),
      actualQuantity: "8",
      actualUnit: "SYNTHETIC_TEST_ONLY_kWh",
      baselineFactorSelection: selected(SYNTHETIC_TEST_ONLY_FACTOR_FOUR_TENTHS, "SYNTHETIC_TEST_ONLY_kWh"),
      actualFactorSelection: selected(SYNTHETIC_TEST_ONLY_FACTOR_FOUR_TENTHS, "SYNTHETIC_TEST_ONLY_kWh"),
    }));
    expect(expectCalculated(result).avoidedKgCo2e).toBe("0.800000");
  });

  it("returns unsupported when no factor exists", () => {
    expect(calculateCarbon(request({ baselineFactorSelection: unsupported, actualFactorSelection: unsupported })).status).toBe("unsupported");
  });

  it("rejects walking without an eligible displaced motorized baseline", () => {
    expect(calculateCarbon(request({ baseline: baseline("2", "SYNTHETIC_TEST_ONLY_km", false) })).status).toBe("no_eligible_baseline");
  });

  it("does not substitute a retired factor rejected by selection", () => {
    expect(calculateCarbon(request({ baselineFactorSelection: unsupported })).status).toBe("unsupported");
  });

  it("returns ambiguous when factor selection is ambiguous", () => {
    expect(calculateCarbon(request({ baselineFactorSelection: ambiguous })).status).toBe("ambiguous");
  });

  it("floors negative avoided emissions at zero", () => {
    expect(expectCalculated(calculateCarbon(request({ actualFactorSelection: selected(SYNTHETIC_TEST_ONLY_FACTOR_THREE_TENTHS) }))).avoidedKgCo2e).toBe("0.000000");
  });

  it("reproduces history from immutable snapshots without selection results", () => {
    const historical: HistoricalCarbonCalculationRequest = {
      calculationId: "SYNTHETIC_TEST_ONLY_historical_calculation",
      activityType: "walking",
      baseline: baseline("2"),
      actualQuantity: "2",
      actualUnit: "SYNTHETIC_TEST_ONLY_km",
      baselineFactorSnapshot: factor(SYNTHETIC_TEST_ONLY_FACTOR_TWO_TENTHS),
      actualFactorSnapshot: factor(SYNTHETIC_TEST_ONLY_FACTOR_ZERO),
      evidenceTier: "V2",
      truthLabels: ["seeded"],
      calculatedAt: SYNTHETIC_TEST_ONLY_TIMESTAMP,
    };
    expect(expectCalculated(reproduceHistoricalCalculation(historical)).avoidedKgCo2e).toBe("0.400000");
  });
});