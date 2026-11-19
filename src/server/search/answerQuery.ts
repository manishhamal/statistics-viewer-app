import { loadCatalog, rankIndicators } from "./findCandidates";
import { runPlan } from "./runPlan";
import { interpretWithModel } from "@/server/llm/llmClient";
import type { SearchPlan } from "@/lib/schemas";
import { fmt, type Lang } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { formatNumber, localized } from "@/i18n/format";

export async function answerQuery(question: string, lang: Lang = "en") {
  const t = getDictionary(lang).search;
  const catalog = await loadCatalog();
  if (catalog.length === 0) return { answer: t.emptyCatalogue, rows: [] };

  // 1. Let Gemini choose from the whole catalogue (only codes it returns are accepted).
  //    Nepali names are included so questions in Nepali match too.
  const aiPlan = await interpretWithModel(
    question,
    catalog.map((indicator) => ({ code: indicator.code, name: indicator.name, name_ne: indicator.name_ne ?? undefined })),
  );

  // 2. If the AI is unavailable or unsure, use keyword matching (English and Nepali).
  let plan: SearchPlan;
  if (aiPlan?.indicator_code) {
    plan = {
      matched: true,
      indicator_code: aiPlan.indicator_code,
      period_from: aiPlan.period_from ?? null,
      period_to: aiPlan.period_to ?? null,
      breakdown: aiPlan.breakdown ?? null,
      chart_hint: aiPlan.chart_hint ?? "table",
      clarifying_question: null,
    };
  } else {
    const [best] = rankIndicators(question, catalog);
    if (!best) return { answer: t.noMatch, rows: [] };
    plan = {
      matched: true,
      indicator_code: best.indicator.code,
      period_from: null,
      period_to: null,
      chart_hint: "table",
      clarifying_question: null,
    };
  }

  const result = await runPlan(plan);
  if (!result.indicator) return { answer: t.noMatch, rows: [] };
  const name = localized(result.indicator, "name", lang);
  return {
    answer: result.rows.length
      ? fmt(t.found, { count: formatNumber(result.rows.length, lang), name })
      : fmt(t.noneFound, { name }),
    rows: result.rows,
    indicator: result.indicator,
  };
}
