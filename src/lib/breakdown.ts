// Canonical key for an observation's breakdown, used by the unique index
// observations_active_key. Empty breakdown -> "" (the column default), otherwise
// JSON of the entries sorted by key, so {a,b} and {b,a} produce the same key.
export function breakdownKey(breakdown: Record<string, string> | null | undefined): string {
  const entries = Object.entries(breakdown ?? {}).sort(([a], [b]) => a.localeCompare(b));
  return entries.length === 0 ? "" : JSON.stringify(Object.fromEntries(entries));
}
