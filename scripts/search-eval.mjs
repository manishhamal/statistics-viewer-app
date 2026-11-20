// Measures how search behaves on a list of questions: which answers came from the
// cache, keyword matching, or the AI model, and whether the right indicator was found.
//
// Usage (with the site running, e.g. npm run dev):
//   node scripts/search-eval.mjs
//   node scripts/search-eval.mjs http://localhost:3000 scripts/questions.txt
//
// Each line in a questions file is: <lang>|<question>|<expected indicator code>
// e.g.  en|How did broad money supply change?|broad_money_m2

import { readFileSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000";
const file = process.argv[3];

const DEFAULT_QUESTIONS = [
  ["en", "How did broad money supply change?", "broad_money_m2"],
  ["en", "What was CPI inflation?", "cpi_inflation_yoy"],
  ["en", "Show foreign exchange reserves.", "foreign_exchange_reserves_usd"],
  ["en", "money supply", "broad_money_m2"],
  ["en", "inflation", "cpi_inflation_yoy"],
  ["en", "dollar reserves", "foreign_exchange_reserves_usd"],
  ["en", "what is the current price level", "cpi_inflation_yoy"],
  ["en", "How did broad money supply change?", "broad_money_m2"], // repeat: should be cached
  ["ne", "मुद्राप्रदाय कति छ?", "broad_money_m2"],
  ["ne", "महँगी कति थियो", "cpi_inflation_yoy"],
  ["ne", "नेपालको विदेशी विनिमय सञ्चिति देखाउनुहोस्", "foreign_exchange_reserves_usd"],
  ["en", "something unrelated about weather", null],
];

function loadQuestions() {
  if (!file) return DEFAULT_QUESTIONS;
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const [lang, question, expected] = line.split("|");
      return [lang, question, expected || null];
    });
}

const questions = loadQuestions();
const counts = { cache: 0, keyword: 0, ai: 0, error: 0 };
let correct = 0;
let labelled = 0;

for (const [lang, question, expected] of questions) {
  let body;
  try {
    const res = await fetch(`${base}/api/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question, lang }),
    });
    body = await res.json();
  } catch (error) {
    counts.error += 1;
    console.log(`ERROR  ${question}  (${error.message})`);
    continue;
  }
  if (body.error) {
    counts.error += 1;
    console.log(`ERROR  ${question}  (${body.error})`);
    continue;
  }

  const source = body.source ?? "keyword";
  counts[source] = (counts[source] ?? 0) + 1;
  const found = body.indicator?.code ?? null;
  let verdict = "";
  if (expected) {
    labelled += 1;
    if (found === expected) {
      correct += 1;
      verdict = "ok";
    } else verdict = `WRONG (expected ${expected})`;
  }
  console.log(`${source.padEnd(7)} ${lang}  ${question}  ->  ${found ?? "no match"}  ${verdict}`);
}

const total = questions.length;
const aiShare = total ? ((counts.ai / total) * 100).toFixed(0) : "0";
console.log("\n--- summary");
console.log(`questions: ${total}`);
console.log(`answered from cache: ${counts.cache}`);
console.log(`answered by keyword matching (no model call): ${counts.keyword}`);
console.log(`needed the model: ${counts.ai} (${aiShare}%)`);
console.log(`errors: ${counts.error}`);
if (labelled) console.log(`correct indicator: ${correct}/${labelled}`);
