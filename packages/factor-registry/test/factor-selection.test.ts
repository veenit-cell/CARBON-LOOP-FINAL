import { describe, expect, it } from "vitest";
import {
  requireHistoricalFactorSnapshot,
  selectEmissionFactor,
} from "../src/index.js";

const SYNTHETIC_TEST_ONLY_DECIMAL_VALUE = "0.123";
const SYNTHETIC_TEST_ONLY_CONFLICTING_DECIMAL_VALUE = "0.456";
const SYNTHETIC_TEST_ONLY_CATEGORY = "SYNTHETIC_TEST_ONLY_CATEGORY";
const SYNTHETIC_TEST_ONLY_ACTIVITY = "SYNTHETIC_TEST_ONLY_ACTIVITY";
const SYNTHETIC_TEST_ONLY_UNIT = "SYNTHETIC_TEST_ONLY_UNIT";
const SYNTHETIC_TEST_ONLY_COUNTRY = "SYNTHETIC_TEST_ONLY_COUNTRY";

const query = {
  category: SYNTHETIC_TEST_ONLY_CATEGORY,
  activityType: SYNTHETIC_TEST_ONLY_ACTIVITY,
  quantityUnit: SYNTHETIC_TEST_ONLY_UNIT,
  activityOccurredAt: "2026-06-01T00:00:00.000Z",
  selectionPerformedAt: "2026-06-10T00:00:00.000Z",
  requestedGeography: {
    campus: "SYNTHETIC_TEST_ONLY_CAMPUS",
    city: "SYNTHETIC_TEST_ONLY_CITY",
    state: "SYNTHETIC_TEST_ONLY_STATE",
    country: SYNTHETIC_TEST_ONLY_COUNTRY,
  },
  allowInternationalFallback: false,
  allowSpendBasedFallback: false,
} as const;

function approvedHistory(factorId: string, versionId: string, approvedAt = "2026-01-02T00:00:00.000Z") {
  return [
    {
      type: "draft_created",
      eventId: `${factorId}_SYNTHETIC_TEST_ONLY_draft`,
      factorId,
      versionId,
      occurredAt: "2026-01-01T00:00:00.000Z",
      actorId: "SYNTHETIC_TEST_ONLY_actor",
    },
    {
      type: "approved",
      eventId: `${factorId}_SYNTHETIC_TEST_ONLY_approved`,
      factorId,
      versionId,
      occurredAt: approvedAt,
      actorId: "SYNTHETIC_TEST_ONLY_actor",
      reviewerId: "SYNTHETIC_TEST_ONLY_reviewer",
      reviewedAt: approvedAt,
      methodologyReference: "SYNTHETIC_TEST_ONLY",
      approvalNote: "SYNTHETIC_TEST_ONLY",
      sourceVerified: true,
    },
  ];
}

