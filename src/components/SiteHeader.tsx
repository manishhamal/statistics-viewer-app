import type { ReactNode } from "react";
import Link from "next/link";
import { href, type Lang } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export default function SiteHeader({ lang, toggle }: { lang: Lang; toggle?: ReactNode }) {
  const t = getDictionary(lang);
  const links: [string, string][] = [
    ["/explore", t.nav.explore],
    ["/search", t.nav.search],
    ["/sources", t.nav.sources],
    ["/about", t.nav.about],
  ];
  return (
    <header className="sticky top-0 z-50 bg-[#10283f] border-b border-white/10">
      <div className="max-w-6xl mx-auto px-5 min-h-[72px] py-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <Link href={href(lang)} className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-md bg-[#d8f35b] text-[#10283f] font-bold flex items-center justify-center">ने</span>
          <span>
            <strong className="block text-white">{t.brand.name}</strong>
            <small className="text-[10px] uppercase tracking-widest text-slate-300">{t.brand.tagline}</small>
          </span>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex flex-wrap gap-1 text-sm font-semibold text-slate-200">
            {links.map(([path, label]) => (
              <Link key={path} href={href(lang, path)} className="px-3 py-2 rounded-md hover:text-[#d8f35b] hover:bg-white/10">
                {label}
              </Link>
            ))}
          </nav>
          {toggle}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ lang }: { lang: Lang }) {
  const t = getDictionary(lang);
  return (
    <footer className="bg-[#071827] text-slate-300 border-t border-white/10 py-10 text-center text-xs">
      <div className="max-w-6xl mx-auto px-5 space-y-2">
        <p>{t.footer.line1}</p>
        <p className="text-slate-400">{t.footer.line2}</p>
      </div>
    </footer>
  );
}
