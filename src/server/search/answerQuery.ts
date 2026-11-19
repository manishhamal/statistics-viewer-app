import { loadCatalog, rankIndicators } from "./findCandidates";
import { runPlan } from "./runPlan";
import { interpretWithModel } from "@/server/llm/llmClient";
import type { SearchPlan } from "@/lib/schemas";

export async function answerQuery(question: string) {
  const catalog = await loadCatalog();
  if (catalog.length === 0) {
    return {
      answer: "The indicator catalogue is empty. Run supabase/seed.sql in the Supabase SQL editor, then try again.",
      rows: [],
    };
  }

  // 1. Let Gemini choose from the whole catalogue (only codes it returns are accepted).
  const aiPlan = await interpretWithModel(
    question,
    catalog.map((indicator) => ({ code: indicator.code, name: indicator.name })),
  );

  // 2. If the AI is unavailable or unsure, use keyword matching.
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
    if (!best) {
      return { answer: "I could not match that question to a catalogued indicator.", rows: [] };
    }
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
  if (!result.indicator) {
    return { answer: "I could not match that question to a catalogued indicator.", rows: [] };
  }
  const name = result.indicator.name;
  return {
    answer: result.rows.length
      ? `Found ${result.rows.length} published observation(s) for ${name}.`
      : `No published observations were found for ${name}. The catalogue has the indicator, but no verified values are published yet.`,
    rows: result.rows,
    indicator: result.indicator,
  };
}
