"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CALENDAR_SYSTEMS, COVERAGE_TYPES, DOC_TYPES } from "@/lib/adminSchemas";
import { Field, Notice, inputClass } from "@/components/admin/ui";

type Source = { id: string; name: string; short_name: string };

const label = (s: string) => s.replace(/_/g, " ");

/** Values carried over from a task, so the curator only checks them. */
export interface RegistrationPrefill {
  taskId: string;
  taskTitle: string;
  sourceId: string;
  title: string;
  periodCovered: string;
  fileUrl: string;
}

export default function DocumentRegistrationForm({ sources, prefill }: { sources: Source[]; prefill?: RegistrationPrefill }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File && file.size > 0) && !String(data.get("fileUrl") ?? "").trim()) {
      setError("Upload the PDF or paste its official link.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/ingestion/documents", { method: "POST", body: data });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Request failed (HTTP ${res.status}).`);
      if (body.taskId) {
        // Back to the task, which now shows the next step.
        router.push(`/admin/tasks/${body.taskId}`);
        router.refresh();
        return;
      }
      setSuccess(
        body.duplicate
          ? `This PDF is already registered as "${body.title}". Nothing new was added.`
          : `Registered "${body.title}". Next: stage its values.`,
      );
      if (!body.duplicate) form.reset();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="surface-panel p-6 space-y-5">
      <h2 className="text-xl font-bold">Register a PDF</h2>
      {prefill && (
        <>
          <input type="hidden" name="taskId" value={prefill.taskId} />
          <p className="rounded-lg bg-paper p-3 text-sm">
            For task: <strong>{prefill.taskTitle}</strong>. Filled in from the task. Check each field against the PDF&apos;s cover, then register.
          </p>
        </>
      )}
      {error && <Notice kind="error">{error}</Notice>}
      {success && <Notice kind="success">{success}</Notice>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Publisher">
          <select name="sourceId" required className={inputClass} defaultValue={prefill?.sourceId ?? ""}>
            <option value="" disabled>Choose a source…</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>{s.short_name} — {s.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Document title" hint="Exactly as printed on the cover.">
          <input name="title" required minLength={3} defaultValue={prefill?.title} className={inputClass} />
        </Field>
        <Field label="Document type">
          <select name="docType" required className={inputClass} defaultValue="monthly_report">
            {DOC_TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
          </select>
        </Field>
        <Field label="Publication date">
          <input name="publicationDate" type="date" required className={inputClass} />
        </Field>
        <Field label="Period covered" hint='As the report states it, e.g. "FY 2080/81" or "September 2026".'>
          <input name="periodCovered" required defaultValue={prefill?.periodCovered} className={inputClass} />
        </Field>
        <Field label="Coverage">
          <select name="coverageType" required className={inputClass} defaultValue="monthly">
            {COVERAGE_TYPES.map((t) => <option key={t} value={t}>{label(t)}</option>)}
          </select>
        </Field>
        <Field label="Calendar used in the report">
          <select name="calendarSystem" required className={inputClass} defaultValue="mixed">
            {CALENDAR_SYSTEMS.map((t) => (
              <option key={t} value={t}>{t === "bs" ? "BS (Bikram Sambat)" : t === "ad" ? "AD (Gregorian)" : label(t)}</option>
            ))}
          </select>
        </Field>
        <Field label="Language">
          <select name="language" className={inputClass} defaultValue="en">
            <option value="en">English</option>
            <option value="ne">Nepali</option>
          </select>
        </Field>
      </div>

      <div className="rounded-lg border border-dashed border-line p-4 space-y-4">
        <p className="text-sm font-semibold">The PDF: upload it, or give its official link (or both)</p>
        <Field label="Upload PDF" hint="Use this if the download from the link fails.">
          <input name="file" type="file" accept="application/pdf,.pdf" className={inputClass} />
        </Field>
        <Field label="Official PDF link" hint="Shown to the public as the source. Downloaded if no file is uploaded.">
          <input name="fileUrl" type="url" defaultValue={prefill?.fileUrl} placeholder="https://www.nrb.org.np/contents/uploads/…pdf" className={inputClass} />
        </Field>
      </div>

      <button disabled={busy} className="rounded-lg bg-primary px-4 py-3 font-bold text-on-primary disabled:opacity-60">
        {busy ? "Registering…" : "Register document"}
      </button>
    </form>
  );
}
