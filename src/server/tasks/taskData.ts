import { getAdminDbClient } from "@/server/db/client";
import type { Curator } from "@/server/auth/session";
import type { TaskInput } from "@/lib/adminSchemas";

// Curation tasks. Uses the service-role client, so only call after requireCurator().
//
// A document task's step is worked out from what exists, not stored:
//   find      – no PDF link chosen yet
//   register  – a link is chosen but the PDF is not registered
//   extract   – registered, but no values entered (or all were rejected)
//   review    – values are waiting in the review queue
//   published – values are live and nothing is waiting
// So the progress bar can never drift from the real state of the data.

export const DOCUMENT_STEPS = ["find", "register", "extract", "review", "published"] as const;
export type DocumentStep = (typeof DOCUMENT_STEPS)[number];

export interface Task {
  id: string;
  kind: "document" | "note";
  title: string;
  notes: string | null;
  periodHint: string | null;
  /** A page the owner suggested searching. */
  searchLink: string | null;
  /** The chosen PDF. */
  docLink: string | null;
  status: "open" | "blocked" | "done" | "cancelled";
  blockedReason: string | null;
  resultNote: string | null;
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
  assigneeId: string | null;
  assigneeEmail: string | null;
  source: { id: string; shortName: string; name: string; websiteUrl: string; publicationsUrl: string | null } | null;
  document: { id: string; title: string; fileUrl: string | null } | null;
  /** Document tasks only. */
  step: DocumentStep | null;
  counts: { staged: number; published: number; rejected: number };
  /** Curators who entered the values now waiting for review (they cannot approve them). */
  stagedBy: string[];
  /** Open, or a document task whose values are not live yet. */
  active: boolean;
  overdue: boolean;
}

const one = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? x[0] ?? null : x);

const SELECT =
  "id,kind,title,notes,period_hint,search_link,doc_link,status,blocked_reason,result_note,due_date,created_at,completed_at,assignee_id,document_id," +
  "source:sources(id,short_name,name,website_url,publications_url),document:documents(id,title,file_url)";

function stepOf(docLink: string | null, documentId: string | null, c: Task["counts"]): DocumentStep {
  if (!documentId) return docLink ? "register" : "find";
  if (c.staged > 0) return "review";
  if (c.published > 0) return "published";
  return "extract";
}

async function hydrate(rows: Record<string, unknown>[]): Promise<Task[]> {
  const db = getAdminDbClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const list = rows as any[];
  const docIds = [...new Set(list.map((r) => r.document_id).filter(Boolean))] as string[];
  const userIds = [...new Set(list.map((r) => r.assignee_id).filter(Boolean))] as string[];

  const [obsRes, peopleRes] = await Promise.all([
    docIds.length
      ? db.from("observations").select("document_id,status,staged_by").in("document_id", docIds).in("status", ["staged", "published", "rejected"])
      : Promise.resolve({ data: [] as { document_id: string; status: string; staged_by: string | null }[], error: null }),
    userIds.length
      ? db.from("curators").select("user_id,email").in("user_id", userIds)
      : Promise.resolve({ data: [] as { user_id: string; email: string }[], error: null }),
  ]);
  if (obsRes.error) throw new Error(obsRes.error.message);

  const counts = new Map<string, Task["counts"]>();
  const stagers = new Map<string, Set<string>>();
  for (const o of obsRes.data ?? []) {
    const c = counts.get(o.document_id) ?? { staged: 0, published: 0, rejected: 0 };
    if (o.status === "staged") {
      c.staged++;
      if (o.staged_by) (stagers.get(o.document_id) ?? stagers.set(o.document_id, new Set()).get(o.document_id)!).add(o.staged_by);
    } else if (o.status === "published") c.published++;
    else c.rejected++;
    counts.set(o.document_id, c);
  }
  const emailOf = new Map((peopleRes.data ?? []).map((p) => [p.user_id, p.email]));
  const today = new Date().toISOString().slice(0, 10);

  return list.map((r) => {
    const source = one(r.source);
    const document = one(r.document);
    const c = (r.document_id && counts.get(r.document_id)) || { staged: 0, published: 0, rejected: 0 };
    const step = r.kind === "document" ? stepOf(r.doc_link, r.document_id, c) : null;
    const active = r.status === "open" && step !== "published";
    return {
      id: r.id,
      kind: r.kind,
      title: r.title,
      notes: r.notes,
      periodHint: r.period_hint,
      searchLink: r.search_link,
      docLink: r.doc_link,
      status: r.status,
      blockedReason: r.blocked_reason,
      resultNote: r.result_note,
      dueDate: r.due_date,
      createdAt: r.created_at,
      completedAt: r.completed_at,
      assigneeId: r.assignee_id,
      assigneeEmail: r.assignee_id ? emailOf.get(r.assignee_id) ?? "unknown curator" : null,
      source: source
        ? { id: source.id, shortName: source.short_name, name: source.name, websiteUrl: source.website_url, publicationsUrl: source.publications_url }
        : null,
      document: document ? { id: document.id, title: document.title, fileUrl: document.file_url } : null,
      step,
      counts: c,
      stagedBy: [...(r.document_id ? stagers.get(r.document_id) ?? [] : [])],
      active,
      overdue: active && !!r.due_date && r.due_date < today,
    } satisfies Task;
  });
}

