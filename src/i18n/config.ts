export const LOCALES = ["en", "ne"] as const;
export type Lang = (typeof LOCALES)[number];
export const DEFAULT_LANG: Lang = "en";
export const LANG_COOKIE = "lang";

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Prefixes an internal path with the language: href("ne", "/explore") -> "/ne/explore". */
export function href(lang: Lang, path = "/"): string {
  return path === "/" ? `/${lang}` : `/${lang}${path}`;
}

/** Fills {placeholders} in a dictionary string. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => (key in vars ? String(vars[key]) : `{${key}}`));
}
