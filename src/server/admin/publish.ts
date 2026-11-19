import { getAdminDbClient } from "@/server/db/client";

// Publishes a staged observation. If a value is already published for the same
// indicator, period and breakdown, that older value is marked "superseded" first,
// so a correction replaces it instead of colliding with the unique index.
export async function publishObservation(id: string, reviewerId: string) {
  const db = getAdminDbClient();

  const { data: staged, error: readError } = await db
    .from("observations")
    .select("id,indicator_id,period_id,breakdown_key")
    .eq("id", id)
    .eq("status", "staged")
    .single();
  if (readError || !staged) throw new Error(readError?.message ?? "Observation is not staged.");

  const { error: supersedeError } = await db
    .from("observations")
    .update({ status: "superseded" })
    .eq("indicator_id", staged.indicator_id)
    .eq("period_id", staged.period_id)
    .eq("breakdown_key", staged.breakdown_key)
    .eq("status", "published");
  if (supersedeError) throw new Error(supersedeError.message);

  const { data, error } = await db
    .from("observations")
    .update({
      status: "published",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    })
    .eq("id", id)
    .eq("status", "staged")
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}
