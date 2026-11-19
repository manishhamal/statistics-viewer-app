"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurator, requireOwner } from "@/server/auth/session";
import { inviteCurator, passwordResetLink, setCuratorActive } from "@/server/admin/curatorAdmin";
import { logAudit } from "@/server/audit";

export type CuratorActionResult = { ok: true; link?: string; message?: string } | { ok: false; error: string };

async function siteOrigin() {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function run(task: () => Promise<CuratorActionResult>): Promise<CuratorActionResult> {
  try {
    const result = await task();
    revalidatePath("/admin/curators");
    return result;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." };
  }
}

export async function inviteCuratorAction(email: string): Promise<CuratorActionResult> {
  return run(async () => {
    const owner = await requireOwner();
    const result = await inviteCurator(owner, email, await siteOrigin());
    await logAudit(owner, "curator.invite", { type: "curator", id: result.userId }, { email: result.email });
    return { ok: true, link: result.link, message: `Send this one-time link to ${result.email}.` };
  });
}

export async function resetLinkAction(userId: string): Promise<CuratorActionResult> {
  return run(async () => {
    const owner = await requireOwner();
    const result = await passwordResetLink(userId, await siteOrigin());
    await logAudit(owner, "curator.password_link", { type: "curator", id: userId }, { email: result.email });
    return { ok: true, link: result.link, message: `Send this one-time link to ${result.email}.` };
  });
}

export async function setActiveAction(userId: string, active: boolean): Promise<CuratorActionResult> {
  return run(async () => {
    const owner = await requireOwner();
    const target = await setCuratorActive(owner, userId, active);
    await logAudit(owner, active ? "curator.reactivate" : "curator.deactivate", { type: "curator", id: userId }, { email: target.email });
    return { ok: true };
  });
}

/** Any active curator can change their own password (also used after an invite/reset link). */
export async function setPasswordAction(password: string): Promise<CuratorActionResult> {
  try {
    const curator = await requireCurator();
    if (password.length < 12) throw new Error("Use at least 12 characters.");
    const { error } = await (await createClient()).auth.updateUser({ password });
    if (error) throw new Error(error.message);
    await logAudit(curator, "curator.password_set", { type: "curator", id: curator.id });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not set the password." };
  }
}
