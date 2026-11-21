import { GoogleGenAI } from "@google/genai";
import { takeAiCall } from "@/server/search/aiBudget";
import type { Task } from "./taskData";

// "Find document": reads the source's search pages (listing pages or sitemaps, plus a few
// report pages they point to), collects PDF links, and ranks them against the task's title and
// period. Runs only when a curator clicks the button. Gemini is asked only when the
// best two matches are tied, so the free quota is barely touched.
//
// It never registers anything: the curator always picks the right PDF.

export interface Candidate {
  url: string;
  label: string;
  context: string;
  score: number;
  best?: boolean;
}
export interface FindResult {
  candidates: Candidate[];
  scanned: string[];
  message?: string;
}

const MAX_FETCHES = 9;
const MAX_BYTES = 3 * 1024 * 1024;
const USER_AGENT = "NepalStatsCurationHelper/1.0 (finds official report links on request)";

// ---------- text matching ----------

const NEPALI_DIGITS = "०१२३४५६७८९";
const MONTHS: Record<string, string[]> = {
  baisakh: ["baisakh", "baishakh", "vaisakh", "baisak", "बैशाख", "वैशाख"],
  jestha: ["jestha", "jeth", "jyeshtha", "जेठ", "ज्येष्ठ"],
  asar: ["asar", "asadh", "ashadh", "ashad", "असार", "आषाढ"],
  shrawan: ["shrawan", "shravan", "srawan", "saun", "sawan", "साउन", "श्रावण"],
  bhadra: ["bhadra", "bhadau", "भदौ", "भाद्र"],
  ashwin: ["ashwin", "asoj", "aswin", "असोज", "आश्विन"],
  kartik: ["kartik", "kattik", "कात्तिक", "कार्तिक"],
  mangsir: ["mangsir", "marga", "mansir", "mangshir", "मंसिर", "मङ्सिर", "मार्ग"],
  poush: ["poush", "push", "paush", "pous", "पुस", "पौष"],
  magh: ["magh", "माघ"],
  falgun: ["falgun", "phagun", "phalgun", "fagun", "फागुन", "फाल्गुन"],
  chaitra: ["chaitra", "chait", "chaitr", "चैत", "चैत्र"],
  january: ["january", "jan"], february: ["february", "feb"], march: ["march", "mar"], april: ["april", "apr"],
  may: ["may"], june: ["june", "jun"], july: ["july", "jul"], august: ["august", "aug"],
  september: ["september", "sep", "sept"], october: ["october", "oct"], november: ["november", "nov"], december: ["december", "dec"],
};
const MONTH_OF = new Map<string, string>();
for (const [canon, names] of Object.entries(MONTHS)) for (const n of names) MONTH_OF.set(n, canon);

const STOP = new Set(["the", "of", "and", "for", "in", "on", "a", "an", "to", "fy", "pdf", "report", "reports", "nepal", "download", "file", "with", "based", "data"]);

function tokens(text: string): string[] {
  const ascii = text.replace(/[०-९]/g, (d) => String(NEPALI_DIGITS.indexOf(d))).toLowerCase();
  return ascii
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter(Boolean)
    .map((t) => {
      if (MONTH_OF.has(t)) return `m:${MONTH_OF.get(t)}`;
      if (/^0\d{2}$/.test(t)) return `2${t}`; // "081" → "2081"
      return t;
    });
}

interface Query {
  words: Set<string>;
  months: Set<string>;
  years: Set<string>;
}

function buildQuery(task: Task): Query {
  const all = tokens(`${task.title} ${task.periodHint ?? ""}`);
  const q: Query = { words: new Set(), months: new Set(), years: new Set() };
  for (const t of all) {
    if (t.startsWith("m:")) q.months.add(t);
    else if (/^(19|20)\d{2}$/.test(t)) q.years.add(t);
    else if (/^\d{2}$/.test(t)) q.years.add(t);
    else if (t.length > 2 && !STOP.has(t) && t !== task.source?.shortName.toLowerCase()) q.words.add(t);
  }
  return q;
}

function score(q: Query, text: string): number {
  const t = new Set(tokens(text));
  let s = 0;
  for (const w of q.words) if (t.has(w)) s += 1;
  for (const m of q.months) if (t.has(m)) s += 3;
  for (const y of q.years) if (t.has(y)) s += /^\d{2}$/.test(y) ? 1 : 3;
  // A different month or year than asked for is most likely the wrong edition.
  const hasMonth = [...t].some((x) => x.startsWith("m:"));
  if (q.months.size && hasMonth && ![...q.months].some((m) => t.has(m))) s -= 3;
  const years = [...t].filter((x) => /^20\d{2}$/.test(x));
  const qYears = [...q.years].filter((y) => y.length === 4);
  if (qYears.length && years.length && !years.some((y) => q.years.has(y))) s -= 3;
  return s;
}

