import { createClient } from "@/lib/supabase/server";
import { isCuratorEmail } from "@/lib/curators";

export async function requireCurator() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Unauthorized: curator authentication is required.");
  if (!isCuratorEmail(data.user.email)) throw new Error("Forbidden: this account is not an approved curator.");
  return data.user;
}
