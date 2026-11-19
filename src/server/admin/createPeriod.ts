import { getAdminDbClient } from "@/server/db/client";
import type { PeriodInput } from "@/lib/adminSchemas";

export async function createPeriod(input: PeriodInput) {
  const { data, error } = await getAdminDbClient().from("periods").insert(input).select("*").single();
  if (error) {
    if (error.code === "23505") throw new Error(`A ${input.type} period labelled "${input.label}" already exists.`);
    throw new Error(error.message);
  }
  return data;
}
