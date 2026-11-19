import { z } from "zod";
export const searchRequestSchema=z.object({question:z.string().trim().min(2).max(1000)});
export const searchPlanSchema=z.object({matched:z.boolean(),indicator_code:z.string().nullable(),period_from:z.string().nullable().optional(),period_to:z.string().nullable().optional(),breakdown:z.record(z.string(),z.string()).nullable().optional(),chart_hint:z.enum(['line','bar','table','none']).default('table'),clarifying_question:z.string().nullable().optional()});
export type SearchPlan=z.infer<typeof searchPlanSchema>;
