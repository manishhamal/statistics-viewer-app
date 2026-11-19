"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LANG_COOKIE, type Lang } from "@/i18n/config";

// Two-option language switch: both languages are always visible and the current one
// is highlighted. Uses only the path, so it is part of the pre-rendered HTML.
const OPTIONS: { lang: Lang; label: string; name: string }[] = [
  { lang: "en", label: "EN", name: "English" },
  { lang: "ne", label: "ने", name: "नेपाली" },
];

export default function LanguageToggle({ lang, title }: { lang: Lang; title: string }) {
  const pathname = usePathname() ?? `/${lang}`;
  const rest = pathname.replace(/^\/(en|ne)(?=\/|$)/, "");

  return (
    <div role="group" aria-label={title} title={title} className="inline-flex rounded-md border border-white/25 p-0.5 text-sm font-semibold">
      {OPTIONS.map((option) => {
        const active = option.lang === lang;
        return (
          <Link
            key={option.lang}
            href={`/${option.lang}${rest}`}
            hrefLang={option.lang}
            lang={option.lang}
            aria-current={active ? "true" : undefined}
            aria-label={option.name}
            onClick={() => {
              document.cookie = `${LANG_COOKIE}=${option.lang}; path=/; max-age=31536000; samesite=lax`;
            }}
            className={`rounded px-2.5 py-1 transition-colors ${
              active ? "bg-[#d8f35b] text-[#10283f]" : "text-white hover:text-[#d8f35b]"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
