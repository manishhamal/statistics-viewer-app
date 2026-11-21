"use client";
import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createTaskAction,
  reassignTaskAction,
  setSourcePageAction,
  setTaskStatusAction,
  type TaskActionResult,
} from "@/actions/taskActions";
import { Field, Notice, inputClass } from "@/components/admin/ui";

type Person = { user_id: string; email: string; role: string };
type SourceRow = { id: string; name: string; short_name: string; website_url: string; publications_url: string | null };

const primary = "rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-on-primary disabled:opacity-60";
const secondary = "rounded-lg border border-line px-4 py-2.5 text-sm font-semibold hover:bg-paper disabled:opacity-60";

function useAct() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  function act(fn: () => Promise<TaskActionResult>, message = "", after?: (r: TaskActionResult) => void) {
    setError("");
    setOk("");
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) return setError(r.error);
      setOk(message);
      after?.(r);
      router.refresh();
    });
  }
  return { pending, error, ok, act };
}

export function NewTaskForm({ people, sources }: { people: Person[]; sources: SourceRow[] }) {
  const { pending, error, ok, act } = useAct();
  const [kind, setKind] = useState<"document" | "note">("document");

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = Object.fromEntries(new FormData(form));
    act(() => createTaskAction({ ...d, kind }), "Task created and assigned.", () => form.reset());
  }

  return (
    <form onSubmit={submit} className="surface-panel p-6 space-y-5">
      <h2 className="text-xl font-bold">New task</h2>
      {error && <Notice kind="error">{error}</Notice>}
      {ok && <Notice kind="success">{ok}</Notice>}

      <div className="flex gap-2 text-sm" role="radiogroup" aria-label="Task type">
        {(["document", "note"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={`rounded-lg px-3 py-2 font-semibold ${kind === k ? "bg-primary text-on-primary" : "border border-line"}`}
          >
            {k === "document" ? "Document task" : "Note task"}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">
        {kind === "document"
          ? "A report to add: the curator finds the PDF, registers it, enters its values, and another curator reviews them."
          : "Any other job, e.g. recheck a figure. The curator writes what they did and marks it done."}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="What needs doing" hint={kind === "document" ? 'e.g. "Current Macroeconomic and Financial Situation"' : undefined}>
          <input name="title" required minLength={3} className={inputClass} />
        </Field>
        <Field label="Assign to">
          <select name="assigneeId" required defaultValue="" className={inputClass}>
            <option value="" disabled>Choose a curator…</option>
            {people.map((p) => (
              <option key={p.user_id} value={p.user_id}>{p.email}{p.role === "owner" ? " (owner)" : ""}</option>
            ))}
          </select>
        </Field>
        <Field label={kind === "document" ? "Source" : "Source (optional)"}>
          <select name="sourceId" required={kind === "document"} defaultValue="" className={inputClass}>
            <option value="">{kind === "document" ? "Choose a source…" : "None"}</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>{s.short_name} — {s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Period" hint='e.g. "Ashwin 2082" or "FY 2081/82". Used to find the right edition.'>
          <input name="periodHint" className={inputClass} />
        </Field>
        {kind === "document" && (
          <Field label="Link (optional)" hint="The PDF, or the page that lists it. Leave empty and the curator will search.">
            <input name="docLink" type="url" placeholder="https://…" className={inputClass} />
          </Field>
        )}
        <Field label="Due date (optional)">
          <input name="dueDate" type="date" className={inputClass} />
        </Field>
      </div>
      <Field label="Notes for the curator (optional)">
        <textarea name="notes" rows={3} className={inputClass} />
      </Field>
      <button disabled={pending} className={primary}>{pending ? "Saving…" : "Create task"}</button>
    </form>
  );
}

export function SourcePages({ sources }: { sources: SourceRow[] }) {
  const { pending, error, ok, act } = useAct();
  return (
    <section className="surface-panel p-6 space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">Where to search each source</h2>
        <p className="text-sm text-muted">
          Pages that list the publisher&apos;s reports, one per line. &quot;Find document&quot; searches them. A page listing reports
          works, and a sitemap (an address ending in .xml) works best where a site has one. Set once per source.
        </p>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
      {ok && <Notice kind="success">{ok}</Notice>}
      {sources.map((s) => (
        <form
          key={s.id}
          onSubmit={(e) => {
            e.preventDefault();
            const url = String(new FormData(e.currentTarget).get("url") ?? "");
            act(() => setSourcePageAction(s.id, url), `Saved the page for ${s.short_name}.`);
          }}
          className="grid gap-2 sm:grid-cols-[6rem_1fr_auto] items-start"
        >
          <span className="pt-2 text-sm font-semibold">{s.short_name}</span>
          <textarea
            name="url"
            rows={Math.max(2, (s.publications_url ?? "").split("\n").length)}
            defaultValue={s.publications_url ?? ""}
            placeholder={`${s.website_url}/…`}
            className={`${inputClass} !mt-0 font-mono text-xs`}
          />
          <button disabled={pending} className={secondary}>Save</button>
        </form>
      ))}
    </section>
  );
}

export function OwnerTaskControls({
  taskId,
  status,
  assigneeId,
  people,
}: {
  taskId: string;
  status: "open" | "blocked" | "done" | "cancelled";
  assigneeId: string | null;
  people: Person[];
}) {
  const { pending, error, act } = useAct();
  const [link, setLink] = useState("");
  return (
    <section className="surface-panel p-5 space-y-4">
      <h2 className="font-bold">Owner</h2>
      {error && <Notice kind="error">{error}</Notice>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const to = String(new FormData(e.currentTarget).get("assigneeId") ?? "");
          act(() => reassignTaskAction(taskId, to));
        }}
        className="flex flex-wrap gap-2"
      >
        <select name="assigneeId" defaultValue={assigneeId ?? ""} className={`${inputClass} !mt-0 max-w-xs`}>
          {people.map((p) => (
            <option key={p.user_id} value={p.user_id}>{p.email}</option>
          ))}
        </select>
        <button disabled={pending} className={secondary}>Reassign</button>
      </form>

      {status === "open" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => confirm("Cancel this task?") && act(() => setTaskStatusAction(taskId, "cancelled"))}
          className="rounded-lg border border-red-300 dark:border-red-400 px-4 py-2.5 text-sm font-semibold text-red-700 dark:text-red-300"
        >
          Cancel task
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(() => setTaskStatusAction(taskId, "open", { docLink: link || undefined }), "", () => setLink(""));
          }}
          className="space-y-2"
        >
          <label className="block text-sm font-semibold">
            Reopen{status === "blocked" ? ", optionally with the right link" : ""}
            <input value={link} onChange={(e) => setLink(e.target.value)} type="url" placeholder="https://… (optional)" className={inputClass} />
          </label>
          <button disabled={pending} className={primary}>Reopen task</button>
        </form>
      )}
    </section>
  );
}
