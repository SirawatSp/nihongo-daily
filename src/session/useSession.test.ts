import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BLOCKS, sessionMinutes, useSession } from './useSession';

const MIN = 60_000;

describe('sessionMinutes', () => {
  it('counts only time actually spent, not time the app was closed', () => {
    // 7 minutes banked, resumed 3 minutes ago → 10, regardless of the gap.
    const now = Date.parse('2026-03-01T12:00:00Z');
    const minutes = sessionMinutes(
      { elapsedMs: 7 * MIN, tickAt: now - 3 * MIN, active: true },
      now,
    );
    expect(minutes).toBe(10);
  });

  it('ignores the live stretch once the session is inactive', () => {
    const now = Date.parse('2026-03-01T12:00:00Z');
    expect(sessionMinutes({ elapsedMs: 5 * MIN, tickAt: now - 99 * MIN, active: false }, now)).toBe(
      5,
    );
  });

  it('never reports zero minutes for a session that happened', () => {
    const now = 1000;
    expect(sessionMinutes({ elapsedMs: 200, tickAt: now, active: true }, now)).toBe(1);
  });
});

describe('useSession', () => {
  beforeEach(() => {
    useSession.getState().reset();
    vi.restoreAllMocks();
  });

  it('starts inactive and becomes active on start()', () => {
    expect(useSession.getState().active).toBe(false);
    useSession.getState().start();
    expect(useSession.getState().active).toBe(true);
    expect(useSession.getState().blockIndex).toBe(0);
  });

  it('accumulates graded results and cards across blocks', () => {
    const s = useSession.getState();
    s.start();
    useSession.getState().finishBlock('kana', { correct: 15, total: 20 });
    useSession.getState().finishBlock('vocab', { correct: 8, total: 10, cards: 10 });
    const after = useSession.getState();
    expect(after.graded).toEqual({ correct: 23, total: 30 });
    expect(after.cardsReviewed).toBe(10);
    expect(after.completed).toEqual(['kana', 'vocab']);
    expect(after.blockIndex).toBe(2);
  });

  it('records a skip without counting it as completed', () => {
    useSession.getState().start();
    useSession.getState().skipBlock('kana');
    const after = useSession.getState();
    expect(after.skipped).toEqual(['kana']);
    expect(after.completed).toEqual([]);
    expect(after.blockIndex).toBe(1);
  });

  it('banks elapsed time when a block finishes', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    useSession.getState().start();
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000 + 2 * MIN);
    useSession.getState().finishBlock('kana', { correct: 1, total: 1 });
    expect(useSession.getState().elapsedMs).toBe(2 * MIN);
  });

  it('resume() restores saved progress and keeps banked time', () => {
    useSession.getState().resume({
      date: '2026-03-01',
      blockIndex: 3,
      completed: ['kana', 'vocab', 'kanji'],
      skipped: [],
      graded: { correct: 20, total: 25 },
      cardsReviewed: 9,
      elapsedMs: 11 * MIN,
    });
    const s = useSession.getState();
    expect(s.active).toBe(true);
    expect(s.blockIndex).toBe(3);
    expect(s.completed).toHaveLength(3);
    expect(s.graded).toEqual({ correct: 20, total: 25 });
    expect(s.cardsReviewed).toBe(9);
    expect(s.elapsedMs).toBe(11 * MIN);
  });

  it('a resumed session continues to the summary rather than restarting', () => {
    useSession.getState().resume({
      date: '2026-03-01',
      blockIndex: BLOCKS.length - 1,
      completed: BLOCKS.slice(0, -1).map((b) => b.id),
      skipped: [],
      graded: { correct: 1, total: 1 },
      cardsReviewed: 0,
      elapsedMs: MIN,
    });
    useSession.getState().finishBlock('reading', { correct: 1, total: 1 });
    expect(useSession.getState().blockIndex).toBe(BLOCKS.length);
  });

  it('reset() clears everything', () => {
    useSession.getState().start();
    useSession.getState().finishBlock('kana', { correct: 5, total: 5 });
    useSession.getState().reset();
    const s = useSession.getState();
    expect(s.active).toBe(false);
    expect(s.blockIndex).toBe(0);
    expect(s.completed).toEqual([]);
  });
});
