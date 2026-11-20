import { loadCatalog, rankIndicators, type ScoredIndicator } from "./findCandidates";
import { runPlan } from "./runPlan";
import { interpretWithModel } from "@/server/llm/llmClient";
import { getCached, normalizeQuestion, setCached } from "./planCache";
import { takeAiCall } from "./aiBudget";
import type { SearchPlan } from "@/lib/schemas";
import { fmt, type Lang } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { formatNumber, localized } from "@/i18n/format";
import type { Indicator } from "@/server/db/types";

export type SearchSource = "cache" | "keyword" | "ai";

// Keyword matching is trusted without the model when one indicator clearly wins:
// it has at least two matching words and beats the runner-up by two or more.
function isConfident(ranked: ScoredIndicator[]): boolean {
  const [best, second] = ranked;
  if (!best || best.score < 2) return false;
  return !second || best.score - second.score >= 2;
}

function planFor(code: string, aiPlan?: Partial<SearchPlan> | null): SearchPlan {
  return {
    matched: true,
    indicator_code: code,
    period_from: aiPlan?.period_from ?? null,
    period_to: aiPlan?.period_to ?? null,
    breakdown: aiPlan?.breakdown ?? null,
    chart_hint: aiPlan?.chart_hint ?? "table",
    clarifying_question: null,
  };
}

type Decision = { plan: SearchPlan; source: Exclude<SearchSource, "cache"> } | null;

async function decide(question: string, catalog: Indicator[]): Promise<Decision> {
  // 1. Keyword matching costs nothing. Use it when it is clearly right.
  const ranked = rankIndicators(question, catalog);
  if (isConfident(ranked)) return { plan: planFor(ranked[0].indicator.code), source: "keyword" };

  // 2. Ambiguous question: ask the model, if the budget allows it.
  if (process.env.GOOGLE_API_KEY && takeAiCall()) {
    const aiPlan = await interpretWithModel(
      question,
      catalog.map((i) => ({ code: i.code, name: i.name, name_ne: i.name_ne ?? undefined })),
    );
    if (aiPlan?.indicator_code) return { plan: planFor(aiPlan.indicator_code, aiPlan), source: "ai" };
  }

  // 3. Otherwise take the best keyword match, if there is any.
  if (ranked[0]) return { plan: planFor(ranked[0].indicator.code), source: "keyword" };
  return null;
}

export async function answerQuery(question: string, lang: Lang = "en") {
  const t = getDictionary(lang).search;
  const catalog = await loadCatalog();
  if (catalog.length === 0) return { answer: t.emptyCatalogue, rows: [], source: "keyword" as SearchSource };

  // Repeated questions reuse the earlier decision, so they cost no model call.
  const key = normalizeQuestion(question, lang);
  let plan = getCached<SearchPlan>(key);
  let source: SearchSource = "cache";

  if (!plan) {
    const decision = await decide(question, catalog);
    if (!decision) return { answer: t.noMatch, rows: [], source: "keyword" as SearchSource };
    plan = decision.plan;
    source = decision.source;
    setCached(key, plan);
  }

  const result = await runPlan(plan);
  if (!result.indicator) return { answer: t.noMatch, rows: [], source };
  const name = localized(result.indicator, "name", lang);
  return {
    answer: result.rows.length
      ? fmt(t.found, { count: formatNumber(result.rows.length, lang), name })
      : fmt(t.noneFound, { name }),
    rows: result.rows,
    indicator: result.indicator,
    source,
  };
}
