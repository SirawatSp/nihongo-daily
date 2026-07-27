import { describe, it, expect } from 'vitest';
import {
  exampleWordFor,
  kanjiInWords,
  pickKanji,
  practicePriority,
  type VocabLike,
} from './kanjiPicker';
import type { KanjiStat } from './db';

const words: VocabLike[] = [
  { id: 'v1', kanji: '駅', kana: 'えき', meaning: 'station' },
  { id: 'v2', kanji: '電車', kana: 'でんしゃ', meaning: 'train' },
  { id: 'v3', kanji: 'バス', kana: 'バス', meaning: 'bus' },
  { id: 'v4', kanji: '電話', kana: 'でんわ', meaning: 'telephone' },
];

const stat = (over: Partial<KanjiStat>): KanjiStat => ({
  char: 'x',
  attempts: 1,
  completed: 1,
  best: 0.8,
  recent: 0.8,
  lastSeen: 0,
  ...over,
});

const NOW = Date.parse('2026-02-01T00:00:00Z');
const DAY = 86_400_000;

describe('kanjiInWords', () => {
  it('extracts kanji and ignores kana-only words', () => {
    expect(kanjiInWords(words).sort()).toEqual(['話', '車', '電', '駅'].sort());
  });
  it('deduplicates a kanji shared by two words', () => {
    expect(kanjiInWords(words).filter((c) => c === '電')).toHaveLength(1);
  });
  it('returns nothing for an empty list', () => {
    expect(kanjiInWords([])).toEqual([]);
  });
});

describe('exampleWordFor', () => {
  it('finds a word containing the kanji', () => {
    expect(exampleWordFor('車', words)?.id).toBe('v2');
  });
  it('is undefined when no word uses it', () => {
    expect(exampleWordFor('猫', words)).toBeUndefined();
  });
});

describe('practicePriority', () => {
  it('ranks never-attempted kanji ahead of everything else', () => {
    expect(practicePriority(undefined, NOW)).toBeLessThan(
      practicePriority(stat({ recent: 0.1, lastSeen: NOW }), NOW),
    );
  });

  it('ranks weak accuracy ahead of strong accuracy', () => {
    const weak = practicePriority(stat({ recent: 0.3, lastSeen: NOW }), NOW);
    const strong = practicePriority(stat({ recent: 0.95, lastSeen: NOW }), NOW);
    expect(weak).toBeLessThan(strong);
  });

  it('pulls a stale kanji back up the queue', () => {
    const fresh = practicePriority(stat({ recent: 0.9, lastSeen: NOW }), NOW);
    const stale = practicePriority(stat({ recent: 0.9, lastSeen: NOW - 20 * DAY }), NOW);
    expect(stale).toBeLessThan(fresh);
  });
});

describe('pickKanji', () => {
  const available = new Set(['駅', '電', '車', '話']);

  it('returns the requested number of characters', () => {
    const picked = pickKanji({
      candidates: ['駅', '電', '車', '話'],
      stats: new Map(),
      available,
      count: 2,
      now: NOW,
    });
    expect(picked).toHaveLength(2);
  });

  it('skips kanji with no bundled stroke data', () => {
    const picked = pickKanji({
      candidates: ['駅', '猫'],
      stats: new Map(),
      available,
      count: 5,
      now: NOW,
    });
    expect(picked).not.toContain('猫');
  });

  it('practises unseen kanji before well-known ones', () => {
    const stats = new Map<string, KanjiStat>([
      ['駅', stat({ char: '駅', recent: 0.98, lastSeen: NOW })],
      ['電', stat({ char: '電', recent: 0.97, lastSeen: NOW })],
      ['車', stat({ char: '車', recent: 0.96, lastSeen: NOW })],
    ]);
    const picked = pickKanji({
      candidates: ['駅', '電', '車', '話'],
      stats,
      available,
      count: 1,
      now: NOW,
    });
    expect(picked).toEqual(['話']); // the only one never attempted
  });

  it('respects a stroke-count ceiling', () => {
    const picked = pickKanji({
      candidates: ['駅', '電', '車'],
      stats: new Map(),
      available,
      count: 5,
      now: NOW,
      maxStrokes: 8,
      strokeCountOf: (c) => ({ 駅: 14, 電: 13, 車: 7 })[c] ?? 1,
    });
    expect(picked).toEqual(['車']);
  });

  it('deduplicates repeated candidates', () => {
    const picked = pickKanji({
      candidates: ['駅', '駅', '電'],
      stats: new Map(),
      available,
      count: 5,
      now: NOW,
    });
    expect(picked).toHaveLength(2);
  });

  it('returns an empty list when nothing is available', () => {
    expect(
      pickKanji({ candidates: [], stats: new Map(), available, count: 4, now: NOW }),
    ).toEqual([]);
  });
});
