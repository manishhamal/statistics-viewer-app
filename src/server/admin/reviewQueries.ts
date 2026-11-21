import { getAdminDbClient } from "@/server/db/client";

export interface ReviewItem {
  id: string;
  value: number;
  unit: string;
  scale: string;
  is_provisional: boolean;
  page_number: number | null;
  table_ref: string | null;
  breakdown: Record<string, string>;
  breakdown_key: string;
  created_at: string;
  stagedBy: string | null;
  stagedByEmail: string | null;
  indicator: { code: string; name: string } | null;
  period: { label: string; label_ad: string } | null;
  document: { title: string; file_url: string | null } | null;
  /** The value currently published for the same indicator/period/breakdown, which approving would replace. */
  currentPublished: { value: number; unit: string; scale: string } | null;
}

const one = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? x[0] ?? null : x);

/** All staged values, or only those from one document (when opened from a task). */
export async function getStagedObservations(documentId?: string): Promise<ReviewItem[]> {
  const db = getAdminDbClient();
  let query = db
    .from("observations")
    .select(
      "id,indicator_id,period_id,value,unit,scale,is_provisional,page_number,table_ref,breakdown,breakdown_key,created_at,staged_by," +
        "indicator:indicators(code,name),period:periods(label,label_ad),document:documents(title,file_url)",
    )
    .eq("status", "staged");
  if (documentId) query = query.eq("document_id", documentId);
  const { data, error } = await query.order("created_at");
  if (error) throw new Error(error.message);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[];
  if (rows.length === 0) return [];

  const { data: published, error: pubError } = await db
    .from("observations")
    .select("indicator_id,period_id,breakdown_key,value,unit,scale")
    .eq("status", "published")
    .in("indicator_id", [...new Set(rows.map((r) => r.indicator_id))]);
  if (pubError) throw new Error(pubError.message);
  const current = new Map((published ?? []).map((p) => [`${p.indicator_id}|${p.period_id}|${p.breakdown_key}`, p]));

  const stagerIds = [...new Set(rows.map((r) => r.staged_by).filter(Boolean))];
  const { data: people } = stagerIds.length
    ? await db.from("curators").select("user_id,email").in("user_id", stagerIds)
    : { data: [] as { user_id: string; email: string }[] };
  const emailOf = new Map((people ?? []).map((p) => [p.user_id, p.email]));

  return rows.map((r) => {
    const cur = current.get(`${r.indicator_id}|${r.period_id}|${r.breakdown_key}`);
    return {
      id: r.id,
      value: Number(r.value),
      unit: r.unit,
      scale: r.scale,
      is_provisional: r.is_provisional,
      page_number: r.page_number,
      table_ref: r.table_ref,
      breakdown: r.breakdown ?? {},
      breakdown_key: r.breakdown_key,
      created_at: r.created_at,
      stagedBy: r.staged_by ?? null,
      stagedByEmail: r.staged_by ? emailOf.get(r.staged_by) ?? "unknown curator" : null,
      indicator: one(r.indicator),
      period: one(r.period),
      document: one(r.document),
      currentPublished: cur ? { value: Number(cur.value), unit: cur.unit, scale: cur.scale } : null,
    };
  });
}
