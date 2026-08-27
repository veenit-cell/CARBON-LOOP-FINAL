import { z } from "zod";
import { isoTimestampSchema, opaqueIdSchema } from "@carbonloop/schemas";

const requiredStringSchema = z.string().trim().min(1);
const lifecycleEventBaseSchema = z.object({
  eventId: opaqueIdSchema,
  factorId: opaqueIdSchema,
  versionId: opaqueIdSchema,
  occurredAt: isoTimestampSchema,
  actorId: opaqueIdSchema,
}).strict();

const draftCreatedEventSchema = lifecycleEventBaseSchema.extend({
  type: z.literal("draft_created"),
});

const approvedEventSchema = lifecycleEventBaseSchema.extend({
  type: z.literal("approved"),
  reviewerId: opaqueIdSchema,
  reviewedAt: isoTimestampSchema,
  methodologyReference: requiredStringSchema,
  approvalNote: requiredStringSchema,
  sourceVerified: z.literal(true),
});

const retiredEventSchema = lifecycleEventBaseSchema
  .extend({
    type: z.literal("retired"),
    retiredBy: opaqueIdSchema,
    retiredAt: isoTimestampSchema,
    retirementReason: requiredStringSchema,
    replacementVersionId: opaqueIdSchema.optional(),
  })
  .superRefine(({ replacementVersionId, versionId }, context) => {
    if (replacementVersionId === versionId) {
      context.addIssue({
        code: "custom",
        path: ["replacementVersionId"],
        message: "replacementVersionId cannot equal the retired versionId",
      });
    }
  });

/**
 * Append-only lifecycle events for one immutable factor-version snapshot.
 * Events intentionally contain no factor value, unit, or provenance fields.
 */
export const factorLifecycleEventSchema = z.discriminatedUnion("type", [
  draftCreatedEventSchema,
  approvedEventSchema,
  retiredEventSchema,
]);

export type FactorLifecycleEvent = z.infer<typeof factorLifecycleEventSchema>;

export const factorLifecycleStateSchema = z.enum(["draft", "approved", "retired"]);
export type FactorLifecycleState = z.infer<typeof factorLifecycleStateSchema>;

/** Validates one ordered, append-only factor lifecycle history. */
export const factorLifecycleHistorySchema = z
  .array(factorLifecycleEventSchema)
  .min(1, "A lifecycle history requires a draft_created event")
  .superRefine((events, context) => {
    const firstEvent = events[0];
    if (firstEvent?.type !== "draft_created") {
      context.addIssue({
        code: "custom",
        path: [0, "type"],
        message: "draft_created must be the first lifecycle event",
      });
    }

    let state: FactorLifecycleState | undefined;
    let previousEvent: FactorLifecycleEvent | undefined;

    events.forEach((event, index) => {
      if (firstEvent !== undefined && (event.factorId !== firstEvent.factorId || event.versionId !== firstEvent.versionId)) {
        context.addIssue({
          code: "custom",
          path: [index],
          message: "factorId and versionId must match throughout one lifecycle history",
        });
      }

      if (previousEvent !== undefined && Date.parse(event.occurredAt) < Date.parse(previousEvent.occurredAt)) {
        context.addIssue({
          code: "custom",
          path: [index, "occurredAt"],
          message: "Lifecycle event timestamps must not move backwards",
        });
      }

      if (index > 0) {
        if (state === "retired") {
          context.addIssue({
            code: "custom",
            path: [index, "type"],
            message: "No lifecycle event is allowed after retirement",
          });
        } else if (event.type === "draft_created") {
          context.addIssue({
            code: "custom",
            path: [index, "type"],
            message: "draft_created must be the first lifecycle event",
          });
        } else if (event.type === "approved" && state !== "draft") {
          context.addIssue({
            code: "custom",
            path: [index, "type"],
            message: "approved is allowed only after draft_created",
          });
        } else if (event.type === "retired" && state !== "approved") {
          context.addIssue({
            code: "custom",
            path: [index, "type"],
            message: "retired is allowed only after approved",
          });
        }
      }

      state = event.type === "draft_created" ? "draft" : event.type;
      previousEvent = event;
    });
  });

/**
 * Returns the current lifecycle state from validated, ordered event history.
 * It never reads or writes an independently editable factor status field.
 */
export function deriveFactorLifecycleState(events: readonly FactorLifecycleEvent[]): FactorLifecycleState {
  const history = factorLifecycleHistorySchema.parse(events);
  const finalEvent = history.at(-1);

  if (finalEvent === undefined) {
    throw new Error("A lifecycle history requires a draft_created event");
  }

  return finalEvent.type === "draft_created" ? "draft" : finalEvent.type;
}