import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/curators";
import { getAdminDbClient } from "@/server/db/client";

export type Role = "owner" | "curator";
export interface Curator {
  id: string;
  email: string;
  role: Role;
}

type Resolution = { status: "anonymous" } | { status: "forbidden" } | { status: "ok"; curator: Curator };

// Resolves the signed-in user to a curator. Checked against the database on every
// request, so deactivating someone takes effect immediately.
const resolve = cache(async (): Promise<Resolution> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;
  if (error || !user || !user.email) return { status: "anonymous" };

  const db = getAdminDbClient();
  const email = user.email.toLowerCase();

  if (isOwnerEmail(email)) {
    // Keep owners in the curators table too, so their name shows in the review queue
    // and the audit trail. Failure here (e.g. migration not run yet) must not lock
    // the owner out.
    const { error: upsertError } = await db
      .from("curators")
      .upsert({ user_id: user.id, email, role: "owner", active: true, deactivated_at: null }, { onConflict: "user_id" });
    if (upsertError) console.error("Could not record owner in curators table:", upsertError.message);
    return { status: "ok", curator: { id: user.id, email, role: "owner" } };
  }

  const { data: row, error: rowError } = await db
    .from("curators")
    .select("role,active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (rowError || !row || !row.active) return { status: "forbidden" };
  // Only the environment can make someone an owner.
  return { status: "ok", curator: { id: user.id, email, role: "curator" } };
});

export async function getCurator(): Promise<Curator | null> {
  const r = await resolve();
  return r.status === "ok" ? r.curator : null;
}

/** For API routes and server actions: throws, and the caller turns it into 401/403. */
export async function requireCurator(): Promise<Curator> {
  const r = await resolve();
  if (r.status === "anonymous") throw new Error("Unauthorized: curator authentication is required.");
  if (r.status === "forbidden") throw new Error("Forbidden: this account is not an active curator.");
  return r.curator;
}

export async function requireOwner(): Promise<Curator> {
  const curator = await requireCurator();
  if (curator.role !== "owner") throw new Error("Forbidden: only an owner can manage curators.");
  return curator;
}

/** For pages: sends the visitor to the login page instead of showing an error. */
export async function requireCuratorPage(): Promise<Curator> {
  const r = await resolve();
  if (r.status === "anonymous") redirect("/admin/login");
  if (r.status === "forbidden") redirect("/admin/login?error=not-curator");
  return r.curator;
}

export async function requireOwnerPage(): Promise<Curator> {
  const curator = await requireCuratorPage();
  if (curator.role !== "owner") redirect("/admin/tasks");
  return curator;
}
