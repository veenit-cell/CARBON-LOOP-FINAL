import { baselineSchema, evidenceTierSchema, truthLabelSchema } from "@carbonloop/schemas";
import type { Baseline } from "@carbonloop/schemas";
import { requireHistoricalFactorSnapshot } from "@carbonloop/factor-registry";
import type { FactorSelectionResult, FactorVersion } from "@carbonloop/factor-registry";

export const CALCULATION_ENGINE_VERSION = "1.0.0-synthetic";

type Decimal = { integer: bigint; scale: number };
type CalculationBase = {
  calculationId: string;
  activityType: string;
  baseline: unknown;
  actualQuantity: string;
  actualUnit: string;
  evidenceTier: unknown;
  truthLabels: unknown;
  calculatedAt: string;
  roundToDecimalPlaces?: number;
};

export type CarbonCalculationRequest = CalculationBase & {
  baselineFactorSelection: FactorSelectionResult;
  actualFactorSelection: FactorSelectionResult;
};

export type HistoricalCarbonCalculationRequest = CalculationBase & {
  baselineFactorSnapshot: unknown;
  actualFactorSnapshot: unknown;
};

export type CarbonCalculationResult =
  | {
    status: "calculated";
    calculationId: string;
    calculationEngineVersion: string;
    calculatedAt: string;
    rounding: string;
    baselineSnapshot: Readonly<Baseline>;
    baselineFactorSnapshot: Readonly<FactorVersion>;
    actualFactorSnapshot: Readonly<FactorVersion>;
    evidenceTier: "V1" | "V2" | "V3" | "V4";
    truthLabels: readonly ("seeded" | "simulated" | "projected" | "observed" | "verified")[];
    baselineKgCo2e: string;
    actualKgCo2e: string;
    avoidedKgCo2e: string;
  }
  | {
    status: "unsupported" | "ambiguous" | "no_eligible_baseline";
    calculationId: string;
    calculationEngineVersion: string;
    reason: string;
  };

function parseDecimal(value: string): Decimal {
  if (!/^\d+(?:\.\d+)?$/.test(value)) {
    throw new Error("Expected a non-negative decimal literal");
  }

  const [whole, fraction = ""] = value.split(".");
  return { integer: BigInt(`${whole}${fraction}`), scale: fraction.length };
}

function multiply(left: Decimal, right: Decimal): Decimal {
  return { integer: left.integer * right.integer, scale: left.scale + right.scale };
}

function subtractFloorAtZero(left: Decimal, right: Decimal): Decimal {
  const scale = Math.max(left.scale, right.scale);
  const leftInteger = left.integer * 10n ** BigInt(scale - left.scale);
  const rightInteger = right.integer * 10n ** BigInt(scale - right.scale);
  return { integer: leftInteger > rightInteger ? leftInteger - rightInteger : 0n, scale };
}

function formatRounded(decimal: Decimal, places: number): string {
  if (!Number.isInteger(places) || places < 0 || places > 12) {
    throw new Error("roundToDecimalPlaces must be an integer from 0 to 12");
  }

  const difference = decimal.scale - places;
  let integer = decimal.integer;

  if (difference > 0) {
    const divisor = 10n ** BigInt(difference);
    const remainder = integer % divisor;
    integer /= divisor;
    if (remainder * 2n >= divisor) {
      integer += 1n;
    }
  } else if (difference < 0) {
    integer *= 10n ** BigInt(-difference);
  }

  const value = integer.toString().padStart(places + 1, "0");
  return places === 0 ? value : `${value.slice(0, -places)}.${value.slice(-places)}`;
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object") {
    Object.freeze(value);
    for (const entry of Object.values(value as Record<string, unknown>)) {
      deepFreeze(entry);
    }
  }
  return value;
}

function selectedFactor(selection: FactorSelectionResult): FactorVersion | undefined {
  return selection.status === "selected" ? selection.factorSnapshot : undefined;
}

function selectionStatus(left: FactorSelectionResult, right: FactorSelectionResult): "unsupported" | "ambiguous" {
  return left.status === "ambiguous" || right.status === "ambiguous" ? "ambiguous" : "unsupported";
}