// ---------- fetching ----------

export function safeUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    const h = u.hostname.toLowerCase();
    // Public websites only: no local names or raw IP addresses.
    if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^[\d.]+$/.test(h) || h.includes(":")) return null;
    return u;
  } catch {
    return null;
  }
}

const isPdfUrl = (u: URL) => /\.pdf($|[?#])/i.test(u.pathname + u.search);

type Fetched =
  | { kind: "pdf"; url: URL }
  | { kind: "html"; url: URL; body: string }
  | { kind: "sitemap"; url: URL; body: string };

// Listing pages and sitemaps change at most a few times a day, so keep them for 10 minutes
// (per server instance). Repeated searches then do not hit the publisher's site again.
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; value: Fetched }>();

async function fetchPage(url: URL): Promise<Fetched | null> {
  const hit = cache.get(url.href);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const value = await fetchPageUncached(url);
  if (value) {
    if (cache.size > 100) cache.delete(cache.keys().next().value!);
    cache.set(url.href, { at: Date.now(), value });
  }
  return value;
}

/**
 * Fetches several pages politely: one at a time per website, with a short pause
 * between requests to the same site; different websites are fetched in parallel.
 * Results come back in the order of `urls`.
 */
async function fetchPolitely(urls: URL[]): Promise<(Fetched | null)[]> {
  const results: (Fetched | null)[] = new Array(urls.length).fill(null);
  const byHost = new Map<string, number[]>();
  urls.forEach((u, i) => byHost.set(u.hostname, [...(byHost.get(u.hostname) ?? []), i]));
  await Promise.all(
    [...byHost.values()].map(async (indexes) => {
      for (const [n, i] of indexes.entries()) {
        const cached = cache.get(urls[i].href);
        if (n > 0 && !(cached && Date.now() - cached.at < CACHE_MS)) await new Promise((r) => setTimeout(r, 700));
        results[i] = await fetchPage(urls[i]);
      }
    }),
  );
  return results;
}

async function fetchPageUncached(url: URL): Promise<Fetched | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf;q=0.5" },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      await res.body?.cancel();
      return null;
    }
    const finalUrl = new URL(res.url || url.href);
    const type = res.headers.get("content-type") ?? "";
    // Some sites (e.g. NRB) link a report page that redirects straight to the PDF.
    if (type.includes("application/pdf") || (isPdfUrl(finalUrl) && !type.includes("html"))) {
      await res.body?.cancel();
      return { kind: "pdf", url: finalUrl };
    }
    if (!/html|xml/.test(type)) {
      await res.body?.cancel();
      return null;
    }
    const body = new TextDecoder().decode((await res.arrayBuffer()).slice(0, MAX_BYTES));
    const head = body.slice(0, 2000);
    return /<(urlset|sitemapindex)\b/i.test(head) ? { kind: "sitemap", url: finalUrl, body } : { kind: "html", url: finalUrl, body };
  } catch {
    return null;
  }
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " ", apos: "'" };
function cleanText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (m, e: string) => {
      if (ENTITIES[e.toLowerCase()]) return ENTITIES[e.toLowerCase()];
      if (e.startsWith("#x")) return String.fromCodePoint(parseInt(e.slice(2), 16));
      if (e.startsWith("#")) return String.fromCodePoint(Number(e.slice(1)));
      return m;
    })
    .replace(/\s+/g, " ")
    .trim();
}

const GENERIC = /^(download|click here|here|pdf|view|read more|more|open|details?|file|link|\d+(\.\d+)?\s*(kb|mb))$/i;

interface Link {
  url: URL;
  label: string;
  context: string;
  /** From a sitemap: when the page last changed, used to prefer the newer of two equal matches. */
  lastmod?: string;
}

function decodePath(u: URL) {
  try {
    return decodeURIComponent(u.pathname);
  } catch {
    return u.pathname;
  }
}