function tableError(message: string) {
  return new Error(`Could not read tasks (has migration 0012 been run?): ${message}`);
}

export async function listTasks(): Promise<Task[]> {
  const { data, error } = await getAdminDbClient().from("curation_tasks").select(SELECT).order("created_at", { ascending: false }).limit(500);
  if (error) throw tableError(error.message);
  return hydrate((data ?? []) as unknown as Record<string, unknown>[]);
}

export async function getTask(id: string): Promise<Task | null> {
  const { data, error } = await getAdminDbClient().from("curation_tasks").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw tableError(error.message);
  if (!data) return null;
  return (await hydrate([data as unknown as Record<string, unknown>]))[0];
}

/** Only the person a task is assigned to, or an owner, may work on it. */
export async function getTaskForWork(id: string, curator: Curator): Promise<Task> {
  const task = await getTask(id);
  if (!task) throw new Error("That task no longer exists.");
  if (curator.role !== "owner" && task.assigneeId !== curator.id) throw new Error("Forbidden: this task is assigned to someone else.");
  if (task.status === "cancelled") throw new Error("This task was cancelled.");
  return task;
}

/** `links` comes from sorting the owner's link into a PDF or a page to search (see resolvePdf). */
export async function createTask(owner: Curator, input: TaskInput, links: { docLink: string | null; searchLink: string | null }) {
  const db = getAdminDbClient();
  const { data: assignee } = await db.from("curators").select("user_id,active").eq("user_id", input.assigneeId).maybeSingle();
  if (!assignee?.active) throw new Error("Choose an active curator.");
  const { data, error } = await db
    .from("curation_tasks")
    .insert({
      kind: input.kind,
      title: input.title,
      notes: input.notes,
      source_id: input.sourceId,
      period_hint: input.periodHint,
      doc_link: input.kind === "document" ? links.docLink : null,
      search_link: input.kind === "document" ? links.searchLink : null,
      assignee_id: input.assigneeId,
      due_date: input.dueDate,
      created_by: owner.id,
    })
    .select("id")
    .single();
  if (error) throw tableError(error.message);
  return data.id as string;
}

export async function updateTask(id: string, patch: Record<string, unknown>) {
  const { error } = await getAdminDbClient()
    .from("curation_tasks")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function listAssignableCurators() {
  const { data, error } = await getAdminDbClient().from("curators").select("user_id,email,role").eq("active", true).order("email");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listSourcesWithPages() {
  const { data, error } = await getAdminDbClient().from("sources").select("id,name,short_name,website_url,publications_url").order("short_name");
  if (error) throw new Error(`Could not read sources (has migration 0012 been run?): ${error.message}`);
  return data ?? [];
}
