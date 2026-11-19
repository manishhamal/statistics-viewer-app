import { getDbClient } from "@/server/db/client";
import type { Indicator } from "@/server/db/types";

export type ScoredIndicator = { indicator: Indicator; score: number };

// Common reader words that say nothing about which indicator is wanted.
const STOPWORDS = new Set([
  "a", "an", "and", "are", "at", "be", "by", "data", "for", "from", "how", "in", "is", "latest",
  "me", "much", "many", "nepal", "of", "on", "show", "tell", "the", "to", "what", "whats", "value",
  "current", "was", "were", "with", "give",
]);

// Everyday words readers use, mapped to the words used in the catalogue.
const SYNONYMS: Record<string, string[]> = {
  inflation: ["cpi", "consumer", "price"],
  prices: ["cpi", "consumer", "price"],
  price: ["cpi", "consumer", "price"],
  cpi: ["consumer", "price"],
  money: ["broad", "m2", "supply"],
  supply: ["broad", "m2"],
  reserves: ["foreign", "exchange"],
  reserve: ["foreign", "exchange"],
  forex: ["foreign", "exchange"],
  dollar: ["usd"],
  dollars: ["usd"],
  // Nepali everyday words -> catalogue words (English and Nepali names both match).
  "महँगी": ["cpi", "consumer", "price", "मुद्रास्फीति"],
  "महंगी": ["cpi", "consumer", "price", "मुद्रास्फीति"],
  "मूल्य": ["cpi", "consumer", "price"],
  "मुद्रास्फीति": ["cpi", "consumer", "price"],
  "मुद्रा": ["broad", "m2", "supply"],
  "मुद्राप्रदाय": ["broad", "m2", "supply"],
  "पैसा": ["broad", "m2", "supply"],
  "सञ्चिति": ["foreign", "exchange", "reserve"],
  "संचिति": ["foreign", "exchange", "reserve", "सञ्चिति"],
  "विदेशी": ["foreign"],
  "विनिमय": ["exchange"],
  "डलर": ["usd"],
};

// Nepali question words and particles that say nothing about the indicator.
const STOPWORDS_NE = new Set(["के", "कति", "छ", "थियो", "हो", "र", "मा", "को", "देखाउ", "देखाउनुहोस्", "नेपाल", "भयो", "कसरी", "बारे", "हालको"]);
// Postpositions that attach to Nepali words: "मुद्रास्फीतिको" -> "मुद्रास्फीति".
const NE_SUFFIXES = ["हरूको", "हरू", "लाई", "बाट", "सम्म", "को", "का", "की", "मा", "ले"];

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ") // keep letters (incl. Devanagari vowel signs) and digits
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word) && !STOPWORDS_NE.has(word));
}

function stripNepaliSuffix(word: string): string {
  for (const suffix of NE_SUFFIXES) {
    if (word.length > suffix.length + 1 && word.endsWith(suffix)) return word.slice(0, -suffix.length);
  }
  return word;
}

function queryTerms(question: string): string[] {
  const terms = new Set<string>();
  for (const raw of tokenize(question)) {
    for (const word of new Set([raw, stripNepaliSuffix(raw)])) {
      terms.add(word);
      // Simple plural handling: "reserves" -> "reserve".
      if (/^[a-z]+s$/.test(word)) terms.add(word.slice(0, -1));
      for (const extra of SYNONYMS[word] ?? []) terms.add(extra);
    }
  }
  return [...terms];
}

// Loads the whole indicator catalogue (small enough to fit in one request).
export async function loadCatalog(): Promise<Indicator[]> {
  const db = getDbClient();
  const { data, error } = await db.from("indicators").select("*").limit(500);
  if (error) throw new Error(`Could not read indicators: ${error.message}`);
  return (data ?? []) as Indicator[];
}

// Scores every indicator against the question. Highest score first; zero-score items are dropped.
export function rankIndicators(question: string, catalog: Indicator[]): ScoredIndicator[] {
  const terms = queryTerms(question);
  return catalog
    .map((indicator) => {
      const haystack = new Set(
        tokenize(
          `${indicator.name} ${indicator.name_ne ?? ""} ${indicator.code.replace(/_/g, " ")} ${indicator.description ?? ""} ${indicator.description_ne ?? ""}`,
        ),
      );
      const score = terms.filter((term) => haystack.has(term)).length;
      return { indicator, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
}