function parseCalculationBase(input: CalculationBase) {
  return {
    baseline: baselineSchema.parse(input.baseline),
    evidenceTier: evidenceTierSchema.parse(input.evidenceTier),
    truthLabels: [...new Set(truthLabelSchema.array().min(1).parse(input.truthLabels))].sort() as CarbonCalculationResult extends { truthLabels: infer Labels } ? Labels : never,
    roundTo: input.roundToDecimalPlaces ?? 6,
  };
}

function ineligibleWalkingBaseline(input: CalculationBase, baseline: Baseline): CarbonCalculationResult | undefined {
  if (["walking", "exercise"].includes(input.activityType) && !baseline.displacedMotorizedBaseline) {
    return {
      status: "no_eligible_baseline",
      calculationId: input.calculationId,
      calculationEngineVersion: CALCULATION_ENGINE_VERSION,
      reason: "Walking or exercise requires an explicit displaced motorized baseline before avoided CO2e can be claimed.",
    };
  }
}

function calculateWithSnapshots(
  input: CalculationBase,
  baseline: Baseline,
  evidenceTier: "V1" | "V2" | "V3" | "V4",
  truthLabels: CarbonCalculationResult extends { truthLabels: infer Labels } ? Labels : never,
  roundTo: number,
  baselineFactor: FactorVersion,
  actualFactor: FactorVersion,
): CarbonCalculationResult {
  if (baseline.unit !== baselineFactor.quantityUnit || input.actualUnit !== actualFactor.quantityUnit) {
    throw new Error("Calculation quantities must use the selected factor quantity units exactly.");
  }

  const baselineKg = multiply(parseDecimal(baseline.quantity), parseDecimal(baselineFactor.decimalValue));
  const actualKg = multiply(parseDecimal(input.actualQuantity), parseDecimal(actualFactor.decimalValue));
  const avoidedKg = subtractFloorAtZero(baselineKg, actualKg);

  return {
    status: "calculated",
    calculationId: input.calculationId,
    calculationEngineVersion: CALCULATION_ENGINE_VERSION,
    calculatedAt: input.calculatedAt,
    rounding: `HALF_UP to ${roundTo} decimal places`,
    baselineSnapshot: deepFreeze(structuredClone(baseline)),
    baselineFactorSnapshot: deepFreeze(structuredClone(baselineFactor)),
    actualFactorSnapshot: deepFreeze(structuredClone(actualFactor)),
    evidenceTier,
    truthLabels,
    baselineKgCo2e: formatRounded(baselineKg, roundTo),
    actualKgCo2e: formatRounded(actualKg, roundTo),
    avoidedKgCo2e: formatRounded(avoidedKg, roundTo),
  };
}

/** Calculates a new result from approved factor-selection snapshots only. */
export function calculateCarbon(input: CarbonCalculationRequest): CarbonCalculationResult {
  const { baseline, evidenceTier, truthLabels, roundTo } = parseCalculationBase(input);
  const baselineEligibility = ineligibleWalkingBaseline(input, baseline);
  if (baselineEligibility !== undefined) {
    return baselineEligibility;
  }

  const baselineFactor = selectedFactor(input.baselineFactorSelection);
  const actualFactor = selectedFactor(input.actualFactorSelection);
  if (baselineFactor === undefined || actualFactor === undefined) {
    return {
      status: selectionStatus(input.baselineFactorSelection, input.actualFactorSelection),
      calculationId: input.calculationId,
      calculationEngineVersion: CALCULATION_ENGINE_VERSION,
      reason: "No single approved factor snapshot is available; the engine will not substitute a factor.",
    };
  }

  return calculateWithSnapshots(input, baseline, evidenceTier, truthLabels, roundTo, baselineFactor, actualFactor);
}

/** Reproduces a result from stored immutable snapshots without registry selection. */
export function reproduceHistoricalCalculation(input: HistoricalCarbonCalculationRequest): CarbonCalculationResult {
  const { baseline, evidenceTier, truthLabels, roundTo } = parseCalculationBase(input);
  const baselineEligibility = ineligibleWalkingBaseline(input, baseline);
  if (baselineEligibility !== undefined) {
    return baselineEligibility;
  }

  return calculateWithSnapshots(
    input,
    baseline,
    evidenceTier,
    truthLabels,
    roundTo,
    requireHistoricalFactorSnapshot(input.baselineFactorSnapshot),
    requireHistoricalFactorSnapshot(input.actualFactorSnapshot),
  );
}