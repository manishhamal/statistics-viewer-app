import type { Observation } from "@/server/db/types";
import type { Lang } from "@/i18n/config";
import { periodShortLabel } from "@/i18n/format";
import { comparePeriods } from "@/lib/periods";

export function buildChartSpec(rows: Observation[], lang: Lang) {
  const sorted = [...rows].sort((a, b) => (a.period && b.period ? comparePeriods(a.period, b.period) : 0));
  return {
    data: sorted.map((row) => ({ period: periodShortLabel(row.period, lang), value: Number(row.value) })),
    xKey: "period",
    yKey: "value",
  };
}