/** A readable name from the last part of the address, e.g. "/red/current-macro…-2026-27/". */
function nameFromUrl(u: URL) {
  const part = decodePath(u).split("/").filter(Boolean).pop() ?? u.hostname;
  return part.replace(/\.pdf$/i, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

function linksFromHtml(html: string, base: URL): Link[] {
  const out: Link[] = [];
  const re = /<a\b[^>]*?href\s*=\s*["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    let url: URL;
    try {
      url = new URL(m[1].trim().replace(/&amp;/g, "&"), base);
    } catch {
      continue;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") continue;
    const anchor = cleanText(m[2]);
    const before = cleanText(html.slice(Math.max(0, m.index - 600), m.index)).slice(-160);
    const label = anchor && !GENERIC.test(anchor) && anchor.length >= 4 ? anchor : nameFromUrl(url);
    out.push({ url, label: label.slice(0, 200), context: before });
  }
  // PDF addresses written inside scripts or data attributes (e.g. MoF: var pdf = '…pdf').
  const title = cleanText(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "");
  // Brackets are allowed: real file names include "(1)".
  for (const raw of html.match(/https?:\/\/[^\s"'<>\\]+?\.pdf\b[^\s"'<>\\]*/gi) ?? []) {
    try {
      const url = new URL(raw.replace(/&amp;/g, "&"));
      if (!out.some((l) => l.url.href === url.href)) out.push({ url, label: nameFromUrl(url), context: title });
    } catch {
      /* not a usable address */
    }
  }
  return out;
}

function linksFromSitemap(xml: string): { pages: Link[]; children: { url: URL; lastmod: string }[] } {
  const pages: Link[] = [];
  const children: { url: URL; lastmod: string }[] = [];
  const isIndex = /<sitemapindex\b/i.test(xml.slice(0, 2000));
  const re = /<(url|sitemap)>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const loc = /<loc>\s*([^<\s]+)\s*<\/loc>/i.exec(m[2])?.[1];
    const lastmod = /<lastmod>\s*([^<\s]+)\s*<\/lastmod>/i.exec(m[2])?.[1] ?? "";
    if (!loc) continue;
    let url: URL;
    try {
      url = new URL(loc.replace(/&amp;/g, "&"));
    } catch {
      continue;
    }
    if (isIndex) children.push({ url, lastmod });
    else pages.push({ url, label: nameFromUrl(url), context: lastmod ? `updated ${lastmod.slice(0, 10)}` : "", lastmod });
  }
  return { pages, children };
}

// ---------- AI tie-break ----------

async function aiPick(task: Task, list: Candidate[]): Promise<number | null> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey || !takeAiCall()) return null;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GOOGLE_MODEL ?? "gemini-2.5-flash-lite",
      contents:
        `Task: ${task.title}\nPeriod wanted: ${task.periodHint ?? "not given"}\nPublisher: ${task.source?.name ?? "unknown"}\n` +
        `Candidate PDF links (index, label, nearby text, url):\n` +
        list.map((c, i) => `${i}. ${c.label} | ${c.context} | ${c.url}`).join("\n"),
      config: {
        systemInstruction:
          "You pick which official publication PDF a curator needs. Answer with the index of the single best match for the task and period, or -1 if none fits. Do not guess beyond the given candidates.",
        responseMimeType: "application/json",
        responseJsonSchema: { type: "object", properties: { index: { type: "integer" } }, required: ["index"] },
      },
    });
    const idx = Number(JSON.parse(response.text ?? "{}").index);
    return Number.isInteger(idx) && idx >= 0 && idx < list.length ? idx : null;
  } catch (error) {
    console.error("Find document: Gemini tie-break failed", error);
    return null;
  }
}

// ---------- main ----------

/**
 * Checks whether a link opens a PDF (directly or through a redirect).
 * Returns the PDF's final address, "page" for a web page, or null if it cannot be opened.
 */
export async function resolvePdf(raw: string): Promise<{ pdf: string } | "page" | null> {
  const url = safeUrl(raw);
  if (!url) return null;
  const page = await fetchPage(url);
  if (!page) return null;
  return page.kind === "pdf" ? { pdf: page.url.href } : "page";
}

/** A source's search pages: one or more addresses separated by spaces or new lines. */
export function splitPages(value: string | null | undefined): string[] {
  return (value ?? "").split(/\s+/).map((s) => s.trim()).filter(Boolean);
}

