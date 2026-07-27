import { describe, it, expect } from 'vitest';
import { kataToHira, levRatio, matchAnswer, normalizeJa, stripParticles } from './match';

describe('normalizeJa', () => {
  it('strips whitespace and punctuation', () => {
    expect(normalizeJa('えき は、 どこ です か？')).toBe('えきはどこですか');
  });
  it('converts katakana to hiragana', () => {
    expect(kataToHira('コンビニ')).toBe('こんびに');
    expect(normalizeJa('トイレ')).toBe('といれ');
  });
});

describe('stripParticles', () => {
  it('removes particle characters', () => {
    expect(stripParticles('えきはどこですか')).not.toContain('は');
  });
});

describe('levRatio', () => {
  it('is 1 for identical strings and 1 for two empty strings', () => {
    expect(levRatio('あいう', 'あいう')).toBe(1);
    expect(levRatio('', '')).toBe(1);
  });
  it('drops with distance', () => {
    expect(levRatio('あいうえお', 'かきくけこ')).toBe(0);
  });
});

describe('matchAnswer', () => {
  const expected = { ja: '駅はどこですか', kana: 'えきはどこですか' };

  it('exact kana transcript passes', () => {
    expect(matchAnswer('えきはどこですか', expected).pass).toBe(true);
  });

  it('kanji transcript passes against the kana reading (kanji↔kana equivalence)', () => {
    expect(matchAnswer('駅はどこですか', expected).pass).toBe(true);
  });

  it('katakana transcript passes', () => {
    expect(matchAnswer('エキハドコデスカ', expected).pass).toBe(true);
  });

  it('particle-only difference passes', () => {
    expect(matchAnswer('えきがどこですか', expected).pass).toBe(true);
    expect(matchAnswer('えきどこですか', expected).pass).toBe(true);
  });

  it('politeness-only difference passes', () => {
    // plain form of です question
    expect(matchAnswer('えきはどこ', expected).pass).toBe(true);
  });

  it('a genuinely different sentence fails', () => {
    const r = matchAnswer('みずをください', expected);
    expect(r.pass).toBe(false);
    expect(r.score).toBeLessThan(0.75);
  });

  it('empty transcript fails without throwing', () => {
    expect(matchAnswer('', expected).pass).toBe(false);
  });
});
