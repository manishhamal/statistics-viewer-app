"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDictionary } from "@/i18n/dictionaries";

// not-found pages receive no params, so the language is read from the URL.
export default function NotFound() {
  const lang = usePathname()?.startsWith("/ne") ? "ne" : "en";
  const t = getDictionary(lang).notFound;
  return (
    <div className="max-w-3xl mx-auto px-5 py-24 space-y-4">
      <h1 className="text-4xl font-bold">{t.title}</h1>
      <p className="text-muted">{t.text}</p>
      <Link href={`/${lang}`} className="inline-block font-semibold text-link">{t.home}</Link>
    </div>
  );
}
