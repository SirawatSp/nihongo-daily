// SM-2 lite scheduler. Pure functions only — no React, no DB imports.

export type Grade = 'again' | 'hard' | 'good' | 'easy';
export type CardStatus = 'new' | 'learning' | 'known';

export interface CardState {
  id: string;
  due: number; // epoch ms
  interval: number; // days
  ease: number; // starts 2.5
  reps: number;
  lapses: number;
  status: CardStatus;
}

export const LADDER = [1, 3, 7, 16, 35] as const;
export const DAY_MS = 86_400_000;
export const EASE_START = 2.5;
export const EASE_FLOOR = 1.3;
export const KNOWN_INTERVAL = 21;

export function newCard(id: string, now: number): CardState {
  return { id, due: now, interval: 0, ease: EASE_START, reps: 0, lapses: 0, status: 'new' };
}

function nextLadderStep(interval: number): number {
  for (const step of LADDER) {
    if (step > interval) return step;
  }
  return -1; // past the ladder
}

function statusFor(interval: number): CardStatus {
  return interval >= KNOWN_INTERVAL ? 'known' : 'learning';
}

export function schedule(card: CardState, grade: Grade, now: number): CardState {
  let { interval, ease, lapses } = card;

  switch (grade) {
    case 'again':
      interval = 1;
      ease = Math.max(EASE_FLOOR, ease - 0.2);
      lapses += 1;
      break;
    case 'hard':
      interval = Math.max(1, interval * 1.2);
      ease = Math.max(EASE_FLOOR, ease - 0.15);
      break;
    case 'good': {
      const step = nextLadderStep(interval);
      interval = step === -1 ? interval * ease : step;
      break;
    }
    case 'easy':
      interval = Math.max(1, interval) * ease * 1.3;
      ease += 0.15;
      break;
  }

  interval = Math.round(interval * 100) / 100;

  return {
    ...card,
    interval,
    ease: Math.round(ease * 100) / 100,
    reps: card.reps + 1,
    lapses,
    due: now + interval * DAY_MS,
    status: grade === 'again' ? 'learning' : statusFor(interval),
  };
}

export function isDue(card: CardState, now: number): boolean {
  return card.due <= now;
}

/** Due cards first (oldest due first), then new cards up to `newLimit`. */
export function buildQueue(cards: CardState[], now: number, newLimit: number): CardState[] {
  const due = cards
    .filter((c) => c.status !== 'new' && isDue(c, now))
    .sort((a, b) => a.due - b.due);
  const fresh = cards.filter((c) => c.status === 'new').slice(0, Math.max(0, newLimit));
  return [...due, ...fresh];
}
