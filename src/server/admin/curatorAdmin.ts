import { getAdminDbClient } from "@/server/db/client";
import { isOwnerEmail, normalizeEmail } from "@/lib/curators";
import type { Curator } from "@/server/auth/session";

// Owner-only operations on the curator list. Callers must check requireOwner() first.
//
// Links are generated rather than emailed: Supabase's built-in email service only
// delivers to your own project team, so the owner copies the link and sends it to
// the curator personally (which also confirms who receives it).

const BAN_FOREVER = "876000h"; // ~100 years

export interface CuratorRow {
  user_id: string;
  email: string;
  role: "owner" | "curator";
  active: boolean;
  created_at: string;
  deactivated_at: string | null;
}

export async function listCurators(): Promise<CuratorRow[]> {
  const { data, error } = await getAdminDbClient()
    .from("curators")
    .select("user_id,email,role,active,created_at,deactivated_at")
    .order("role")
    .order("created_at");
  if (error) throw new Error(`Could not read curators (has migration 0010 been run?): ${error.message}`);
  return data ?? [];
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const db = getAdminDbClient();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

function confirmLink(origin: string, hashedToken: string, type: string) {
  const url = new URL("/auth/confirm", origin);
  url.searchParams.set("token_hash", hashedToken);
  url.searchParams.set("type", type);
  return url.toString();
}

async function getTarget(userId: string): Promise<CuratorRow> {
  const { data, error } = await getAdminDbClient()
    .from("curators")
    .select("user_id,email,role,active,created_at,deactivated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("That curator does not exist.");
  return data;
}

/** Adds a curator (or re-adds a removed one) and returns a one-time link for them to set a password. */
export async function inviteCurator(owner: Curator, rawEmail: string, origin: string) {
  const email = normalizeEmail(rawEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  if (isOwnerEmail(email)) throw new Error("That address is an owner already.");
  const db = getAdminDbClient();

  let userId: string;
  let type: "invite" | "recovery" = "invite";
  let hashedToken: string;

  const invite = await db.auth.admin.generateLink({ type: "invite", email });
  if (!invite.error) {
    userId = invite.data.user.id;
    hashedToken = invite.data.properties.hashed_token;
  } else {
    // The address already has a login (e.g. a former curator): reuse it and send a
    // password-reset link instead.
    const existing = await findUserIdByEmail(email);
    if (!existing) throw new Error(`Could not create the invitation: ${invite.error.message}`);
    userId = existing;
    type = "recovery";
    const recovery = await db.auth.admin.generateLink({ type: "recovery", email });
    if (recovery.error) throw new Error(recovery.error.message);
    hashedToken = recovery.data.properties.hashed_token;
  }

  const { error: unbanError } = await db.auth.admin.updateUserById(userId, { ban_duration: "none" });
  if (unbanError) throw new Error(unbanError.message);

  const { error } = await db.from("curators").upsert(
    { user_id: userId, email, role: "curator", active: true, invited_by: owner.id, deactivated_at: null },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);

  return { userId, email, link: confirmLink(origin, hashedToken, type) };
}

/** A one-time link that lets an active curator choose a new password. */
export async function passwordResetLink(userId: string, origin: string) {
  const target = await getTarget(userId);
  if (!target.active) throw new Error("Reactivate this curator first.");
  const { data, error } = await getAdminDbClient().auth.admin.generateLink({ type: "recovery", email: target.email });
  if (error) throw new Error(error.message);
  return { email: target.email, link: confirmLink(origin, data.properties.hashed_token, "recovery") };
}

/** Deactivation blocks the curator at once (checked on every request) and bans their login. */
export async function setCuratorActive(owner: Curator, userId: string, active: boolean) {
  if (userId === owner.id) throw new Error("You cannot change your own access.");
  const target = await getTarget(userId);
  if (target.role === "owner" || isOwnerEmail(target.email)) {
    throw new Error("Owners are set in the environment (OWNER_EMAILS) and cannot be deactivated here.");
  }
  const db = getAdminDbClient();
  const { error } = await db
    .from("curators")
    .update({ active, deactivated_at: active ? null : new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const { error: banError } = await db.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : BAN_FOREVER });
  if (banError) throw new Error(`Access was ${active ? "restored" : "removed"}, but updating the login failed: ${banError.message}`);
  return target;
}

export async function getAuditLog(limit = 50) {
  const { data, error } = await getAdminDbClient()
    .from("audit_log")
    .select("id,actor_email,action,target_type,target_id,details,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return data ?? [];
}