function factorVersion(overrides: Record<string, unknown> = {}) {
  return {
    factorId: "SYNTHETIC_TEST_ONLY_factor",
    versionId: "SYNTHETIC_TEST_ONLY_version",
    category: SYNTHETIC_TEST_ONLY_CATEGORY,
    activityType: SYNTHETIC_TEST_ONLY_ACTIVITY,
    quantityUnit: SYNTHETIC_TEST_ONLY_UNIT,
    factorUnit: `SYNTHETIC_TEST_ONLY_EMISSIONS/${SYNTHETIC_TEST_ONLY_UNIT}`,
    decimalValue: SYNTHETIC_TEST_ONLY_DECIMAL_VALUE,
    dataLabel: "SYNTHETIC_TEST_ONLY",
    sourceTitle: "SYNTHETIC_TEST_ONLY",
    sourcePublisher: "SYNTHETIC_TEST_ONLY",
    sourceReference: "SYNTHETIC_TEST_ONLY",
    geography: "SYNTHETIC_TEST_ONLY_CAMPUS",
    methodologyVersion: "SYNTHETIC_TEST_ONLY",
    effectiveFrom: "2026-01-01",
    qualityLabel: "SYNTHETIC_TEST_ONLY",
    uncertainty: "SYNTHETIC_TEST_ONLY",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function candidate(overrides: Record<string, unknown> = {}) {
  const factor = factorVersion(overrides.factorVersion as Record<string, unknown> | undefined);
  const geographyId = (overrides.geographyId as string | undefined) ?? factor.geography;

  return {
    factorVersion: factor,
    lifecycleHistory: overrides.lifecycleHistory ?? approvedHistory(factor.factorId, factor.versionId),
    geographyLevel: overrides.geographyLevel ?? "campus",
    geographyId,
    activitySpecificity: overrides.activitySpecificity ?? "activity_type",
    sourceQualityPriority: overrides.sourceQualityPriority ?? 10,
  };
}

describe("deterministic emission-factor selection", () => {
  it("selects an exact campus match", () => {
    expect(selectEmissionFactor(query, [candidate()])).toMatchObject({ status: "selected", matchLevel: "campus" });
  });

  it("prefers city over state", () => {
    const city = candidate({ geographyLevel: "city", geographyId: query.requestedGeography.city, factorVersion: { geography: query.requestedGeography.city } });
    const state = candidate({ geographyLevel: "state", geographyId: query.requestedGeography.state, factorVersion: { geography: query.requestedGeography.state, factorId: "SYNTHETIC_TEST_ONLY_state_factor", versionId: "SYNTHETIC_TEST_ONLY_state_version" } });
    expect(selectEmissionFactor({ ...query, requestedGeography: { ...query.requestedGeography, campus: undefined } }, [state, city])).toMatchObject({ status: "selected", matchLevel: "city" });
  });

  it("prefers state over country", () => {
    const state = candidate({ geographyLevel: "state", geographyId: query.requestedGeography.state, factorVersion: { geography: query.requestedGeography.state } });
    const country = candidate({ geographyLevel: "country", geographyId: query.requestedGeography.country, factorVersion: { geography: query.requestedGeography.country, factorId: "SYNTHETIC_TEST_ONLY_country_factor", versionId: "SYNTHETIC_TEST_ONLY_country_version" } });
    expect(selectEmissionFactor({ ...query, requestedGeography: { ...query.requestedGeography, campus: undefined, city: undefined } }, [country, state])).toMatchObject({ status: "selected", matchLevel: "state" });
  });

  it("prefers a country factor over international fallback", () => {
    const country = candidate({ geographyLevel: "country", geographyId: query.requestedGeography.country, factorVersion: { geography: query.requestedGeography.country } });
    const international = candidate({ geographyLevel: "international", geographyId: "SYNTHETIC_TEST_ONLY_INTERNATIONAL", factorVersion: { geography: "SYNTHETIC_TEST_ONLY_INTERNATIONAL", factorId: "SYNTHETIC_TEST_ONLY_international_factor", versionId: "SYNTHETIC_TEST_ONLY_international_version" } });
    expect(selectEmissionFactor({ ...query, allowInternationalFallback: true, requestedGeography: { ...query.requestedGeography, campus: undefined, city: undefined, state: undefined } }, [international, country])).toMatchObject({ status: "selected", matchLevel: "country", fallbackStatus: "not_used" });
  });

  it("rejects international fallback when disabled", () => {
    const international = candidate({ geographyLevel: "international", geographyId: "SYNTHETIC_TEST_ONLY_INTERNATIONAL", factorVersion: { geography: "SYNTHETIC_TEST_ONLY_INTERNATIONAL" } });
    expect(selectEmissionFactor(query, [international])).toMatchObject({ status: "unsupported" });
  });

  it("rejects spend-based fallback when disabled", () => {
    const spendBased = candidate({ geographyLevel: "spend_based", geographyId: "SYNTHETIC_TEST_ONLY_SPEND", factorVersion: { geography: "SYNTHETIC_TEST_ONLY_SPEND" } });
    expect(selectEmissionFactor(query, [spendBased])).toMatchObject({ status: "unsupported" });
  });

  it("excludes a draft factor", () => {
    const draft = candidate({ lifecycleHistory: approvedHistory("SYNTHETIC_TEST_ONLY_factor", "SYNTHETIC_TEST_ONLY_version").slice(0, 1) });
    expect(selectEmissionFactor(query, [draft])).toMatchObject({ status: "unsupported" });
  });

  it("excludes approval after selection time", () => {
    const laterApproval = candidate({ lifecycleHistory: approvedHistory("SYNTHETIC_TEST_ONLY_factor", "SYNTHETIC_TEST_ONLY_version", "2026-07-01T00:00:00.000Z") });
    expect(selectEmissionFactor(query, [laterApproval])).toMatchObject({ status: "unsupported" });
  });

  it("excludes a factor retired before new selection", () => {
    const history = [
      ...approvedHistory("SYNTHETIC_TEST_ONLY_factor", "SYNTHETIC_TEST_ONLY_version"),
      {
        type: "retired",
        eventId: "SYNTHETIC_TEST_ONLY_retired_event",
        factorId: "SYNTHETIC_TEST_ONLY_factor",
        versionId: "SYNTHETIC_TEST_ONLY_version",
        occurredAt: "2026-06-05T00:00:00.000Z",
        actorId: "SYNTHETIC_TEST_ONLY_actor",
        retiredBy: "SYNTHETIC_TEST_ONLY_reviewer",
        retiredAt: "2026-06-05T00:00:00.000Z",
        retirementReason: "SYNTHETIC_TEST_ONLY",
      },
    ];
    expect(selectEmissionFactor(query, [candidate({ lifecycleHistory: history })])).toMatchObject({ status: "unsupported" });
  });

  it("excludes factors before and after their effective-date boundaries", () => {
    const bounded = candidate({ factorVersion: { effectiveFrom: "2026-06-02", effectiveTo: "2026-06-03" } });
    expect(selectEmissionFactor(query, [bounded])).toMatchObject({ status: "unsupported" });
    expect(selectEmissionFactor({ ...query, activityOccurredAt: "2026-06-04T00:00:00.000Z" }, [bounded])).toMatchObject({ status: "unsupported" });
  });

  it("rejects incompatible units", () => {
    expect(selectEmissionFactor({ ...query, quantityUnit: "SYNTHETIC_TEST_ONLY_OTHER_UNIT" }, [candidate()])).toMatchObject({ status: "unsupported" });
  });

  it("returns unsupported for missing candidates", () => {
    expect(selectEmissionFactor(query, [])).toMatchObject({ status: "unsupported" });
  });

  it("returns ambiguous for equal-priority conflicting candidates", () => {
    const first = candidate();
    const conflicting = candidate({ factorVersion: { factorId: "SYNTHETIC_TEST_ONLY_conflict_factor", versionId: "SYNTHETIC_TEST_ONLY_conflict_version", decimalValue: SYNTHETIC_TEST_ONLY_CONFLICTING_DECIMAL_VALUE } });
    expect(selectEmissionFactor(query, [first, conflicting])).toMatchObject({ status: "ambiguous" });
  });

  it("reports invalid lifecycle history", () => {
    const history = approvedHistory("SYNTHETIC_TEST_ONLY_factor", "SYNTHETIC_TEST_ONLY_version");
    history.push({ ...history[1], eventId: "SYNTHETIC_TEST_ONLY_duplicate_approval" });
    expect(selectEmissionFactor(query, [candidate({ lifecycleHistory: history })])).toMatchObject({ status: "invalid_candidates" });
  });

  it("returns the same result for identical inputs", () => {
    const candidates = [candidate()];
    expect(selectEmissionFactor(query, candidates)).toEqual(selectEmissionFactor(query, candidates));
  });

  it("uses the historical snapshot guard without current registry selection", () => {
    const snapshot = factorVersion({ factorId: "SYNTHETIC_TEST_ONLY_historical_factor", versionId: "SYNTHETIC_TEST_ONLY_historical_version" });
    expect(requireHistoricalFactorSnapshot(snapshot)).toEqual(snapshot);
  });
});