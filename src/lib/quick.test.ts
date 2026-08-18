import { describe, it, expect } from 'vitest';
import {
  buildQuickDeck,
  confidentCount,
  phrasePriority,
  ratePhrase,
  spreadByTheme,
  travelPhrases,
  type DialogueLike,
  type Phrase,
} from './quick';
import type { PhraseStat } from './db';

const NOW = Date.parse('2026-04-01T09:00:00Z');
const DAY = 86_400_000;

const dialogues: DialogueLike[] = [
  {
    id: 'd01',
    scene: 'Hotel',
    theme: 'lodging',
    lines: [
      { speaker: 'You', ja: 'A', kana: 'a', en: 'check in' },
      { speaker: 'Staff', ja: 'B', kana: 'b', en: 'your name' },
      { speaker: 'You', ja: 'C', kana: 'c', en: 'i have a booking' },
    ],
  },
  {
    id: 'd02',
    scene: 'Restaurant',
    theme: 'food',
    lines: [
      { speaker: 'You', ja: 'D', kana: 'd', en: 'water please' },
      { speaker: 'You', ja: 'E', kana: 'e', en: 'the bill please' },
    ],
  },
];

const stat = (over: Partial<PhraseStat>): PhraseStat => ({
  id: 'x',
  seen: 1,
  got: 1,
  strength: 0.5,
  lastSeen: NOW,
  ...over,
});

describe('travelPhrases', () => {
  it('keeps only lines the traveller says', () => {
    const p = travelPhrases(dialogues);
    expect(p.map((x) => x.en)).toEqual([
      'check in',
      'i have a booking',
      'water please',
      'the bill please',
    ]);
  });

  it('ids are stable and carry scene plus theme', () => {
    const p = travelPhrases(dialogues);
    expect(p[0]).toMatchObject({ id: 'd01:0', scene: 'Hotel', theme: 'lodging' });
    expect(p[2]).toMatchObject({ id: 'd02:0', theme: 'food' });
  });

  it('handles an empty list', () => {
    expect(travelPhrases([])).toEqual([]);
  });
});

describe('phrasePriority', () => {
  it('puts never-practised phrases first', () => {
    expect(phrasePriority(undefined, NOW)).toBeLessThan(
      phrasePriority(stat({ strength: 0 }), NOW),
    );
  });
  it('puts weak phrases ahead of strong ones', () => {
    expect(phrasePriority(stat({ strength: 0.2 }), NOW)).toBeLessThan(
      phrasePriority(stat({ strength: 0.9 }), NOW),
    );
  });
  it('brings back phrases not seen for a while', () => {
    const fresh = phrasePriority(stat({ strength: 0.9, lastSeen: NOW }), NOW);
    const stale = phrasePriority(stat({ strength: 0.9, lastSeen: NOW - 30 * DAY }), NOW);
    expect(stale).toBeLessThan(fresh);
  });
});

describe('buildQuickDeck', () => {
  const phrases = travelPhrases(dialogues);

  it('filters to the chosen situation', () => {
    const deck = buildQuickDeck({
      phrases,
      stats: new Map(),
      scenario: 'food',
      count: 8,
      now: NOW,
    });
    expect(deck.every((p) => p.theme === 'food')).toBe(true);
    expect(deck).toHaveLength(2);
  });

  it('never returns more than asked for', () => {
    const deck = buildQuickDeck({
      phrases,
      stats: new Map(),
      scenario: null,
      count: 3,
      now: NOW,
    });
    expect(deck).toHaveLength(3);
  });

  it('drills the weakest phrase first', () => {
    const stats = new Map<string, PhraseStat>([
      ['d01:0', stat({ id: 'd01:0', strength: 0.95 })],
      ['d01:2', stat({ id: 'd01:2', strength: 0.9 })],
      ['d02:0', stat({ id: 'd02:0', strength: 0.85 })],
      ['d02:1', stat({ id: 'd02:1', strength: 0.1 })],
    ]);
    const deck = buildQuickDeck({ phrases, stats, scenario: null, count: 1, now: NOW });
    expect(deck[0]!.id).toBe('d02:1');
  });

  it('a mixed deck varies the situation rather than stacking one', () => {
    const deck = buildQuickDeck({
      phrases,
      stats: new Map(),
      scenario: null,
      count: 4,
      now: NOW,
    });
    expect(deck[0]!.theme).not.toBe(deck[1]!.theme);
  });

  it('returns nothing for a situation with no phrases', () => {
    const deck = buildQuickDeck({
      phrases,
      stats: new Map(),
      scenario: 'emergency',
      count: 8,
      now: NOW,
    });
    expect(deck).toEqual([]);
  });
});

describe('spreadByTheme', () => {
  it('interleaves themes but keeps each theme in order', () => {
    const p = (id: string, theme: string): Phrase => ({
      id,
      ja: '',
      kana: '',
      en: '',
      scene: '',
      theme,
    });
    const out = spreadByTheme([p('a1', 'a'), p('a2', 'a'), p('a3', 'a'), p('b1', 'b')]);
    expect(out.map((x) => x.id)).toEqual(['a1', 'b1', 'a2', 'a3']);
  });
});

describe('ratePhrase', () => {
  it('creates a stat on first rating', () => {
    const s = ratePhrase(undefined, 'p1', true, NOW);
    expect(s).toMatchObject({ id: 'p1', seen: 1, got: 1, lastSeen: NOW });
    expect(s.strength).toBeGreaterThan(0);
  });

  it('"got it" raises strength but never past 1', () => {
    let s = ratePhrase(undefined, 'p1', true, NOW);
    for (let i = 0; i < 20; i++) s = ratePhrase(s, 'p1', true, NOW);
    expect(s.strength).toBeLessThanOrEqual(1);
    expect(s.strength).toBeGreaterThan(0.9);
  });

  it('"not yet" drops strength sharply so it comes back soon', () => {
    const strong = stat({ id: 'p1', strength: 0.9 });
    const after = ratePhrase(strong, 'p1', false, NOW);
    expect(after.strength).toBeLessThan(0.5);
    expect(after.got).toBe(strong.got);
    expect(after.seen).toBe(strong.seen + 1);
  });

  it('strength stays within 0..1', () => {
    const s = ratePhrase(stat({ strength: 0 }), 'p1', false, NOW);
    expect(s.strength).toBeGreaterThanOrEqual(0);
  });
});

describe('confidentCount', () => {
  it('counts only phrases at or above the confident threshold', () => {
    const stats = new Map<string, PhraseStat>([
      ['a', stat({ strength: 0.7 })],
      ['b', stat({ strength: 0.95 })],
      ['c', stat({ strength: 0.3 })],
    ]);
    expect(confidentCount(stats)).toBe(2);
  });
});
