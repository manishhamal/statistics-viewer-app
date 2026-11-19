import SearchBox from "@/components/SearchBox";
import { getDictionary } from "@/i18n/dictionaries";
import { langFrom, type LangParams } from "@/i18n/server";

export default async function SearchPage({ params }: LangParams) {
  const lang = await langFrom(params);
  const t = getDictionary(lang).search;
  return (
    <div className="max-w-5xl mx-auto px-5 py-16 space-y-8">
      <p className="eyebrow-label">{t.eyebrow}</p>
      <h1 className="text-4xl font-bold">{t.title}</h1>
      <p className="max-w-2xl text-[#617080]">{t.intro}</p>
      <SearchBox lang={lang} t={t} />
    </div>
  );
}
