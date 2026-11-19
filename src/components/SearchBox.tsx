"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { formatValue } from "@/lib/numbers";
import { comparePeriods } from "@/lib/periods";
import type { Indicator, Observation } from "@/server/db/types";

type SearchResult = { answer?: string; error?: string; rows?: Observation[]; indicator?: Indicator };

export default function SearchBox() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      setResult(await response.json());
    } catch {
      setResult({ error: "Search is unavailable. Check the server configuration." });
    } finally {
      setLoading(false);
    }
  }

  const rows = [...(result?.rows ?? [])].sort((a, b) =>
    a.period && b.period ? comparePeriods(a.period, b.period) : 0,
  );

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="flex gap-3">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question in plain language"
          className="flex-1 rounded-lg border border-[#dce2e4] bg-white px-4 py-3"
        />
        <button
          disabled={loading || question.length < 2}
          className="rounded-lg bg-[#10283f] px-5 py-3 font-bold text-white disabled:opacity-50"
        >
          {loading ? "Searching…" : "Ask"}
        </button>
      </form>

      {result && (
        <div className="rounded-xl border border-[#dce2e4] bg-white p-5 space-y-4">
          <p className="whitespace-pre-wrap">{result.answer || result.error || "No answer returned."}</p>

          {rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#dce2e4] text-[#617080]">
                  <tr>
                    <th className="py-2 pr-4 font-semibold">Period</th>
                    <th className="py-2 pr-4 font-semibold text-right">Value</th>
                    <th className="py-2 pr-4 font-semibold">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-[#eef1f2] last:border-0">
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {row.period?.label ?? "—"}
                        {row.is_provisional && <span className="ml-2 text-xs text-[#617080]">provisional</span>}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums whitespace-nowrap">
                        {formatValue(row.value, row.unit, row.scale)}
                      </td>
                      <td className="py-2 pr-4 text-[#617080]">
                        {row.document?.title ?? "—"}
                        {row.page_number ? `, p. ${row.page_number}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.indicator && (
            <Link href={`/indicators/${result.indicator.code}`} className="inline-block font-semibold text-[#2c6eaa]">
              View {result.indicator.name} chart →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
