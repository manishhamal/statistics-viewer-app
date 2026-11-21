import { z } from "zod";

// Shared between the admin forms (client) and the admin API routes (server).

export const PERIOD_TYPES = ["month", "quarter", "fiscal_year", "calendar_year"] as const;
export const DOC_TYPES = ["annual_report", "monthly_report", "quarterly_report", "bulletin", "survey", "other"] as const;
export const COVERAGE_TYPES = ["monthly", "quarterly", "annual", "other"] as const;
export const CALENDAR_SYSTEMS = ["bs", "ad", "mixed", "not_applicable"] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.");

// Shape check only. Zod's strict .uuid() rejects the seeded placeholder IDs
// (e.g. 11111111-1111-…), and the database is the real authority on IDs anyway.
const uuidShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const periodInputSchema = z
  .object({
    type: z.enum(PERIOD_TYPES),
    label: z.string().trim().min(1, "Label is required.").max(60),
    label_ad: z.string().trim().min(1, "AD label is required.").max(60),
    start_date: isoDate,
    end_date: isoDate,
  })
  .refine((p) => p.start_date <= p.end_date, { message: "Start date must be on or before end date.", path: ["end_date"] });
export type PeriodInput = z.infer<typeof periodInputSchema>;

export const documentInputSchema = z.object({
  sourceId: z.string().regex(uuidShape, "Choose a source."),
  title: z.string().trim().min(3, "Title is required.").max(300),
  docType: z.enum(DOC_TYPES),
  publicationDate: isoDate,
  periodCovered: z.string().trim().min(1, "Say which period the document covers.").max(100),
  coverageType: z.enum(COVERAGE_TYPES),
  calendarSystem: z.enum(CALENDAR_SYSTEMS),
  language: z.string().trim().min(2).max(10),
  fileUrl: z.string().url("Enter the official PDF link.").or(z.literal("")),
});
export type DocumentInput = z.infer<typeof documentInputSchema>;

export const manifestRowSchema = z.object({
  indicatorCode: z.string().trim().min(1, "Choose an indicator."),
  periodId: z.string().regex(uuidShape, "Choose a period."),
  value: z.number().finite("Value must be a number."),
  unit: z.string().trim().min(1, "Unit is required."),
  scale: z.string().trim().min(1, "Scale is required."),
  pageNumber: z.number().int().positive("Page must be a positive whole number."),
  tableRef: z.string().trim().max(100).optional(),
  breakdown: z.record(z.string(), z.string()).optional(),
  isProvisional: z.boolean().optional(),
});
export const manifestInputSchema = z.object({
  documentId: z.string().regex(uuidShape, "Choose a registered document."),
  rows: z.array(manifestRowSchema).min(1, "Add at least one row.").max(200),
});
export type ManifestInput = z.infer<typeof manifestInputSchema>;
export type ManifestRow = z.infer<typeof manifestRowSchema>;

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal("")).transform((v) => v || null);
const webUrl = z.string().trim().url("Enter a full web address starting with https://.").refine((u) => /^https?:\/\//i.test(u), "Use an http(s) address.");

export const TASK_KINDS = ["document", "note"] as const;
export const taskInputSchema = z.object({
  kind: z.enum(TASK_KINDS),
  title: z.string().trim().min(3, "Say what needs doing.").max(200),
  notes: optionalText(2000),
  sourceId: z.string().regex(uuidShape).optional().or(z.literal("")).transform((v) => v || null),
  periodHint: optionalText(100),
  docLink: webUrl.optional().or(z.literal("")).transform((v) => v || null),
  assigneeId: z.string().regex(uuidShape, "Choose who does it."),
  dueDate: isoDate.optional().or(z.literal("")).transform((v) => v || null),
}).refine((t) => t.kind === "note" || t.sourceId, { message: "Choose the source for a document task.", path: ["sourceId"] });
export type TaskInput = z.infer<typeof taskInputSchema>;
export const webUrlSchema = webUrl;

export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid input.";
  const where = issue.path.length ? `${issue.path.join(".")}: ` : "";
  return `${where}${issue.message}`;
}
