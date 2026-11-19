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
};

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word));
}

function queryTerms(question: string): string[] {
  const terms = new Set<string>();
  for (const word of tokenize(question)) {
    terms.add(word);
    // Simple plural handling: "reserves" -> "reserve".
    if (word.endsWith("s")) terms.add(word.slice(0, -1));
    for (const extra of SYNONYMS[word] ?? []) terms.add(extra);
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
        tokenize(`${indicator.name} ${indicator.code.replace(/_/g, " ")} ${indicator.description ?? ""}`),
      );
      const score = terms.filter((term) => haystack.has(term)).length;
      return { indicator, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);
}
