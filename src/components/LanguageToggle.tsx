"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Languages } from "lucide-react";
import { LANG_COOKIE, type Lang } from "@/i18n/config";

// One button that switches to the other language on the same page.
export default function LanguageToggle({ lang, label, title }: { lang: Lang; label: string; title: string }) {
  const pathname = usePathname() ?? `/${lang}`;
  const rest = pathname.replace(/^\/(en|ne)(?=\/|$)/, "");
  const other: Lang = lang === "en" ? "ne" : "en";

  return (
    <Link
      href={`/${other}${rest}`}
      hrefLang={other}
      lang={other}
      title={title}
      onClick={() => {
        document.cookie = `${LANG_COOKIE}=${other}; path=/; max-age=31536000; samesite=lax`;
      }}
      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/25 px-3 text-sm font-semibold text-white hover:border-lime hover:text-lime"
    >
      <Languages className="h-4 w-4" aria-hidden />
      {label}
    </Link>
  );
}
