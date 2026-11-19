"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PERIOD_TYPES, periodInputSchema, firstIssue } from "@/lib/adminSchemas";
import { Field, Notice, inputClass, postJson } from "@/components/admin/ui";

const HINTS: Record<string, { label: string; ad: string }> = {
  fiscal_year: { label: "e.g. 2081/82 (BS fiscal year)", ad: "e.g. 2024/25" },
  month: { label: "e.g. Asoj 2083 or September 2026", ad: "e.g. September 2026" },
  quarter: { label: "e.g. Q1 2081/82", ad: "e.g. Q3 2024" },
  calendar_year: { label: "e.g. 2025", ad: "e.g. 2025" },
};

export default function CreatePeriodForm() {
  const router = useRouter();
  const [type, setType] = useState<string>("fiscal_year");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const parsed = periodInputSchema.safeParse(Object.fromEntries(new FormData(form)));
    if (!parsed.success) {
      setError(firstIssue(parsed.error));
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const period = await postJson("/api/admin/ingestion/periods", parsed.data);
      setSuccess(`Created ${period.type.replace("_", " ")} "${period.label}".`);
      form.reset();
      setType(parsed.data.type);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create the period.");
    } finally {
      setBusy(false);
    }
  }

  const hint = HINTS[type] ?? HINTS.fiscal_year;
  return (
    <form onSubmit={submit} className="surface-panel p-6 space-y-5">
      <h2 className="text-xl font-bold">New period</h2>
      {error && <Notice kind="error">{error}</Notice>}
      {success && <Notice kind="success">{success}</Notice>}
      <Field label="Type">
        <select name="type" value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
          {PERIOD_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
        </select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Label (as in the report)" hint={hint.label}>
          <input name="label" required className={inputClass} />
        </Field>
        <Field label="AD label" hint={hint.ad}>
          <input name="label_ad" required className={inputClass} />
        </Field>
        <Field label="Start date (AD)">
          <input name="start_date" type="date" required className={inputClass} />
        </Field>
        <Field label="End date (AD)">
          <input name="end_date" type="date" required className={inputClass} />
        </Field>
      </div>
      <button disabled={busy} className="rounded-lg bg-[#10283f] px-4 py-3 font-bold text-white disabled:opacity-60">
        {busy ? "Creating…" : "Create period"}
      </button>
    </form>
  );
}
