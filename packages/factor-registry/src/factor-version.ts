import { z } from "zod";
import { isoTimestampSchema, opaqueIdSchema } from "@carbonloop/schemas";

const requiredStringSchema = z.string().trim().min(1);
const effectiveDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  }, "Invalid calendar date");

/** A finite, non-negative decimal literal; values remain strings to preserve source precision. */
const nonNegativeDecimalStringSchema = requiredStringSchema.refine(
  (value) => /^\d+(?:\.\d+)?$/.test(value) && Number.isFinite(Number(value)),
  "Expected a finite, non-negative decimal string",
);

/**
 * A versioned emission factor definition. It holds provenance and applicability
 * metadata only; approval, factor selection, and calculations are out of scope.
 */
export const factorVersionSchema = z
  .object({
    factorId: opaqueIdSchema,
    versionId: opaqueIdSchema,
    category: requiredStringSchema,
    activityType: requiredStringSchema,
    // The shared schema package currently defines units as non-empty strings.
    quantityUnit: requiredStringSchema,
    factorUnit: requiredStringSchema,
    decimalValue: nonNegativeDecimalStringSchema,
    sourceTitle: requiredStringSchema,
    sourcePublisher: requiredStringSchema,
    sourceReference: requiredStringSchema,
    geography: requiredStringSchema,
    methodologyVersion: requiredStringSchema,
    effectiveFrom: effectiveDateSchema,
    effectiveTo: effectiveDateSchema.optional(),
    qualityLabel: requiredStringSchema,
    uncertainty: requiredStringSchema,
    createdAt: isoTimestampSchema,
  })
  .refine(
    ({ effectiveFrom, effectiveTo }) => effectiveTo === undefined || effectiveTo >= effectiveFrom,
    {
      message: "effectiveTo cannot precede effectiveFrom",
      path: ["effectiveTo"],
    },
  );

export type FactorVersion = z.infer<typeof factorVersionSchema>;
