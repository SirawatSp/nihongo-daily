// Session orchestration: block sequencing, timing, and result accumulation.
// IndexedDB stays the source of truth; this store holds in-flight state and
// mirrors it to `activeSession` so a closed app resumes where it left off.
import { create } from 'zustand';
import {
  clearActiveSession,
  putActiveSession,
  type ActiveSession,
  type BlockId,
} from '../lib/db';
import { dateKey } from '../lib/streak';

export const BLOCKS: { id: BlockId; label: string }[] = [
  { id: 'kana', label: 'Kana' },
  { id: 'vocab', label: 'Vocab' },
  // Writing comes straight after vocab so you draw the characters while the
  // words you just reviewed are still fresh.
  { id: 'kanji', label: 'Writing' },
  { id: 'listening', label: 'Listening' },
  { id: 'speaking', label: 'Speaking' },
  { id: 'reading', label: 'Reading' },
];

export interface BlockResult {
  correct: number;
  total: number; // 0 for ungraded blocks (speaking practice)
  cards?: number; // vocab block: cards reviewed
}

interface SessionStore {
  active: boolean;
  blockIndex: number; // 0..5 active, 6 = summary
  completed: BlockId[];
  skipped: BlockId[];
  graded: { correct: number; total: number };
  cardsReviewed: number;
  /** Time spent in the session so far, excluding time the app was closed. */
  elapsedMs: number;
  /** When the current stretch of activity began. */
  tickAt: number;
  start: () => void;
  resume: (saved: ActiveSession) => void;
  finishBlock: (id: BlockId, result: BlockResult) => void;
  skipBlock: (id: BlockId) => void;
  reset: () => void;
}

const initial = {
  active: false,
  blockIndex: 0,
  completed: [] as BlockId[],
  skipped: [] as BlockId[],
  graded: { correct: 0, total: 0 },
  cardsReviewed: 0,
  elapsedMs: 0,
  tickAt: 0,
};

/** Total minutes spent, counting the stretch currently in progress. */
export function sessionMinutes(state: {
  elapsedMs: number;
  tickAt: number;
  active: boolean;
}, now = Date.now()): number {
  const live = state.active && state.tickAt > 0 ? now - state.tickAt : 0;
  return Math.max(1, Math.round((state.elapsedMs + live) / 60000));
}

export const useSession = create<SessionStore>((set) => ({
  ...initial,

  start: () => set({ ...initial, active: true, tickAt: Date.now() }),

  resume: (saved) =>
    set({
      active: true,
      blockIndex: saved.blockIndex,
      completed: saved.completed,
      skipped: saved.skipped,
      graded: saved.graded,
      cardsReviewed: saved.cardsReviewed,
      elapsedMs: saved.elapsedMs,
      tickAt: Date.now(),
    }),

  finishBlock: (id, result) =>
    set((s) => {
      const now = Date.now();
      return {
        blockIndex: s.blockIndex + 1,
        completed: [...s.completed, id],
        graded: {
          correct: s.graded.correct + result.correct,
          total: s.graded.total + result.total,
        },
        cardsReviewed: s.cardsReviewed + (result.cards ?? 0),
        elapsedMs: s.elapsedMs + (s.tickAt > 0 ? now - s.tickAt : 0),
        tickAt: now,
      };
    }),

  skipBlock: (id) =>
    set((s) => {
      const now = Date.now();
      return {
        blockIndex: s.blockIndex + 1,
        skipped: [...s.skipped, id],
        elapsedMs: s.elapsedMs + (s.tickAt > 0 ? now - s.tickAt : 0),
        tickAt: now,
      };
    }),

  reset: () => set(initial),
}));

/**
 * Mirror in-flight state to IndexedDB after every change, so closing the app
 * mid-session loses nothing. The record is removed once the session is
 * finished (the summary writes a permanent SessionRecord instead).
 */
useSession.subscribe((state) => {
  if (!state.active) return;
  if (state.blockIndex >= BLOCKS.length) return; // summary clears it instead
  void putActiveSession({
    date: dateKey(new Date()),
    blockIndex: state.blockIndex,
    completed: state.completed,
    skipped: state.skipped,
    graded: state.graded,
    cardsReviewed: state.cardsReviewed,
    elapsedMs: state.elapsedMs + (state.tickAt > 0 ? Date.now() - state.tickAt : 0),
  });
});

/** Finish the session: drop the resume record. */
export async function endSession(): Promise<void> {
  await clearActiveSession();
}