export async function findDocumentCandidates(task: Task): Promise<FindResult> {
  const starts = [...(task.searchLink ? [task.searchLink] : []), ...splitPages(task.source?.publicationsUrl)];
  if (!starts.length && task.source?.websiteUrl) starts.push(task.source.websiteUrl);
  if (!starts.length) return { candidates: [], scanned: [], message: "This task has no source page to search. Ask the owner to add the source's search pages." };

  const q = buildQuery(task);
  const scanned: string[] = [];
  const fetched = new Set<string>();
  const pdfs = new Map<string, Candidate & { lastmod?: string }>();
  let fetches = 0;

  const textOf = (l: Link, extra = "") => `${l.label} ${l.context} ${extra} ${decodePath(l.url)}`;
  const addPdf = (url: URL, l: Link, extra = "") => {
    const s = score(q, textOf(l, extra));
    const prev = pdfs.get(url.href);
    if (!prev || prev.score < s) {
      const label = extra && l.label === nameFromUrl(url) ? extra : l.label;
      pdfs.set(url.href, { url: url.href, label, context: l.context, score: s, lastmod: l.lastmod });
    }
  };

  /** Results line up with `urls`; a page already read this search, or over the budget, gives null. */
  async function fetchAll(urls: URL[]): Promise<(Fetched | null)[]> {
    const picked: number[] = [];
    urls.forEach((u, i) => {
      if (fetched.has(u.href) || fetches >= MAX_FETCHES) return;
      fetched.add(u.href);
      fetches++;
      picked.push(i);
    });
    const got = await fetchPolitely(picked.map((i) => urls[i]));
    const results: (Fetched | null)[] = new Array(urls.length).fill(null);
    picked.forEach((i, n) => {
      results[i] = got[n];
      if (got[n]) scanned.push(urls[i].href);
    });
    return results;
  }

  // Pass 1: the task's link and the source's search pages (listing pages or sitemaps).
  const pages: Link[] = [];
  const startUrls = starts.map(safeUrl).filter((u): u is URL => !!u);
  let queue = startUrls;
  for (let depth = 0; depth < 2 && queue.length; depth++) {
    const next: URL[] = [];
    for (const page of await fetchAll(queue)) {
      if (!page) continue;
      if (page.kind === "pdf") {
        addPdf(page.url, { url: page.url, label: nameFromUrl(page.url), context: "Direct PDF link" });
      } else if (page.kind === "sitemap") {
        const { pages: entries, children } = linksFromSitemap(page.body);
        for (const l of entries) {
          if (isPdfUrl(l.url)) addPdf(l.url, l);
          else pages.push(l);
        }
        // A sitemap index: read its newest child sitemaps.
        next.push(...children.sort((a, b) => b.lastmod.localeCompare(a.lastmod)).slice(0, 3).map((c) => c.url));
      } else {
        for (const l of linksFromHtml(page.body, page.url)) {
          if (isPdfUrl(l.url)) addPdf(l.url, l);
          else if (l.url.hostname === page.url.hostname) pages.push(l);
        }
      }
    }
    queue = next;
  }

  // Pass 2: many sites list report pages, with the PDF one step further (behind a
  // redirect, a link, or an address in a script). Open the best-matching few.
  const strong = [...pdfs.values()].some((c) => c.score >= 5);
  if (!strong) {
    const best = new Map<string, { l: Link; s: number }>();
    for (const l of pages) {
      const s = score(q, textOf(l));
      if (s >= 3 && (best.get(l.url.href)?.s ?? -1) < s) best.set(l.url.href, { l, s });
    }
    const top = [...best.values()]
      .sort((a, b) => b.s - a.s || (b.l.lastmod ?? "").localeCompare(a.l.lastmod ?? ""))
      .slice(0, 3);
    const results = await fetchAll(top.map((t) => t.l.url));
    results.forEach((page, i) => {
      if (!page) return;
      const from = top[i].l;
      if (page.kind === "pdf") addPdf(page.url, { ...from, url: page.url }, from.label);
      else if (page.kind === "html") {
        for (const inner of linksFromHtml(page.body, page.url)) if (isPdfUrl(inner.url)) addPdf(inner.url, inner, from.label);
      }
    });
  }

  const ranked = [...pdfs.values()]
    .sort((a, b) => b.score - a.score || (b.lastmod ?? "").localeCompare(a.lastmod ?? ""))
    .slice(0, 8)
    .map((c): Candidate => ({ url: c.url, label: c.label, context: c.context, score: c.score }));
  if (ranked.length === 0) {
    return {
      candidates: [],
      scanned,
      message: scanned.length
        ? "No matching PDF was found. The site may load its list with scripts; search it by hand and paste the PDF link."
        : "The source's pages could not be opened. Search the site by hand and paste the PDF link.",
    };
  }

  if (ranked.length > 1 && ranked[0].score > 0 && ranked[0].score === ranked[1].score) {
    const pick = await aiPick(task, ranked);
    if (pick !== null) ranked.unshift(...ranked.splice(pick, 1));
  }
  if (ranked[0].score > 0) ranked[0].best = true;
  return {
    candidates: ranked.slice(0, 5),
    scanned,
    message: ranked[0].score > 0 ? undefined : "No link clearly matches this task. These are the PDFs found; pick one only if you are sure.",
  };
}
