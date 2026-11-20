// Small in-memory cache of search decisions (which indicator a question means).
// It caches the *plan*, not the numbers, so answers always reflect the latest
// published data. Lives per server process; a restart simply empties it.

type Entry = { value: unknown; expires: number };

const MAX_ENTRIES = 500;
const TTL_MS = 24 * 60 * 60 * 1000; // a question's meaning rarely changes

const store = new Map<string, Entry>();

export function normalizeQuestion(question: string, lang: string): string {
  const cleaned = question
    .normalize("NFC")
    .toLowerCase()
    .replace(/[?.!,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${lang}|${cleaned}`;
}

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expires < Date.now()) {
    store.delete(key);
    return undefined;
  }
  // Re-insert to mark as recently used (Map keeps insertion order).
  store.delete(key);
  store.set(key, entry);
  return entry.value as T;
}

export function setCached(key: string, value: unknown): void {
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(key, { value, expires: Date.now() + TTL_MS });
}
