import Link from "next/link";
import { ArrowRight, ShieldCheck, FileCheck, Layers } from "lucide-react";
import { getFeaturedIndicators } from "@/server/stats/queries";
import { href } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { frequencyLabel, localized, unitLabel } from "@/i18n/format";
import { langFrom, type LangParams } from "@/i18n/server";

export const revalidate = 300; // refresh featured data every 5 minutes

export default async function HomePage({ params }: LangParams) {
  const lang = await langFrom(params);
  const t = getDictionary(lang).home;
  const featured = await getFeaturedIndicators();

  return (
    <div>
      <section className="bg-deep text-white">
        <div className="max-w-6xl mx-auto px-5 py-20 grid gap-12 lg:grid-cols-[1.15fr_.85fr] items-end">
          <div className="space-y-6">
            <p className="eyebrow-label !text-lime">{t.eyebrow}</p>
            <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.05]">{t.title}</h1>
            <p className="max-w-2xl text-lg leading-relaxed text-neutral-300">{t.intro}</p>
            <Link href={href(lang, "/search")} className="inline-flex items-center gap-2 rounded-lg bg-lime px-5 py-3 text-sm font-bold text-navy">
              {t.cta} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/[.07] p-6 space-y-5">
            <p className="text-xs uppercase tracking-[.14em] text-neutral-300">{t.builtFor}</p>
            <div className="border-t border-white/15 pt-4">
              <p className="text-2xl font-bold">{t.sourceFirst}</p>
              <p className="text-sm text-neutral-300">{t.sourceFirstText}</p>
            </div>
            <div className="border-t border-white/15 pt-4">
              <p className="text-2xl font-bold">{t.humanVerified}</p>
              <p className="text-sm text-neutral-300">{t.humanVerifiedText}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-5 py-16 space-y-16">
        <section>
          <p className="eyebrow-label">{t.catalogue}</p>
          <div className="flex justify-between items-end gap-4 border-b border-line pb-4">
            <div>
              <h2 className="mt-2 text-2xl font-bold">{t.featured}</h2>
              <p className="text-sm text-muted">{t.featuredText}</p>
            </div>
            <Link href={href(lang, "/explore")} className="text-sm font-bold text-link">{t.exploreAll}</Link>
          </div>
          <div className="grid md:grid-cols-3 gap-5 mt-7">
            {featured.map((ind) => (
              <Link key={ind.id} href={href(lang, `/indicators/${ind.code}`)} className="rounded-xl border border-line bg-surface p-5 hover:border-link">
                <p className="text-[11px] uppercase tracking-wider text-muted">{frequencyLabel(ind.frequency, lang)}</p>
                <h3 className="mt-4 font-bold">{localized(ind, "name", lang)}</h3>
                <p className="mt-4 text-sm text-muted">{localized(ind, "description", lang) || t.defaultDescription}</p>
                <p className="mt-5 pt-4 border-t border-line text-xs text-muted">
                  {t.unit}: {unitLabel(ind.unit, lang)} · {t.viewData}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-8 border-t border-line pt-10">
          <div>
            <FileCheck className="w-6 h-6 text-link" />
            <h3 className="mt-3 font-bold">{t.provenance}</h3>
            <p className="mt-2 text-sm text-muted">{t.provenanceText}</p>
          </div>
          <div>
            <ShieldCheck className="w-6 h-6 text-good" />
            <h3 className="mt-3 font-bold">{t.humanVerified}</h3>
            <p className="mt-2 text-sm text-muted">{t.verifiedText}</p>
          </div>
          <div>
            <Layers className="w-6 h-6 text-warn" />
            <h3 className="mt-3 font-bold">{t.officialOnly}</h3>
            <p className="mt-2 text-sm text-muted">{t.officialOnlyText}</p>
          </div>
        </section>
      </div>
    </div>
  );
}
