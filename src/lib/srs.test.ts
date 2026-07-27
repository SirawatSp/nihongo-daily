import { describe, it, expect } from 'vitest';
import { buildQueue, DAY_MS, EASE_FLOOR, newCard, schedule, type CardState } from './srs';

const NOW = Date.parse('2026-01-01T09:00:00Z');

describe('schedule', () => {
  it('again resets interval to 1, drops ease by 0.20, counts a lapse', () => {
    const card: CardState = { ...newCard('a', NOW), interval: 16, ease: 2.5, status: 'learning' };
    const next = schedule(card, 'again', NOW);
    expect(next.interval).toBe(1);
    expect(next.ease).toBe(2.3);
    expect(next.lapses).toBe(1);
    expect(next.status).toBe('learning');
    expect(next.due).toBe(NOW + DAY_MS);
  });

  it('ease never drops below the 1.3 floor', () => {
    let card: CardState = { ...newCard('a', NOW), interval: 3, status: 'learning' };
    for (let i = 0; i < 20; i++) card = schedule(card, 'again', NOW);
    expect(card.ease).toBe(EASE_FLOOR);
  });

  it('hard multiplies interval by 1.2 and drops ease by 0.15', () => {
    const card: CardState = { ...newCard('a', NOW), interval: 10, status: 'learning' };
    const next = schedule(card, 'hard', NOW);
    expect(next.interval).toBe(12);
    expect(next.ease).toBe(2.35);
  });

  it('good walks the ladder 1 → 3 → 7 → 16 → 35', () => {
    let card = newCard('a', NOW);
    const seen: number[] = [];
    for (let i = 0; i < 5; i++) {
      card = schedule(card, 'good', NOW);
      seen.push(card.interval);
    }
    expect(seen).toEqual([1, 3, 7, 16, 35]);
    expect(card.ease).toBe(2.5); // good leaves ease unchanged
  });

  it('good past the ladder multiplies by ease', () => {
    const card: CardState = { ...newCard('a', NOW), interval: 35, status: 'learning' };
    const next = schedule(card, 'good', NOW);
    expect(next.interval).toBe(87.5);
  });

  it('easy multiplies by ease * 1.3 and raises ease', () => {
    const card: CardState = { ...newCard('a', NOW), interval: 10, status: 'learning' };
    const next = schedule(card, 'easy', NOW);
    expect(next.interval).toBe(32.5);
    expect(next.ease).toBe(2.65);
  });

  it('a new card graded easy gets a real interval (not 0)', () => {
    const next = schedule(newCard('a', NOW), 'easy', NOW);
    expect(next.interval).toBeGreaterThanOrEqual(1);
  });

  it('status becomes known at interval >= 21', () => {
    const card: CardState = { ...newCard('a', NOW), interval: 16, status: 'learning' };
    const next = schedule(card, 'good', NOW); // → 35
    expect(next.status).toBe('known');
  });

  it('reps increments on every grade', () => {
    let card = newCard('a', NOW);
    card = schedule(card, 'good', NOW);
    card = schedule(card, 'hard', NOW);
    expect(card.reps).toBe(2);
  });
});

describe('buildQueue', () => {
  const mk = (id: string, over: Partial<CardState>): CardState => ({ ...newCard(id, NOW), ...over });

  it('due cards come first, oldest first, then new cards capped', () => {
    const cards = [
      mk('new1', {}),
      mk('new2', {}),
      mk('new3', {}),
      mk('due-late', { status: 'learning', due: NOW - DAY_MS }),
      mk('due-early', { status: 'learning', due: NOW - 3 * DAY_MS }),
      mk('future', { status: 'learning', due: NOW + DAY_MS }),
    ];
    const q = buildQueue(cards, NOW, 2);
    expect(q.map((c) => c.id)).toEqual(['due-early', 'due-late', 'new1', 'new2']);
  });

  it('a card due tomorrow resurfaces exactly when the clock passes due', () => {
    const card = schedule(newCard('a', NOW), 'good', NOW); // due in 1 day
    expect(buildQueue([card], NOW + DAY_MS - 1, 10)).toHaveLength(0);
    expect(buildQueue([card], NOW + DAY_MS, 10)).toHaveLength(1);
  });

  it('reviews are uncapped; only new cards obey the limit', () => {
    const cards = [
      ...Array.from({ length: 30 }, (_, i) =>
        mk(`d${i}`, { status: 'learning' as const, due: NOW - 1 }),
      ),
      ...Array.from({ length: 15 }, (_, i) => mk(`n${i}`, {})),
    ];
    const q = buildQueue(cards, NOW, 10);
    expect(q).toHaveLength(40);
    expect(q.filter((c) => c.status === 'new')).toHaveLength(10);
  });
});
