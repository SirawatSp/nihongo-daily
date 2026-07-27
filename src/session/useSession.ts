// Session orchestration: block sequencing, timing, and result accumulation.
// IndexedDB stays the source of truth; this store only holds in-flight state.
import { create } from 'zustand';
import type { BlockId } from '../lib/db';

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
  startedAt: number | null;
  blockIndex: number; // 0..4 active, 5 = summary
  completed: BlockId[];
  skipped: BlockId[];
  graded: { correct: number; total: number };
  cardsReviewed: number;
  start: () => void;
  finishBlock: (id: BlockId, result: BlockResult) => void;
  skipBlock: (id: BlockId) => void;
  reset: () => void;
}

const initial = {
  startedAt: null,
  blockIndex: 0,
  completed: [] as BlockId[],
  skipped: [] as BlockId[],
  graded: { correct: 0, total: 0 },
  cardsReviewed: 0,
};

export const useSession = create<SessionStore>((set) => ({
  ...initial,
  start: () => set({ ...initial, startedAt: Date.now() }),
  finishBlock: (id, result) =>
    set((s) => ({
      blockIndex: s.blockIndex + 1,
      completed: [...s.completed, id],
      graded: {
        correct: s.graded.correct + result.correct,
        total: s.graded.total + result.total,
      },
      cardsReviewed: s.cardsReviewed + (result.cards ?? 0),
    })),
  skipBlock: (id) =>
    set((s) => ({ blockIndex: s.blockIndex + 1, skipped: [...s.skipped, id] })),
  reset: () => set(initial),
}));
