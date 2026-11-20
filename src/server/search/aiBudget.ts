// Keeps Gemini calls under the free-tier quota. Counts are per server process,
// so with several server instances the real total can be higher; set the limits
// with some headroom. When the budget is used up, search falls back to keyword
// matching instead of failing.

const PER_MINUTE = Number(process.env.SEARCH_AI_PER_MINUTE ?? 12); // free tier allows ~15
const PER_DAY = Number(process.env.SEARCH_AI_PER_DAY ?? 800); // free tier allows ~1,000

let minuteWindow = 0;
let minuteCount = 0;
let dayWindow = "";
let dayCount = 0;

export function takeAiCall(): boolean {
  const now = Date.now();
  const minute = Math.floor(now / 60_000);
  if (minute !== minuteWindow) {
    minuteWindow = minute;
    minuteCount = 0;
  }
  const day = new Date(now).toISOString().slice(0, 10);
  if (day !== dayWindow) {
    dayWindow = day;
    dayCount = 0;
  }
  if (minuteCount >= PER_MINUTE || dayCount >= PER_DAY) return false;
  minuteCount += 1;
  dayCount += 1;
  return true;
}

export function aiUsageToday(): number {
  return dayCount;
}
