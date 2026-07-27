// Chooses which kanji to practise. Pure functions — no DB, no React.
//
// The goal is that writing practice reinforces the vocabulary you are
// already studying, rather than drilling characters in isolation.

import type { KanjiStat } from './db';

export interface KanjiEntry {
  char: string;
  strokes: string[];
  meanings: string[];
  on: string[];
  kun: string[];
  jlpt: 'N5' | 'N4' | 'N3' | null;
}

export interface VocabLike {
  id: string;
  kanji: string;
  kana: string;
  meaning: string;
}

const isKanji = (ch: string) => /[一-鿿]/.test(ch);

/** Every kanji character appearing in a set of vocabulary headwords. */
export function kanjiInWords(words: readonly VocabLike[]): string[] {
  const seen = new Set<string>();
  for (const w of words) {
    for (const ch of w.kanji) if (isKanji(ch)) seen.add(ch);
  }
  return [...seen];
}

/** The first word in the list that contains this kanji, for context. */
export function exampleWordFor(
  char: string,
  words: readonly VocabLike[],
): VocabLike | undefined {
  return words.find((w) => w.kanji.includes(char));
}

/**
 * Priority for practice, lowest score practised first:
 *   - never attempted  → highest priority (you have not written it yet)
 *   - weak recent accuracy → next
 *   - not seen for a while → nudged up
 *   - strong and recent → lowest
 */
export function practicePriority(stat: KanjiStat | undefined, now: number): number {
  if (!stat) return 0;
  const daysSince = (now - stat.lastSeen) / 86_400_000;
  const staleness = Math.min(daysSince / 14, 1); // caps after two weeks
  // recent accuracy dominates; staleness pulls old characters back in.
  return stat.recent * 0.75 - staleness * 0.25 + Math.min(stat.completed, 5) * 0.02;
}

export interface PickOptions {
  /** Kanji available to practise, in vocabulary-relevance order. */
  candidates: readonly string[];
  stats: ReadonlyMap<string, KanjiStat>;
  available: ReadonlySet<string>;
  count: number;
  now: number;
  /** Cap on strokes, so a 19-stroke character doesn't ambush a beginner. */
  maxStrokes?: number;
  strokeCountOf?: (char: string) => number;
}

/** Pick the next characters to practise. */
export function pickKanji({
  candidates,
  stats,
  available,
  count,
  now,
  maxStrokes,
  strokeCountOf,
}: PickOptions): string[] {
  const usable = candidates.filter((c) => {
    if (!available.has(c)) return false;
    if (maxStrokes && strokeCountOf && strokeCountOf(c) > maxStrokes) return false;
    return true;
  });
  const unique = [...new Set(usable)];
  unique.sort((a, b) => practicePriority(stats.get(a), now) - practicePriority(stats.get(b), now));
  return unique.slice(0, Math.max(0, count));
}

/** Rough difficulty banding, used to order a first encounter sensibly. */
export function byStrokeCount(entries: readonly KanjiEntry[]): KanjiEntry[] {
  return [...entries].sort((a, b) => a.strokes.length - b.strokes.length);
}
