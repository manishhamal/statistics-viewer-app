import { notFound } from "next/navigation";
import { getIndicatorByCode, getPublishedObservations } from "@/server/stats/queries";
import { buildChartSpec } from "@/server/stats/chartSpec";
import StatChart from "@/components/StatChart";
import IndicatorTable from "@/components/IndicatorTable";
import { getDictionary } from "@/i18n/dictionaries";
import { frequencyLabel, localized, scaleUnitLabel } from "@/i18n/format";
import type { Lang } from "@/i18n/config";
import { langFrom } from "@/i18n/server";

export const revalidate = 300;
// Rendered on first visit, then cached per language and refreshed every 5 minutes.
export async function generateStaticParams() {
  return [];
}

export default async function IndicatorPage({ params }: { params: Promise<{ lang: string; code: string }> }) {
  const [lang, { code }] = await Promise.all([langFrom(params), params]);
  const indicator = await getIndicatorByCode(code);
  if (!indicator) notFound();
  const t = getDictionary(lang as Lang).indicator;
  const rows = await getPublishedObservations(indicator.id);
  const spec = buildChartSpec(rows, lang);

  return (
    <div className="max-w-6xl mx-auto px-5 py-16 space-y-8">
      <p className="eyebrow-label">{t.eyebrow}</p>
      <div>
        <h1 className="text-4xl font-bold">{localized(indicator, "name", lang)}</h1>
        <p className="mt-2 text-muted">{localized(indicator, "description", lang) || t.defaultDescription}</p>
        <p className="mt-1 text-sm text-muted">
          {t.unit}: {scaleUnitLabel(indicator.unit, indicator.scale, lang)} · {t.frequency}: {frequencyLabel(indicator.frequency, lang)}
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="surface-panel p-6 text-muted">{t.noData}</p>
      ) : (
        <>
          <StatChart data={spec.data} lang={lang} />
          <IndicatorTable rows={rows} lang={lang} t={t} />
        </>
      )}
    </div>
  );
}
