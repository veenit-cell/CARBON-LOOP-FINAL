import { z } from "zod";
import { isoTimestampSchema, opaqueIdSchema, requestIdSchema } from "./common.js";

export const roleSchema = z.enum(["player", "campaign_admin", "evidence_reviewer", "methodologist", "service"]);
export const playerProfileSchema = z.object({ playerId: opaqueIdSchema, displayName: z.string().min(1), createdAt: isoTimestampSchema });
export const campusMembershipSchema = z.object({ campusId: opaqueIdSchema, playerId: opaqueIdSchema, role: roleSchema, validFrom: isoTimestampSchema });
export const consentEventSchema = z.object({ consentId: opaqueIdSchema, playerId: opaqueIdSchema, purpose: z.enum(["account", "activity", "route", "evidence", "social", "institutional_aggregation", "research"]), action: z.enum(["granted", "withdrawn"]), policyVersion: z.string().min(1), occurredAt: isoTimestampSchema });

export const trackingModeSchema = z.enum(["passive_suggestion", "active_challenge", "issuer_verified", "document_based", "manual"]);
export const missionRequirementsSchema = z.object({ trackingMode: trackingModeSchema, requiredConsentPurposes: z.array(consentEventSchema.shape.purpose), evidenceRequired: z.boolean() });
export const questTemplateSchema = z.object({ questTemplateId: opaqueIdSchema, version: z.string().min(1), title: z.string().min(1), requirements: missionRequirementsSchema, status: z.enum(["draft", "published", "retired"]) });
export const questRunSchema = z.discriminatedUnion("state", [z.object({ questRunId: opaqueIdSchema, state: z.literal("draft"), createdAt: isoTimestampSchema }), z.object({ questRunId: opaqueIdSchema, state: z.literal("active"), startedAt: isoTimestampSchema }), z.object({ questRunId: opaqueIdSchema, state: z.literal("paused"), startedAt: isoTimestampSchema, pausedAt: isoTimestampSchema }), z.object({ questRunId: opaqueIdSchema, state: z.literal("submitted"), startedAt: isoTimestampSchema, completedAt: isoTimestampSchema })]);
export const questTransitionSchema = z.object({ from: z.enum(["draft", "active", "paused"]), to: z.enum(["active", "paused", "submitted"]), occurredAt: isoTimestampSchema }).refine(({ from, to }) => ({ draft: ["active"], active: ["paused", "submitted"], paused: ["active"] })[from].includes(to), "Invalid quest-state transition");

export const evidenceTierSchema = z.enum(["V1", "V2", "V3", "V4"]);
export const evidenceSchema = z.object({ evidenceId: opaqueIdSchema, tier: evidenceTierSchema, source: z.enum(["issuer", "sensor", "document", "manual"]), capturedAt: isoTimestampSchema, rejectionReason: z.enum(["duplicate", "replay", "implausible", "invalid", "ineligible"]).optional() });
export const activitySchema = z.object({ activityId: opaqueIdSchema, category: z.enum(["walking", "cycling", "shuttle", "electricity", "waste", "consumption"]), state: z.enum(["pending", "needs_confirmation", "verified", "corroborated", "estimated", "rejected"]), contextConfirmation: z.object({ confirmedAt: isoTimestampSchema, replacedBaseline: z.boolean() }).optional() });

export const factorReferenceSchema = z.object({ factorId: opaqueIdSchema, source: z.string().min(1), version: z.string().min(1), effectiveFrom: isoTimestampSchema, immutable: z.literal(true) });
export const carbonResultSchema = z.object({ calculationId: opaqueIdSchema, verificationStatus: z.enum(["verified", "estimated"]), baseline: z.object({ quantity: z.number().nonnegative(), unit: z.string().min(1), baselineType: z.string().min(1) }), actual: z.object({ quantity: z.number().nonnegative(), unit: z.string().min(1) }), factor: factorReferenceSchema.optional(), avoidedKgCo2e: z.number().nonnegative(), qualityLabel: z.enum(["high", "medium", "low"]), calculationEngineVersion: z.string().min(1) }).refine((v) => v.verificationStatus !== "verified" || v.factor !== undefined, "Verified carbon results require factor provenance");

export const ecoXpSchema = z.object({ amount: z.number().int().nonnegative(), reasonCode: z.string().min(1) });
export const greenRewardPointsSchema = z.object({ amount: z.number().int().nonnegative(), eligibleEvidenceId: opaqueIdSchema, calculationId: opaqueIdSchema });
export const verifiedCo2eSavedSchema = z.object({ calculationId: opaqueIdSchema, avoidedKgCo2e: z.number().nonnegative() });
export const scoreLedgerEventSchema = z.discriminatedUnion("measure", [z.object({ measure: z.literal("eco_xp"), value: ecoXpSchema }), z.object({ measure: z.literal("green_reward_points"), value: greenRewardPointsSchema }), z.object({ measure: z.literal("verified_co2e_saved"), value: verifiedCo2eSavedSchema })]);
export const progressionSchema = z.object({ level: z.number().int().nonnegative(), streakDays: z.number().int().nonnegative(), teamContribution: z.object({ teamId: opaqueIdSchema, contributionCount: z.number().int().nonnegative() }) });
export const rewardCatalogueItemSchema = z.object({ rewardItemId: opaqueIdSchema, title: z.string().min(1), status: z.enum(["active", "unavailable", "retired"]) });
export const redemptionRequestSchema = z.object({ rewardItemId: opaqueIdSchema, requestId: requestIdSchema, status: z.enum(["requested", "reserved", "fulfilled", "reversed", "rejected"]) });
export const truthLabelSchema = z.enum(["seeded", "simulated", "projected", "observed", "verified"]);
export const institutionalAggregateSchema = z.object({ campusId: opaqueIdSchema, metricPeriodStart: isoTimestampSchema, metricPeriodEnd: isoTimestampSchema, privacyThresholdApplied: z.boolean(), truthLabels: z.array(truthLabelSchema).min(1), evidenceQuality: z.record(evidenceTierSchema, z.number().int().nonnegative()), metrics: z.record(z.string(), z.number()) });
