import type { Observation } from "@/server/db/types";
import type { Lang } from "@/i18n/config";
import { fmt } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { digits, formatNumber, periodLabel, scaleUnitLabel } from "@/i18n/format";
import { comparePeriods } from "@/lib/periods";

export default function IndicatorTable({ rows, lang, t }: { rows: Observation[]; lang: Lang; t: Dictionary["indicator"] }) {
  const sorted = [...rows].sort((a, b) => (a.period && b.period ? comparePeriods(b.period, a.period) : 0)); // newest first
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="min-w-full text-sm">
        <thead className="bg-paper text-left text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="p-4">{t.period}</th>
            <th className="p-4 text-right">{t.value}</th>
            <th className="p-4">{t.unitCol}</th>
            <th className="p-4">{t.evidence}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.id} className="border-t border-line">
              <td className="p-4 whitespace-nowrap">{periodLabel(row.period, lang)}</td>
              <td className="p-4 text-right font-semibold tabular-nums">{formatNumber(row.value, lang)}</td>
              <td className="p-4">{scaleUnitLabel(row.unit, row.scale, lang)}</td>
              <td className="p-4 text-xs text-muted">
                {row.document?.file_url ? (
                  <a href={row.document.file_url} target="_blank" rel="noreferrer" className="text-link">
                    {row.document.title}
                  </a>
                ) : (
                  row.document?.title || t.officialDocument
                )}
                {" · "}
                {fmt(t.page, { page: digits(String(row.page_number ?? "—"), lang) })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
