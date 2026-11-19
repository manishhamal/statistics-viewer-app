import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { LOCALES, isLang } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import SiteHeader, { SiteFooter } from "@/components/SiteHeader";
import LanguageToggle from "@/components/LanguageToggle";

// Root layout for the public site. Both languages are pre-rendered and cached
// separately (/en/... and /ne/...), so switching language is just a link.
// Unknown languages are rejected below with notFound(). (dynamicParams=false is not
// used because it would also block indicator pages that are rendered on first visit.)
export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const t = getDictionary(lang);
  return {
    title: t.meta.title,
    description: t.meta.description,
    alternates: { languages: { en: "/en", ne: "/ne" } },
  };
}

export default async function PublicLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = getDictionary(lang);
  return (
    <html lang={lang}>
      <body className="min-h-screen flex flex-col bg-[#f5f6f0] text-[#10283f]">
        <SiteHeader lang={lang} toggle={<LanguageToggle lang={lang} title={t.toggle.title} />} />
        <main className="flex-1">{children}</main>
        <SiteFooter lang={lang} />
      </body>
    </html>
  );
}
