import Link from "next/link";
import { getIndicators } from "@/server/stats/queries";
import { href } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { frequencyLabel, localized } from "@/i18n/format";
import { langFrom, type LangParams } from "@/i18n/server";

export const revalidate = 300; // refresh the catalogue every 5 minutes

export default async function ExplorePage({ params }: LangParams) {
  const lang = await langFrom(params);
  const t = getDictionary(lang).explore;
  const indicators = await getIndicators();
  return (
    <div className="max-w-6xl mx-auto px-5 py-16 space-y-8">
      <p className="eyebrow-label">{t.eyebrow}</p>
      <h1 className="text-4xl font-bold">{t.title}</h1>
      <div className="grid md:grid-cols-3 gap-5">
        {indicators.map((ind) => (
          <Link key={ind.id} href={href(lang, `/indicators/${ind.code}`)} className="surface-panel p-5 hover:border-link">
            <p className="text-xs uppercase text-muted">{frequencyLabel(ind.frequency, lang)}</p>
            <h2 className="mt-3 font-bold">{localized(ind, "name", lang)}</h2>
            <p className="mt-2 text-sm text-muted">{localized(ind, "description", lang) || t.defaultDescription}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
