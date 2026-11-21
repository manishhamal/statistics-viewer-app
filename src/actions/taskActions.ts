"use server";
import { revalidatePath } from "next/cache";
import { requireCurator, requireOwner } from "@/server/auth/session";
import { logAudit } from "@/server/audit";
import { getAdminDbClient } from "@/server/db/client";
import { createTask, getTaskForWork, updateTask } from "@/server/tasks/taskData";
import { findDocumentCandidates, resolvePdf, splitPages, type FindResult } from "@/server/tasks/findDocument";
import { firstIssue, taskInputSchema, webUrlSchema } from "@/lib/adminSchemas";

export type TaskActionResult = { ok: true; id?: string } | { ok: false; error: string };

// Errors are returned rather than thrown: production Next.js hides thrown
// server-action messages, and the curator needs to see why something failed.
async function run(task: () => Promise<TaskActionResult | void>): Promise<TaskActionResult> {
  try {
    const result = await task();
    revalidatePath("/admin/tasks", "layout");
    return result ?? { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Something went wrong." };
  }
}

const now = () => new Date().toISOString();

/** A link that opens a PDF is the chosen document; anything else is a page to search. */
async function sortLink(link: string | null): Promise<{ docLink: string | null; searchLink: string | null }> {
  if (!link) return { docLink: null, searchLink: null };
  const r = await resolvePdf(link);
  return r && r !== "page" ? { docLink: r.pdf, searchLink: null } : { docLink: null, searchLink: link };
}

// ----- owner -----

export async function createTaskAction(input: unknown): Promise<TaskActionResult> {
  return run(async () => {
    const owner = await requireOwner();
    const parsed = taskInputSchema.safeParse(input);
    if (!parsed.success) throw new Error(firstIssue(parsed.error));
    const links = parsed.data.kind === "document" ? await sortLink(parsed.data.docLink) : { docLink: null, searchLink: null };
    const id = await createTask(owner, parsed.data, links);
    await logAudit(owner, "task.create", { type: "task", id }, { title: parsed.data.title, kind: parsed.data.kind });
    return { ok: true, id };
  });
}

export async function reassignTaskAction(id: string, assigneeId: string): Promise<TaskActionResult> {
  return run(async () => {
    const owner = await requireOwner();
    const { data: who } = await getAdminDbClient().from("curators").select("email,active").eq("user_id", assigneeId).maybeSingle();
    if (!who?.active) throw new Error("Choose an active curator.");
    await updateTask(id, { assignee_id: assigneeId });
    await logAudit(owner, "task.reassign", { type: "task", id }, { email: who.email });
  });
}

/** Cancel, or reopen a blocked/cancelled/done task (optionally with a new link or notes). */
export async function setTaskStatusAction(
  id: string,
  status: "open" | "cancelled",
  extra: { docLink?: string; notes?: string } = {},
): Promise<TaskActionResult> {
  return run(async () => {
    const owner = await requireOwner();
    const patch: Record<string, unknown> = { status, blocked_reason: null, completed_at: status === "cancelled" ? now() : null };
    if (extra.docLink) {
      const link = webUrlSchema.safeParse(extra.docLink);
      if (!link.success) throw new Error(firstIssue(link.error));
      const sorted = await sortLink(link.data);
      if (sorted.docLink) patch.doc_link = sorted.docLink;
      else patch.search_link = sorted.searchLink;
    }
    if (extra.notes !== undefined) patch.notes = extra.notes.trim() || null;
    await updateTask(id, patch);
    await logAudit(owner, status === "cancelled" ? "task.cancel" : "task.reopen", { type: "task", id });
  });
}

export async function setSourcePageAction(sourceId: string, url: string): Promise<TaskActionResult> {
  return run(async () => {
    const owner = await requireOwner();
    // One or more search pages (listing pages or sitemaps), one per line.
    const pages = splitPages(url);
    if (pages.length > 6) throw new Error("Use at most 6 search pages per source.");
    for (const page of pages) {
      const parsed = webUrlSchema.safeParse(page);
      if (!parsed.success) throw new Error(`${page}: ${firstIssue(parsed.error)}`);
    }
    const value = pages.length ? pages.join("\n") : null;
    const { error } = await getAdminDbClient().from("sources").update({ publications_url: value, updated_at: now() }).eq("id", sourceId);
    if (error) throw new Error(error.message);
    await logAudit(owner, "source.set_page", { type: "source", id: sourceId }, { url: value });
  });
}

// ----- assignee (or owner) -----

export async function findDocumentAction(id: string): Promise<{ ok: true; result: FindResult } | { ok: false; error: string }> {
  try {
    const curator = await requireCurator();
    const task = await getTaskForWork(id, curator);
    if (task.kind !== "document") throw new Error("Only document tasks have a document to find.");
    return { ok: true, result: await findDocumentCandidates(task) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Search failed." };
  }
}

/** Saves the PDF link the curator picked (or pasted); the next step is registering it. */
export async function chooseLinkAction(id: string, url: string): Promise<TaskActionResult> {
  return run(async () => {
    const curator = await requireCurator();
    const task = await getTaskForWork(id, curator);
    if (task.document) throw new Error("This task already has a registered document.");
    const parsed = webUrlSchema.safeParse(url.trim());
    if (!parsed.success) throw new Error(firstIssue(parsed.error));
    // Only a link that really opens a PDF can be registered (the server downloads it).
    const r = await resolvePdf(parsed.data);
    if (r === null) throw new Error("That link could not be opened. Check it in your browser, or try again later.");
    if (r === "page") {
      throw new Error("That link opens a web page, not a PDF. Open it, find the PDF (often a Download button) and paste that link instead.");
    }
    await updateTask(id, { doc_link: r.pdf, status: "open", blocked_reason: null });
    await logAudit(curator, "task.choose_link", { type: "task", id }, { url: r.pdf });
  });
}

export async function blockTaskAction(id: string, reason: string): Promise<TaskActionResult> {
  return run(async () => {
    const curator = await requireCurator();
    await getTaskForWork(id, curator);
    const why = reason.trim();
    if (!why) throw new Error("Say why, so the owner knows what to do next.");
    await updateTask(id, { status: "blocked", blocked_reason: why.slice(0, 1000) });
    await logAudit(curator, "task.block", { type: "task", id }, { reason: why });
  });
}

export async function completeNoteTaskAction(id: string, result: string): Promise<TaskActionResult> {
  return run(async () => {
    const curator = await requireCurator();
    const task = await getTaskForWork(id, curator);
    if (task.kind !== "note") throw new Error("Document tasks finish when their values are published.");
    const text = result.trim();
    if (!text) throw new Error("Write what you did.");
    await updateTask(id, { status: "done", result_note: text.slice(0, 2000), completed_at: now(), blocked_reason: null });
    await logAudit(curator, "task.complete", { type: "task", id }, { result: text });
  });
}
