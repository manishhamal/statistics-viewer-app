import { getAdminDbClient } from "@/server/db/client";
import { breakdownKey } from "@/lib/breakdown";
import type { ManifestInput } from "@/lib/adminSchemas";

// Stages manifest rows as private observations awaiting curator review.
// Every row is checked first, so a bad row never leaves a half-staged manifest.
export async function stageManifest(input: ManifestInput, stagedBy: string) {
  const db = getAdminDbClient();

  const { data: doc } = await db.from("documents").select("id").eq("id", input.documentId).maybeSingle();
  if (!doc) throw new Error("That document is not registered.");

  const codes = [...new Set(input.rows.map((r) => r.indicatorCode))];
  const periodIds = [...new Set(input.rows.map((r) => r.periodId))];
  const [{ data: indicators, error: indError }, { data: periods, error: perError }] = await Promise.all([
    db.from("indicators").select("id,code").in("code", codes),
    db.from("periods").select("id,label").in("id", periodIds),
  ]);
  if (indError) throw new Error(indError.message);
  if (perError) throw new Error(perError.message);

  const indicatorId = new Map((indicators ?? []).map((i) => [i.code, i.id]));
  const periodLabel = new Map((periods ?? []).map((p) => [p.id, p.label]));
  const seen = new Set<string>();

  const records = input.rows.map((row, index) => {
    const n = index + 1;
    const indId = indicatorId.get(row.indicatorCode);
    if (!indId) throw new Error(`Row ${n}: unknown indicator "${row.indicatorCode}".`);
    if (!periodLabel.has(row.periodId)) throw new Error(`Row ${n}: unknown period.`);
    const breakdown = row.breakdown ?? {};
    const key = breakdownKey(breakdown);
    const dupKey = `${indId}|${row.periodId}|${key}`;
    if (seen.has(dupKey)) throw new Error(`Row ${n}: duplicates an earlier row (same indicator, period and breakdown).`);
    seen.add(dupKey);
    return {
      indicator_id: indId,
      period_id: row.periodId,
      breakdown,
      breakdown_key: key,
      value: row.value,
      unit: row.unit,
      scale: row.scale,
      is_provisional: row.isProvisional ?? false,
      document_id: input.documentId,
      page_number: row.pageNumber,
      table_ref: row.tableRef || null,
      extraction_method: "manual",
      status: "staged",
      staged_by: stagedBy,
    };
  });

  const { data, error } = await db.from("observations").insert(records).select("id");
  if (error) {
    if (error.code === "23505") {
      throw new Error("One of these values is already waiting in the review queue. Approve or reject it first.");
    }
    throw new Error(error.message);
  }
  return { count: data?.length ?? 0, observations: data ?? [] };
}
