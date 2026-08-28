import type { z } from "zod";
import { apiErrorSchema } from "./common.js";
import {
  baselineSchema,
  carbonResultSchema,
  institutionalAggregateSchema,
  questRunSchema,
  scoreLedgerEventSchema,
} from "./domain.js";

export * from "./common.js";
export * from "./domain.js";
export type ApiError = z.infer<typeof apiErrorSchema>;
export type Baseline = z.infer<typeof baselineSchema>;
export type QuestRun = z.infer<typeof questRunSchema>;
export type CarbonResult = z.infer<typeof carbonResultSchema>;
export type ScoreLedgerEvent = z.infer<typeof scoreLedgerEventSchema>;
export type InstitutionalAggregate = z.infer<typeof institutionalAggregateSchema>;