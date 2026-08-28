import { z } from "zod";
import { isoTimestampSchema } from "@carbonloop/schemas";
import { factorLifecycleHistorySchema } from "./factor-lifecycle.js";
import { factorVersionSchema } from "./factor-version.js";

const requiredStringSchema = z.string().trim().min(1);
export const FACTOR_SELECTION_RULE_VERSION = "4B.0";

export const factorSelectionQuerySchema = z.object({
  category: requiredStringSchema,
  activityType: requiredStringSchema,
  quantityUnit: requiredStringSchema,
  activityOccurredAt: isoTimestampSchema,
  selectionPerformedAt: isoTimestampSchema,
  requestedGeography: z.object({
    campus: requiredStringSchema.optional(),
    city: requiredStringSchema.optional(),
    state: requiredStringSchema.optional(),
    country: requiredStringSchema,
  }),
  allowInternationalFallback: z.boolean(),
  allowSpendBasedFallback: z.boolean(),
});

export type FactorSelectionQuery = z.infer<typeof factorSelectionQuerySchema>;

export const factorGeographyLevelSchema = z.enum([
  "campus",
  "city",
  "state",
  "country",
  "international",
  "spend_based",
]);
export type FactorGeographyLevel = z.infer<typeof factorGeographyLevelSchema>;

export const factorSelectionCandidateSchema = z
  .object({
    factorVersion: factorVersionSchema,
    lifecycleHistory: factorLifecycleHistorySchema,
    geographyLevel: factorGeographyLevelSchema,
    geographyId: requiredStringSchema,
    activitySpecificity: z.enum(["activity_type", "broader_documented"]),
    sourceQualityPriority: z.number().int().nonnegative(),
  })
  .superRefine(({ factorVersion, geographyId, lifecycleHistory }, context) => {
    const firstEvent = lifecycleHistory[0];

    if (factorVersion.geography !== geographyId) {
      context.addIssue({
        code: "custom",
        path: ["geographyId"],
        message: "Candidate geographyId must match the immutable factor geography",
      });
    }

    if (firstEvent !== undefined && (firstEvent.factorId !== factorVersion.factorId || firstEvent.versionId !== factorVersion.versionId)) {
      context.addIssue({
        code: "custom",
        path: ["lifecycleHistory"],
        message: "Lifecycle history must belong to the immutable factor version",
      });
    }
  });

export type FactorSelectionCandidate = z.infer<typeof factorSelectionCandidateSchema>;

const selectionResultBaseSchema = z.object({
  selectionRuleVersion: z.literal(FACTOR_SELECTION_RULE_VERSION),
  selectionPerformedAt: isoTimestampSchema,
  selectionExplanation: requiredStringSchema,
});

export const factorSelectionResultSchema = z.discriminatedUnion("status", [
  selectionResultBaseSchema.extend({
    status: z.literal("selected"),
    factorSnapshot: factorVersionSchema,
    matchLevel: factorGeographyLevelSchema,
    fallbackStatus: z.enum(["not_used", "international", "spend_based"]),
  }),
  selectionResultBaseSchema.extend({
    status: z.literal("unsupported"),
  }),
  selectionResultBaseSchema.extend({
    status: z.literal("ambiguous"),
    conflictingFactorSnapshots: z.array(factorVersionSchema).min(2),
  }),
  selectionResultBaseSchema.extend({
    status: z.literal("invalid_candidates"),
    invalidCandidates: z.array(z.object({ index: z.number().int().nonnegative(), reason: requiredStringSchema })).min(1),
  }),
]);

export type FactorSelectionResult = z.infer<typeof factorSelectionResultSchema>;

type RankedCandidate = {
  candidate: FactorSelectionCandidate;
  geographyPriority: number;
  activityPriority: number;
  sourceQualityPriority: number;
  effectiveFromPriority: number;
};

const geographyPriority: Record<FactorGeographyLevel, number> = {
  campus: 6,
  city: 5,
  state: 4,
  country: 3,
  international: 2,
  spend_based: 1,
};

function isEligibleGeography(candidate: FactorSelectionCandidate, query: FactorSelectionQuery): boolean {
  switch (candidate.geographyLevel) {
    case "campus":
      return query.requestedGeography.campus === candidate.geographyId;
    case "city":
      return query.requestedGeography.city === candidate.geographyId;
    case "state":
      return query.requestedGeography.state === candidate.geographyId;
    case "country":
      return query.requestedGeography.country === candidate.geographyId;
    case "international":
      return query.allowInternationalFallback;
    case "spend_based":
      return query.allowSpendBasedFallback;
  }
}

function isWithinEffectiveDates(factor: FactorSelectionCandidate["factorVersion"], activityOccurredAt: string): boolean {
  const activityDate = new Date(activityOccurredAt).toISOString().slice(0, 10);
  return activityDate >= factor.effectiveFrom && (factor.effectiveTo === undefined || activityDate <= factor.effectiveTo);
}

function isUnitCompatible(factor: FactorSelectionCandidate["factorVersion"], quantityUnit: string): boolean {
  return factor.quantityUnit === quantityUnit && factor.factorUnit.endsWith(`/${quantityUnit}`);
}

