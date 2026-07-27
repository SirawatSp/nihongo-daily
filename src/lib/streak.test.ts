import { describe, it, expect } from 'vitest';
import { addDays, currentStreak, dateKey, lastNDays, longestStreak } from './streak';

describe('dateKey / addDays', () => {
  it('formats local dates as YYYY-MM-DD', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
  it('crosses month and year boundaries', () => {
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });
});

describe('currentStreak', () => {
  it('is 0 with no sessions', () => {
    expect(currentStreak([], '2026-01-10')).toBe(0);
  });
  it('counts consecutive days ending today', () => {
    expect(currentStreak(['2026-01-08', '2026-01-09', '2026-01-10'], '2026-01-10')).toBe(3);
  });
  it('an unfinished today does not break a live streak', () => {
    expect(currentStreak(['2026-01-08', '2026-01-09'], '2026-01-10')).toBe(2);
  });
  it('a missed day resets the streak', () => {
    expect(currentStreak(['2026-01-05', '2026-01-06', '2026-01-10'], '2026-01-10')).toBe(1);
  });
});

describe('longestStreak', () => {
  it('finds the longest run anywhere in history', () => {
    const days = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-07', '2026-01-08'];
    expect(longestStreak(days)).toBe(3);
  });
  it('ignores duplicates', () => {
    expect(longestStreak(['2026-01-01', '2026-01-01', '2026-01-02'])).toBe(2);
  });
});

describe('lastNDays', () => {
  it('returns n keys ending today, oldest first', () => {
    const days = lastNDays('2026-01-10', 3);
    expect(days).toEqual(['2026-01-08', '2026-01-09', '2026-01-10']);
  });
});
