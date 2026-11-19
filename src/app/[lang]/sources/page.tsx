import { getSourcesWithDocuments } from "@/server/stats/queries";
import { getDictionary } from "@/i18n/dictionaries";
import { localized } from "@/i18n/format";
import { langFrom, type LangParams } from "@/i18n/server";

export const revalidate = 300; // refresh sources every 5 minutes

export default async function SourcesPage({ params }: LangParams) {
  const lang = await langFrom(params);
  const t = getDictionary(lang).sources;
  const sources = await getSourcesWithDocuments();
  return (
    <div className="max-w-5xl mx-auto px-5 py-16 space-y-8">
      <p className="eyebrow-label">{t.eyebrow}</p>
      <h1 className="text-4xl font-bold">{t.title}</h1>
      <div className="grid md:grid-cols-2 gap-5">
        {sources.map((source) => (
          <div key={source.id} className="surface-panel p-5">
            <h2 className="font-bold">{localized(source, "name", lang)}</h2>
            <p className="mt-2 text-sm text-[#617080]">{source.short_name}</p>
            <a className="mt-4 inline-block text-sm text-[#2c6eaa]" href={source.website_url} target="_blank" rel="noreferrer">
              {t.visit}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
