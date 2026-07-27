// Streak + daily-session bookkeeping. Pure functions only.

/** Local-date key, YYYY-MM-DD. */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + delta);
  return dateKey(dt);
}

/**
 * Current streak counting back from today (or yesterday, so an unfinished
 * "today" does not break a live streak).
 */
export function currentStreak(sessionDates: readonly string[], today: string): number {
  const set = new Set(sessionDates);
  let start = today;
  if (!set.has(today)) {
    if (!set.has(addDays(today, -1))) return 0;
    start = addDays(today, -1);
  }
  let streak = 0;
  let cursor = start;
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(sessionDates: readonly string[]): number {
  const sorted = [...new Set(sessionDates)].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** The last `n` day-keys ending at `today`, oldest first (for the calendar). */
export function lastNDays(today: string, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(today, -i));
  return out;
}
