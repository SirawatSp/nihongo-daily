// Quick Practice: a ~3-minute, situation-first drill of phrases you would
// actually say while travelling. Pure functions only — no DB, no React.

import type { PhraseStat } from './db';

/** Travel situations offered on the Quick Practice picker. */
export const SCENARIOS = [
  { id: 'food', label: 'Eating', hint: 'Ordering, allergies, the bill' },
  { id: 'transport', label: 'Getting around', hint: 'Trains, buses, taxis' },
  { id: 'directions', label: 'Directions', hint: 'Finding your way' },
  { id: 'lodging', label: 'Hotel', hint: 'Check-in, rooms, luggage' },
  { id: 'shopping', label: 'Shopping', hint: 'Buying, paying, returning' },
  { id: 'emergency', label: 'Trouble', hint: 'Illness, lost things, help' },
  { id: 'smalltalk', label: 'Basics', hint: 'Politeness, not understanding' },
] as const;

export type ScenarioId = (typeof SCENARIOS)[number]['id'];

export interface DialogueLike {
  id: string;
  scene: string;
  theme: string;
  lines: { speaker: string; ja: string; kana: string; en: string }[];
}

export interface Phrase {
  /** Stable id: dialogue id + line index. */
  id: string;
  ja: string;
  kana: string;
  en: string;
  scene: string;
  theme: string;
}

/**
 * Phrases the traveller would say themselves. Staff lines are useful to
 * understand but not to rehearse, so only "You" lines become drill items.
 */
export function travelPhrases(dialogues: readonly DialogueLike[]): Phrase[] {
  const out: Phrase[] = [];
  for (const d of dialogues) {
    d.lines.forEach((line, i) => {
      if (line.speaker !== 'You') return;
      out.push({
        id: `${d.id}:${i}`,
        ja: line.ja,
        kana: line.kana,
        en: line.en,
        scene: d.scene,
        theme: d.theme,
      });
    });
  }
  return out;
}

/**
 * Lower sorts first. Never-practised phrases lead, then ones you marked
 * shaky, then ones you have not seen for a while.
 */
export function phrasePriority(stat: PhraseStat | undefined, now: number): number {
  if (!stat) return -1;
  const days = (now - stat.lastSeen) / 86_400_000;
  const staleness = Math.min(days / 10, 1);
  return stat.strength - staleness * 0.5;
}

export interface QuickDeckOptions {
  phrases: readonly Phrase[];
  stats: ReadonlyMap<string, PhraseStat>;
  /** null = a mixed deck spanning every situation. */
  scenario: ScenarioId | null;
  count: number;
  now: number;
}

/** Build the deck for one quick session. */
export function buildQuickDeck({
  phrases,
  stats,
  scenario,
  count,
  now,
}: QuickDeckOptions): Phrase[] {
  const pool = scenario ? phrases.filter((p) => p.theme === scenario) : [...phrases];
  const sorted = [...pool].sort(
    (a, b) => phrasePriority(stats.get(a.id), now) - phrasePriority(stats.get(b.id), now),
  );
  if (!scenario) {
    // A mixed deck should feel varied, so avoid stacking one situation.
    return spreadByTheme(sorted).slice(0, count);
  }
  return sorted.slice(0, count);
}

/** Round-robin across themes while preserving each theme's own priority order. */
export function spreadByTheme(sorted: readonly Phrase[]): Phrase[] {
  const buckets = new Map<string, Phrase[]>();
  for (const p of sorted) {
    const list = buckets.get(p.theme);
    if (list) list.push(p);
    else buckets.set(p.theme, [p]);
  }
  const queues = [...buckets.values()];
  const out: Phrase[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const q of queues) {
      const next = q.shift();
      if (next) {
        out.push(next);
        added = true;
      }
    }
  }
  return out;
}

/**
 * Update a phrase's strength from one self-rating. `got` nudges it toward
 * confident, `again` pulls it sharply back so it resurfaces soon.
 */
export function ratePhrase(
  stat: PhraseStat | undefined,
  id: string,
  got: boolean,
  now: number,
): PhraseStat {
  const prev = stat ?? { id, seen: 0, got: 0, strength: 0, lastSeen: now };
  const strength = got
    ? Math.min(1, Math.round((prev.strength + (1 - prev.strength) * 0.5) * 100) / 100)
    : Math.max(0, Math.round(prev.strength * 0.4 * 100) / 100);
  return {
    id,
    seen: prev.seen + 1,
    got: prev.got + (got ? 1 : 0),
    strength,
    lastSeen: now,
  };
}

/** Phrases rated confident at least once and currently strong. */
export function confidentCount(stats: ReadonlyMap<string, PhraseStat>): number {
  let n = 0;
  for (const s of stats.values()) if (s.strength >= 0.7) n += 1;
  return n;
}
