"use client";
import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Search } from "lucide-react";
import {
  blockTaskAction,
  chooseLinkAction,
  completeNoteTaskAction,
  findDocumentAction,
  type TaskActionResult,
} from "@/actions/taskActions";
import type { FindResult } from "@/server/tasks/findDocument";
import type { DocumentStep } from "@/server/tasks/taskData";
import { Notice, inputClass } from "@/components/admin/ui";

export interface WorkTask {
  id: string;
  kind: "document" | "note";
  step: DocumentStep | null;
  status: "open" | "blocked" | "done" | "cancelled";
  docLink: string | null;
  documentId: string | null;
  sourceName: string | null;
  sourcePage: string | null;
  /** True when every value waiting for review was entered by the viewer. */
  viewerEnteredAll: boolean;
}

const primary = "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-on-primary disabled:opacity-60";
const secondary = "inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold hover:bg-paper disabled:opacity-60";

export default function TaskWorkPanel({ task, canWork }: { task: WorkTask; canWork: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [found, setFound] = useState<FindResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [pasted, setPasted] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [reason, setReason] = useState("");
  const [result, setResult] = useState("");

  function act(fn: () => Promise<TaskActionResult>, after?: () => void) {
    setError("");
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) return setError(r.error);
      after?.();
      router.refresh();
    });
  }

  async function find() {
    setError("");
    setSearching(true);
    const r = await findDocumentAction(task.id);
    setSearching(false);
    if (!r.ok) return setError(r.error);
    setFound(r.result);
  }

  function submitPasted(e: FormEvent) {
    e.preventDefault();
    act(() => chooseLinkAction(task.id, pasted), () => setPasted(""));
  }

  if (!canWork) {
    return <p className="text-sm text-muted">This task is assigned to someone else.</p>;
  }
  if (task.status === "cancelled") return null;

  const blockForm = (
    <div className="space-y-2">
      {!blocking ? (
        <button type="button" onClick={() => setBlocking(true)} className="text-sm font-semibold text-link">
          Can&apos;t do this? Tell the owner →
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(() => blockTaskAction(task.id, reason), () => setBlocking(false));
          }}
          className="space-y-2 rounded-lg border border-line p-3"
        >
          <label className="block text-sm font-semibold">
            What is the problem?
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="e.g. Not published yet / page is down / two versions, which one?"
              className={inputClass}
            />
          </label>
          <div className="flex gap-2">
            <button disabled={pending} className={primary}>Send to owner</button>
            <button type="button" onClick={() => setBlocking(false)} className={secondary}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );

  // ----- note task -----
  if (task.kind === "note") {
    if (task.status === "done") return null;
    return (
      <div className="space-y-4">
        {error && <Notice kind="error">{error}</Notice>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(() => completeNoteTaskAction(task.id, result));
          }}
          className="space-y-3"
        >
          <label className="block text-sm font-semibold">
            What did you do?
            <textarea value={result} onChange={(e) => setResult(e.target.value)} required rows={3} className={inputClass} />
          </label>
          <button disabled={pending} className={primary}>Mark as done</button>
        </form>
        {task.status !== "blocked" && blockForm}
      </div>
    );
  }

  // ----- document task -----
  return (
    <div className="space-y-5">
      {error && <Notice kind="error">{error}</Notice>}

      {task.step === "find" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={find} disabled={searching || pending} className={primary}>
              <Search className="h-4 w-4" aria-hidden /> {searching ? "Searching… (up to 30 s)" : found ? "Search again" : "Find document"}
            </button>
            {task.sourcePage && (
              <a href={task.sourcePage} target="_blank" rel="noreferrer" className={secondary}>
                Open {task.sourceName ?? "source"} publications <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            )}
          </div>

          {found && (
            <div className="space-y-3">
              {found.message && <p className="rounded-lg bg-paper p-3 text-sm">{found.message}</p>}
              {found.candidates.map((c) => (
                <div key={c.url} className={`rounded-lg border p-3 space-y-2 ${c.best ? "border-good" : "border-line"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold leading-snug">{c.label}</p>
                    {c.best && <span className="shrink-0 rounded bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">best match</span>}
                  </div>
                  {c.context && <p className="text-xs text-muted line-clamp-2">{c.context}</p>}
                  <p className="text-xs break-all text-muted">{c.url}</p>
                  <div className="flex flex-wrap gap-2">
                    <a href={c.url} target="_blank" rel="noreferrer" className={secondary}>
                      Open to check <ExternalLink className="h-4 w-4" aria-hidden />
                    </a>
                    <button type="button" disabled={pending} onClick={() => act(() => chooseLinkAction(task.id, c.url))} className={primary}>
                      Use this PDF
                    </button>
                  </div>
                </div>
              ))}
              {found.scanned.length > 0 && <p className="text-xs text-muted">Searched {found.scanned.length} page(s) on the source&apos;s site.</p>}
            </div>
          )}

          <form onSubmit={submitPasted} className="space-y-2">
            <label className="block text-sm font-semibold">
              Or paste the PDF link
              <input value={pasted} onChange={(e) => setPasted(e.target.value)} type="url" required placeholder="https://…/report.pdf" className={inputClass} />
            </label>
            <button disabled={pending} className={secondary}>Use this link</button>
          </form>
          {blockForm}
        </div>
      )}

      {task.step === "register" && (
        <div className="space-y-3">
          {task.docLink && (
            <p className="text-sm break-all">
              Chosen link:{" "}
              <a href={task.docLink} target="_blank" rel="noreferrer" className="text-link">{task.docLink}</a>
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Link href={`/admin/ingestion?task=${task.id}`} className={primary}>Register this document →</Link>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer font-semibold text-link">Wrong PDF? Choose a different one</summary>
            <form onSubmit={submitPasted} className="mt-2 space-y-2">
              <input value={pasted} onChange={(e) => setPasted(e.target.value)} type="url" required placeholder="https://…/report.pdf" className={inputClass} />
              <div className="flex gap-2">
                <button disabled={pending} className={secondary}>Use this link</button>
                <button type="button" disabled={searching} onClick={find} className={secondary}>Search again</button>
              </div>
            </form>
            {found && found.candidates.length > 0 && (
              <ul className="mt-2 space-y-1">
                {found.candidates.map((c) => (
                  <li key={c.url}>
                    <button type="button" className="text-left text-link" onClick={() => act(() => chooseLinkAction(task.id, c.url))}>
                      {c.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </details>
          {blockForm}
        </div>
      )}

      {task.step === "extract" && task.documentId && (
        <div className="flex flex-wrap gap-3">
          <Link href={`/admin/ingestion/extract?document=${task.documentId}&task=${task.id}`} className={primary}>Enter the values →</Link>
          {task.docLink && (
            <a href={task.docLink} target="_blank" rel="noreferrer" className={secondary}>
              Open the PDF <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          )}
        </div>
      )}

      {task.step === "review" && task.documentId && (
        <div className="flex flex-wrap gap-3">
          {task.viewerEnteredAll ? (
            <p className="text-sm text-muted">Nothing for you to do until another curator reviews the values.</p>
          ) : (
            <Link href={`/admin/review?document=${task.documentId}`} className={primary}>Review the values →</Link>
          )}
          <Link href={`/admin/ingestion/extract?document=${task.documentId}&task=${task.id}`} className={secondary}>Add more values</Link>
        </div>
      )}
    </div>
  );
}
