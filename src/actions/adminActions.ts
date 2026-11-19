"use server";
import { revalidatePath } from "next/cache";
import { requireCurator } from "@/server/auth/session";
import { publishObservation } from "@/server/admin/publish";
import { rejectObservation } from "@/server/admin/reject";
import { logAudit } from "@/server/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

// Errors are returned rather than thrown: in production Next.js hides thrown
// server-action messages, and the curator needs to see why something failed.
async function run(task: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await task();
    revalidatePath("/[lang]", "layout"); // refresh the public pages in both languages
    revalidatePath("/admin/review");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." };
  }
}

export async function publishAction(id: string): Promise<ActionResult> {
  return run(async () => {
    const curator = await requireCurator();
    const { published, superseded } = await publishObservation(id, curator.id);
    await logAudit(curator, "observation.publish", { type: "observation", id }, {
      value: published.value,
      superseded: superseded.map((s) => ({ id: s.id, value: s.value })),
    });
  });
}

export async function rejectAction(id: string, reason: string): Promise<ActionResult> {
  return run(async () => {
    const curator = await requireCurator();
    const why = reason.trim();
    if (!why) throw new Error("Give a reason for rejecting.");
    const rejected = await rejectObservation(id, curator.id, why);
    await logAudit(curator, "observation.reject", { type: "observation", id }, { value: rejected.value, reason: why });
  });
}