function isSelectableAt(candidate: FactorSelectionCandidate, selectionPerformedAt: string): boolean {
  const selectionTime = Date.parse(selectionPerformedAt);
  const approval = candidate.lifecycleHistory.find((event) => event.type === "approved");
  const retirement = candidate.lifecycleHistory.find((event) => event.type === "retired");

  return approval !== undefined && Date.parse(approval.occurredAt) <= selectionTime
    && (retirement === undefined || Date.parse(retirement.occurredAt) > selectionTime);
}

function compareRank(left: RankedCandidate, right: RankedCandidate): number {
  return left.geographyPriority - right.geographyPriority
    || left.activityPriority - right.activityPriority
    || left.sourceQualityPriority - right.sourceQualityPriority
    || left.effectiveFromPriority - right.effectiveFromPriority;
}

function snapshotConflictKey(candidate: FactorSelectionCandidate): string {
  const factor = candidate.factorVersion;
  return [
    factor.decimalValue,
    factor.sourceTitle,
    factor.sourcePublisher,
    factor.sourceReference,
    factor.methodologyVersion,
  ].join("\u0000");
}

function fallbackStatus(level: FactorGeographyLevel): "not_used" | "international" | "spend_based" {
  return level === "international" ? "international" : level === "spend_based" ? "spend_based" : "not_used";
}

/**
 * Deterministically selects a currently eligible factor for a new calculation.
 * Reproducing historical calculations must use requireHistoricalFactorSnapshot instead.
 */
export function selectEmissionFactor(queryInput: unknown, candidates: readonly unknown[]): FactorSelectionResult {
  const query = factorSelectionQuerySchema.parse(queryInput);
  const invalidCandidates: Array<{ index: number; reason: string }> = [];
  const eligible: RankedCandidate[] = [];

  candidates.forEach((candidateInput, index) => {
    const candidateResult = factorSelectionCandidateSchema.safeParse(candidateInput);
    if (!candidateResult.success) {
      invalidCandidates.push({ index, reason: candidateResult.error.issues[0]?.message ?? "Invalid factor candidate" });
      return;
    }

    const candidate = candidateResult.data;
    const factor = candidate.factorVersion;
    const activityMatches = factor.category === query.category && factor.activityType === query.activityType;

    if (!activityMatches || !isUnitCompatible(factor, query.quantityUnit) || !isWithinEffectiveDates(factor, query.activityOccurredAt)
      || !isSelectableAt(candidate, query.selectionPerformedAt) || !isEligibleGeography(candidate, query)) {
      return;
    }

    eligible.push({
      candidate,
      geographyPriority: geographyPriority[candidate.geographyLevel],
      activityPriority: candidate.activitySpecificity === "activity_type" ? 1 : 0,
      sourceQualityPriority: candidate.sourceQualityPriority,
      effectiveFromPriority: Date.parse(`${factor.effectiveFrom}T00:00:00.000Z`),
    });
  });

  const resultBase = {
    selectionRuleVersion: FACTOR_SELECTION_RULE_VERSION,
    selectionPerformedAt: query.selectionPerformedAt,
  } as const;

  if (eligible.length === 0) {
    if (invalidCandidates.length > 0) {
      return factorSelectionResultSchema.parse({
        ...resultBase,
        status: "invalid_candidates",
        invalidCandidates,
        selectionExplanation: "No factor was selected because supplied candidates contain invalid lifecycle or identity history.",
      });
    }

    return factorSelectionResultSchema.parse({
      ...resultBase,
      status: "unsupported",
      selectionExplanation: "No approved, effective, unit-compatible factor matched the requested activity and permitted geography fallbacks.",
    });
  }

  const best = eligible.reduce((currentBest, candidate) => compareRank(candidate, currentBest) > 0 ? candidate : currentBest);
  const equallyRanked = eligible.filter((candidate) => compareRank(candidate, best) === 0);
  const conflictKeys = new Set(equallyRanked.map((candidate) => snapshotConflictKey(candidate.candidate)));

  if (equallyRanked.length > 1 && conflictKeys.size > 1) {
    return factorSelectionResultSchema.parse({
      ...resultBase,
      status: "ambiguous",
      conflictingFactorSnapshots: equallyRanked.map(({ candidate }) => candidate.factorVersion),
      selectionExplanation: "Equal-priority candidates disagree in value, source, or methodology and cannot be selected silently.",
    });
  }

  const selected = equallyRanked[0]?.candidate;
  if (selected === undefined) {
    throw new Error("Eligible factor selection unexpectedly produced no candidate");
  }

  return factorSelectionResultSchema.parse({
    ...resultBase,
    status: "selected",
    factorSnapshot: selected.factorVersion,
    matchLevel: selected.geographyLevel,
    fallbackStatus: fallbackStatus(selected.geographyLevel),
    selectionExplanation: `Selected the highest-ranked ${selected.geographyLevel} factor valid at the activity time and approved at selection time.`,
  });
}

/**
 * Validates and returns the immutable snapshot already stored by a historical calculation.
 * It deliberately accepts no registry candidates or current-selection query.
 */
export function requireHistoricalFactorSnapshot(snapshot: unknown): z.infer<typeof factorVersionSchema> {
  return factorVersionSchema.parse(snapshot);
}