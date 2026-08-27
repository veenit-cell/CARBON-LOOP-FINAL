import { describe, expect, it } from "vitest";
import {
  deriveFactorLifecycleState,
  factorLifecycleEventSchema,
  factorLifecycleHistorySchema,
} from "../src/index.js";

const draftCreated = {
  type: "draft_created",
  eventId: "synthetic_draft_event",
  factorId: "synthetic_factor",
  versionId: "synthetic_version",
  occurredAt: "2026-01-01T00:00:00.000Z",
  actorId: "synthetic_actor",
} as const;

const approved = {
  type: "approved",
  eventId: "synthetic_approval_event",
  factorId: "synthetic_factor",
  versionId: "synthetic_version",
  occurredAt: "2026-01-02T00:00:00.000Z",
  actorId: "synthetic_actor",
  reviewerId: "synthetic_reviewer",
  reviewedAt: "2026-01-02T00:00:00.000Z",
  methodologyReference: "SYNTHETIC_TEST_ONLY",
  approvalNote: "SYNTHETIC_TEST_ONLY",
  sourceVerified: true,
} as const;

const retired = {
  type: "retired",
  eventId: "synthetic_retirement_event",
  factorId: "synthetic_factor",
  versionId: "synthetic_version",
  occurredAt: "2026-01-03T00:00:00.000Z",
  actorId: "synthetic_actor",
  retiredBy: "synthetic_reviewer",
  retiredAt: "2026-01-03T00:00:00.000Z",
  retirementReason: "SYNTHETIC_TEST_ONLY",
} as const;

describe("factor lifecycle", () => {
  it("derives draft from a valid draft history", () => {
    expect(deriveFactorLifecycleState([draftCreated])).toBe("draft");
  });

  it("derives approved from draft to approved", () => {
    expect(deriveFactorLifecycleState([draftCreated, approved])).toBe("approved");
  });

  it("derives retired from draft to approved to retired", () => {
    expect(deriveFactorLifecycleState([draftCreated, approved, retired])).toBe("retired");
  });

  it("rejects approval before draft", () => {
    expect(factorLifecycleHistorySchema.safeParse([approved]).success).toBe(false);
  });

  it("rejects retirement before approval", () => {
    expect(factorLifecycleHistorySchema.safeParse([draftCreated, retired]).success).toBe(false);
  });

  it("rejects duplicate approval", () => {
    expect(
      factorLifecycleHistorySchema.safeParse([
        draftCreated,
        approved,
        { ...approved, eventId: "synthetic_duplicate_approval", occurredAt: "2026-01-03T00:00:00.000Z" },
      ]).success,
    ).toBe(false);
  });

  it("rejects an event after retirement", () => {
    expect(
      factorLifecycleHistorySchema.safeParse([
        draftCreated,
        approved,
        retired,
        { ...approved, eventId: "synthetic_after_retirement", occurredAt: "2026-01-04T00:00:00.000Z" },
      ]).success,
    ).toBe(false);
  });

  it("rejects mismatched factor or version identifiers", () => {
    expect(
      factorLifecycleHistorySchema.safeParse([{ ...draftCreated }, { ...approved, versionId: "synthetic_other_version" }])
        .success,
    ).toBe(false);
  });

  it("rejects backwards event timestamps", () => {
    expect(
      factorLifecycleHistorySchema.safeParse([
        draftCreated,
        { ...approved, occurredAt: "2025-12-31T00:00:00.000Z" },
      ]).success,
    ).toBe(false);
  });

  it("rejects missing approval metadata", () => {
    expect(
      factorLifecycleEventSchema.safeParse({
        ...approved,
        methodologyReference: "",
        sourceVerified: false,
      }).success,
    ).toBe(false);
  });

  it("rejects an empty retirement reason", () => {
    expect(factorLifecycleEventSchema.safeParse({ ...retired, retirementReason: "" }).success).toBe(false);
  });

  it("rejects a self-referencing replacement version", () => {
    expect(
      factorLifecycleEventSchema.safeParse({ ...retired, replacementVersionId: "synthetic_version" }).success,
    ).toBe(false);
  });
});