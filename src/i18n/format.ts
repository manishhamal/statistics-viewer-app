import type { Lang } from "./config";

// Language-aware formatting of numbers, units and periods. Pure functions, so they
// work in both server and client components.

const NUMBER_LOCALE: Record<Lang, string> = { en: "en-US", ne: "ne-NP" }; // ne-NP: Devanagari digits, lakh grouping

export function formatNumber(value: number | string, lang: Lang, maximumFractionDigits = 2): string {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? new Intl.NumberFormat(NUMBER_LOCALE[lang], { maximumFractionDigits }).format(n) : "—";
}

const DEVANAGARI_DIGITS = "०१२३४५६७८९";
/** Converts 0-9 to Devanagari digits in Nepali; leaves English text unchanged. */
export function digits(text: string, lang: Lang): string {
  return lang === "ne" ? text.replace(/[0-9]/g, (d) => DEVANAGARI_DIGITS[Number(d)]) : text;
}

const UNITS: Record<string, string> = { NPR: "नेपाली रुपैयाँ", USD: "अमेरिकी डलर", Percent: "प्रतिशत", percent: "प्रतिशत" };
const SCALES: Record<string, string> = { units: "", thousands: "हजार", millions: "दश लाख", billions: "अर्ब" };
const FREQUENCIES: Record<string, { en: string; ne: string }> = {
  monthly: { en: "Monthly", ne: "मासिक" },
  month: { en: "Monthly", ne: "मासिक" },
  quarterly: { en: "Quarterly", ne: "त्रैमासिक" },
  quarter: { en: "Quarterly", ne: "त्रैमासिक" },
  fiscal_year: { en: "Fiscal year", ne: "आर्थिक वर्ष" },
  annual: { en: "Annual", ne: "वार्षिक" },
  calendar_year: { en: "Calendar year", ne: "पात्रो वर्ष" },
};

export function unitLabel(unit: string, lang: Lang): string {
  return lang === "ne" ? UNITS[unit] ?? unit : unit;
}

/** "millions NPR" / "दश लाख नेपाली रुपैयाँ"; empty scale for plain units. */
export function scaleUnitLabel(unit: string, scale: string, lang: Lang): string {
  if (lang === "en") return `${scale === "units" ? "" : scale} ${unit}`.trim();
  return `${SCALES[scale] ?? scale} ${unitLabel(unit, lang)}`.trim();
}

export function formatValue(value: number | string, unit: string, scale: string, lang: Lang): string {
  if (unit === "Percent" || unit === "percent") return `${formatNumber(value, lang)}%`;
  return `${formatNumber(value, lang)} ${scaleUnitLabel(unit, scale, lang)}`.trim();
}

export function frequencyLabel(frequency: string, lang: Lang): string {
  return FREQUENCIES[frequency]?.[lang] ?? frequency.replace(/_/g, " ");
}

const MONTHS_NE: Record<string, string> = {
  January: "जनवरी", February: "फेब्रुअरी", March: "मार्च", April: "अप्रिल", May: "मे", June: "जुन",
  July: "जुलाई", August: "अगस्ट", September: "सेप्टेम्बर", October: "अक्टोबर", November: "नोभेम्बर", December: "डिसेम्बर",
};

type PeriodLike = { type?: string | null; label?: string | null; label_ad?: string | null };

/**
 * English: "FY 2079/80 (2022/23)". Nepali: "आ.व. २०७९/८०" (Nepali readers use the BS year).
 * Other period types show the label as printed in the report.
 */
export function periodLabel(period: PeriodLike | null | undefined, lang: Lang): string {
  if (!period) return "—";
  const label = period.label ?? period.label_ad ?? "—";
  if (period.type === "fiscal_year") {
    if (lang === "ne") return `आ.व. ${digits(label, "ne")}`;
    return period.label_ad && period.label_ad !== label ? `FY ${label} (${period.label_ad})` : `FY ${label}`;
  }
  if (lang === "ne") return digits(label.replace(/[A-Z][a-z]+/g, (m) => MONTHS_NE[m] ?? m), "ne");
  return label;
}

/** Short period label for chart axes. */
export function periodShortLabel(period: PeriodLike | null | undefined, lang: Lang): string {
  if (!period) return "—";
  if (period.type === "fiscal_year") return digits(period.label ?? period.label_ad ?? "—", lang);
  return periodLabel(period, lang);
}

/** Picks the Nepali field when it exists, otherwise falls back to English. */
export function localized(row: object, field: string, lang: Lang): string {
  const r = row as Record<string, unknown>;
  const ne = r[`${field}_ne`];
  if (lang === "ne" && typeof ne === "string" && ne.trim()) return ne;
  const base = r[field];
  return typeof base === "string" ? base : "";
}
