import { z } from "zod";

export const opaqueIdSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/);
export const isoTimestampSchema = z.string().datetime({ offset: true });
export const requestIdSchema = z.string().uuid();
export const paginationSchema = z.object({ limit: z.number().int().min(1).max(100).default(25), cursor: z.string().min(1).optional() });
export const apiErrorSchema = z.object({ code: z.string().min(1), message: z.string().min(1), requestId: requestIdSchema, details: z.record(z.string(), z.unknown()).optional() });
