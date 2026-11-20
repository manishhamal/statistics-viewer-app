import { getDictionary } from "@/i18n/dictionaries";
import { langFrom, type LangParams } from "@/i18n/server";

export default async function AboutPage({ params }: LangParams) {
  const t = getDictionary(await langFrom(params)).about;
  return (
    <div className="max-w-4xl mx-auto px-5 py-16 space-y-8">
      <p className="eyebrow-label">{t.eyebrow}</p>
      <h1 className="text-4xl font-bold">{t.title}</h1>
      <p className="text-lg leading-relaxed text-muted">{t.intro}</p>
      <div className="surface-panel p-6">
        <h2 className="font-bold">{t.noteTitle}</h2>
        <p className="mt-2 text-sm text-muted">{t.note}</p>
      </div>
    </div>
  );
}
