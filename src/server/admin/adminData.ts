import { getAdminDbClient } from "@/server/db/client";

// Read helpers for the curator screens. They use the service-role client, so
// only call them after requireCurator().

export async function getAdminSources() {
  const { data, error } = await getAdminDbClient().from("sources").select("id,name,short_name").order("short_name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAdminDocuments() {
  const { data, error } = await getAdminDbClient()
    .from("documents")
    .select("id,title,doc_type,publication_date,period_covered,status,file_url,file_hash,created_at,source:sources(short_name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((d) => ({
    ...d,
    source: (Array.isArray(d.source) ? d.source[0] : d.source) as { short_name: string } | null,
  }));
}

export async function getAdminPeriods() {
  const { data, error } = await getAdminDbClient()
    .from("periods")
    .select("id,type,label,label_ad,start_date,end_date")
    .order("start_date", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAdminIndicators() {
  const { data, error } = await getAdminDbClient().from("indicators").select("id,code,name,unit,scale,frequency").order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}
