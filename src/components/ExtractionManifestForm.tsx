"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { manifestInputSchema, firstIssue } from "@/lib/adminSchemas";
import { Field, Notice, inputClass, postJson } from "@/components/admin/ui";

type Doc = { id: string; title: string; period_covered: string; file_url: string | null };
type Indicator = { code: string; name: string; unit: string; scale: string };
type Period = { id: string; label: string; label_ad: string; type: string };

type Row = {
  key: number;
  indicatorCode: string;
  periodId: string;
  value: string;
  unit: string;
  scale: string;
  pageNumber: string;
  tableRef: string;
  isProvisional: boolean;
};

let nextKey = 1;
const blankRow = (prev?: Row): Row => ({
  key: nextKey++,
  indicatorCode: prev?.indicatorCode ?? "",
  periodId: prev?.periodId ?? "",
  value: "",
  unit: prev?.unit ?? "",
  scale: prev?.scale ?? "",
  pageNumber: prev?.pageNumber ?? "",
  tableRef: prev?.tableRef ?? "",
  isProvisional: false,
});

const cell = "w-full rounded-md border border-line bg-surface p-2 text-sm";

export default function ExtractionManifestForm({
  documents,
  indicators,
  periods,
  initialDocumentId,
}: {
  documents: Doc[];
  indicators: Indicator[];
  periods: Period[];
  initialDocumentId?: string;
}) {
  const router = useRouter();
  const [documentId, setDocumentId] = useState(
    initialDocumentId && documents.some((d) => d.id === initialDocumentId) ? initialDocumentId : "",
  );
  const [rows, setRows] = useState<Row[]>(() => [blankRow()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const doc = documents.find((d) => d.id === documentId);

  function update(key: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function chooseIndicator(key: number, code: string) {
    const ind = indicators.find((i) => i.code === code);
    update(key, { indicatorCode: code, unit: ind?.unit ?? "", scale: ind?.scale ?? "" });
  }

  async function submit() {
    setError("");
    setSuccess("");
    const payload = {
      documentId,
      rows: rows.map((r) => ({
        indicatorCode: r.indicatorCode,
        periodId: r.periodId,
        value: r.value.trim() === "" ? NaN : Number(r.value.replace(/,/g, "")),
        unit: r.unit,
        scale: r.scale,
        pageNumber: r.pageNumber.trim() === "" ? NaN : Number(r.pageNumber),
        tableRef: r.tableRef.trim() || undefined,
        isProvisional: r.isProvisional,
      })),
    };
    const parsed = manifestInputSchema.safeParse(payload);
    if (!parsed.success) {
      // Turn "rows.0.value: …" into "Row 1 value: …".
      setError(firstIssue(parsed.error).replace(/^rows\.(\d+)\./, (_, i) => `Row ${Number(i) + 1} `));
      return;
    }
    setBusy(true);
    try {
      const result = await postJson("/api/admin/ingestion/stage", parsed.data);
      setSuccess(`Staged ${result.count} value(s). They are private until approved in the review queue.`);
      setRows([blankRow(rows[rows.length - 1])]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Staging failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="surface-panel p-6 space-y-4">
        <Field label="Source document" hint="Values must come from a registered PDF.">
          <select value={documentId} onChange={(e) => setDocumentId(e.target.value)} className={inputClass}>
            <option value="">Choose a document…</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>{d.title} ({d.period_covered})</option>
            ))}
          </select>
        </Field>
        {doc?.file_url && (
          <a href={doc.file_url} target="_blank" rel="noreferrer" className="inline-block text-sm text-link">
            Open the PDF to read values from ↗
          </a>
        )}
        {documents.length === 0 && (
          <p className="text-sm text-muted">
            No documents yet. <Link href="/admin/ingestion" className="text-link">Register one first →</Link>
          </p>
        )}
      </section>

      <section className="surface-panel p-6 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold">Values ({rows.length})</h2>
          <p className="text-xs text-muted">
            Period missing? <Link href="/admin/ingestion/periods" className="text-link">Create it →</Link>
          </p>
        </div>
        {error && <Notice kind="error">{error}</Notice>}
        {success && (
          <Notice kind="success">
            {success} <Link href="/admin/review" className="font-semibold underline">Go to review queue →</Link>
          </Notice>
        )}

        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={r.key} className="rounded-lg border border-line p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted">Row {i + 1}</span>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                    className="text-xs text-red-700 dark:text-red-300"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-xs font-semibold lg:col-span-2">Indicator
                  <select value={r.indicatorCode} onChange={(e) => chooseIndicator(r.key, e.target.value)} className={cell}>
                    <option value="">Choose…</option>
                    {indicators.map((ind) => <option key={ind.code} value={ind.code}>{ind.name}</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold">Period
                  <select value={r.periodId} onChange={(e) => update(r.key, { periodId: e.target.value })} className={cell}>
                    <option value="">Choose…</option>
                    {periods.map((p) => <option key={p.id} value={p.id}>{p.label} ({p.label_ad})</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold">Value
                  <input inputMode="decimal" value={r.value} onChange={(e) => update(r.key, { value: e.target.value })} placeholder="e.g. 5829600.5" className={cell} />
                </label>
                <label className="text-xs font-semibold">Unit
                  <input value={r.unit} onChange={(e) => update(r.key, { unit: e.target.value })} className={cell} />
                </label>
                <label className="text-xs font-semibold">Scale
                  <select value={r.scale} onChange={(e) => update(r.key, { scale: e.target.value })} className={cell}>
                    <option value="">Choose…</option>
                    {["units", "thousands", "millions", "billions"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold">PDF page
                  <input inputMode="numeric" value={r.pageNumber} onChange={(e) => update(r.key, { pageNumber: e.target.value })} className={cell} />
                </label>
                <label className="text-xs font-semibold">Table (optional)
                  <input value={r.tableRef} onChange={(e) => update(r.key, { tableRef: e.target.value })} placeholder="e.g. Table 5" className={cell} />
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={r.isProvisional} onChange={(e) => update(r.key, { isProvisional: e.target.checked })} />
                Provisional or preliminary figure
              </label>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setRows((rs) => [...rs, blankRow(rs[rs.length - 1])])} className="rounded-lg border border-ink px-4 py-2.5 text-sm font-bold">
            + Add row
          </button>
          <button type="button" disabled={busy} onClick={submit} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-on-primary disabled:opacity-60">
            {busy ? "Staging…" : "Stage for review"}
          </button>
        </div>
      </section>
    </div>
  );
}
