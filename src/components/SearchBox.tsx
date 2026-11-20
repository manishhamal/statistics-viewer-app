"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { comparePeriods } from "@/lib/periods";
import type { Indicator, Observation } from "@/server/db/types";
import { fmt, href, type Lang } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { digits, formatValue, localized, periodLabel } from "@/i18n/format";

type SearchResult = { answer?: string; error?: string; rows?: Observation[]; indicator?: Indicator };

export default function SearchBox({ lang, t }: { lang: Lang; t: Dictionary["search"] }) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(q: string) {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, lang }),
      });
      setResult(await response.json());
    } catch {
      setResult({ error: t.unavailable });
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    ask(question);
  }

  const rows = [...(result?.rows ?? [])].sort((a, b) => (a.period && b.period ? comparePeriods(a.period, b.period) : 0));

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="flex gap-3">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t.placeholder}
          lang={lang}
          className="flex-1 rounded-lg border border-line bg-surface px-4 py-3"
        />
        <button disabled={loading || question.trim().length < 2} className="rounded-lg bg-primary px-5 py-3 font-bold text-on-primary disabled:opacity-50">
          {loading ? t.searching : t.ask}
        </button>
      </form>

      {result && (
        <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
          <p className="whitespace-pre-wrap">{result.answer || result.error || t.noAnswer}</p>

          {rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line text-muted">
                  <tr>
                    <th className="py-2 pr-4 font-semibold">{t.period}</th>
                    <th className="py-2 pr-4 font-semibold text-right">{t.value}</th>
                    <th className="py-2 pr-4 font-semibold">{t.source}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-line-soft last:border-0">
                      <td className="py-2 pr-4 whitespace-nowrap">
                        {periodLabel(row.period, lang)}
                        {row.is_provisional && <span className="ml-2 text-xs text-muted">{t.provisional}</span>}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums whitespace-nowrap">{formatValue(row.value, row.unit, row.scale, lang)}</td>
                      <td className="py-2 pr-4 text-muted">
                        {row.document?.title ?? "—"}
                        {row.page_number ? `, ${fmt(t.page, { page: digits(String(row.page_number), lang) })}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.indicator && (
            <Link href={href(lang, `/indicators/${result.indicator.code}`)} className="inline-block font-semibold text-link">
              {fmt(t.viewChart, { name: localized(result.indicator, "name", lang) })}
            </Link>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4 text-sm text-muted">
        {t.examples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => {
              setQuestion(example);
              ask(example);
            }}
            className="surface-panel p-4 text-left hover:border-link"
          >
            {t.tryPrefix} {example}
          </button>
        ))}
      </div>
    </div>
  );
}
