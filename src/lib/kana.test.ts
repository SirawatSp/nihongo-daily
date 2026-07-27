import { describe, it, expect } from 'vitest';
import {
  buildDrill,
  CONFUSABLE_PAIRS,
  isGraduated,
  KANA_TABLE,
  recordAnswer,
  weightFor,
  type KanaStat,
} from './kana';

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const stat = (char: string, seen: number, correct: number): KanaStat => ({
  char,
  seen,
  correct,
  lastSeen: 0,
});

describe('isGraduated', () => {
  it('requires 20+ reps AND >90% accuracy', () => {
    expect(isGraduated(stat('あ', 19, 19))).toBe(false); // too few reps
    expect(isGraduated(stat('あ', 20, 18))).toBe(false); // exactly 90% is not >90%
    expect(isGraduated(stat('あ', 20, 19))).toBe(true);
    expect(isGraduated(undefined)).toBe(false);
  });

  it('re-enters rotation when accuracy drops', () => {
    let s = stat('あ', 20, 19);
    expect(isGraduated(s)).toBe(true);
    for (let i = 0; i < 5; i++) s = recordAnswer(s, 'あ', false, 0);
    expect(isGraduated(s)).toBe(false);
  });
});

describe('weightFor', () => {
  it('weights confusables above ordinary characters', () => {
    expect(weightFor('さ', undefined)).toBeGreaterThan(weightFor('あ', undefined));
  });
  it('graduated characters get zero weight', () => {
    expect(weightFor('さ', stat('さ', 30, 30))).toBe(0);
  });
});

describe('buildDrill', () => {
  it('produces the requested number of items with 4 options each', () => {
    const items = buildDrill(new Map(), 20, seededRng(1));
    expect(items).toHaveLength(20);
    for (const item of items) {
      expect(item.options).toHaveLength(4);
      expect(item.options[item.answerIndex]).toBe(item.entry.romaji);
      expect(new Set(item.options).size).toBe(4);
    }
  });

  it('confusables appear measurably more often than uniform chance', () => {
    const confusables = new Set(CONFUSABLE_PAIRS.flat());
    const items = buildDrill(new Map(), 2000, seededRng(42));
    const hits = items.filter((i) => confusables.has(i.entry.char)).length;
    const uniformExpectation = (confusables.size / KANA_TABLE.length) * items.length;
    expect(hits).toBeGreaterThan(uniformExpectation * 2);
  });

  it('excludes graduated characters from rotation', () => {
    const stats = new Map([['さ', stat('さ', 40, 40)]]);
    const items = buildDrill(stats, 500, seededRng(7));
    expect(items.some((i) => i.entry.char === 'さ')).toBe(false);
  });

  it('confusable partner reading appears among the options', () => {
    const items = buildDrill(new Map(), 500, seededRng(3));
    const shi = items.find((i) => i.entry.char === 'シ');
    expect(shi).toBeDefined();
    expect(shi?.options).toContain('tsu'); // ツ is the partner of シ
  });
});

describe('recordAnswer', () => {
  it('creates a stat on first answer and accumulates', () => {
    let s = recordAnswer(undefined, 'ぬ', true, 100);
    s = recordAnswer(s, 'ぬ', false, 200);
    expect(s).toEqual({ char: 'ぬ', seen: 2, correct: 1, lastSeen: 200 });
  });
});
