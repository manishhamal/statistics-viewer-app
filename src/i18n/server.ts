import { DEFAULT_LANG, isLang, type Lang } from "./config";

export type LangParams = { params: Promise<{ lang: string }> };

/** Reads the [lang] route param (already validated by the layout). */
export async function langFrom(params: Promise<{ lang: string }>): Promise<Lang> {
  const { lang } = await params;
  return isLang(lang) ? lang : DEFAULT_LANG;
}
