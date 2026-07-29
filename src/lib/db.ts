// IndexedDB schema, migrations, and typed accessors. The DB is the source
// of truth; Zustand only holds in-flight session state.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { CardState } from './srs';
import type { KanaStat } from './kana';

export type BlockId = 'kana' | 'vocab' | 'kanji' | 'listening' | 'speaking' | 'reading';

/** Per-character handwriting progress, keyed by the kanji itself. */
export interface KanjiStat {
  char: string;
  attempts: number;
  completed: number;
  /** Best character accuracy achieved, 0..1. */
  best: number;
  /** Mean accuracy of the most recent attempts. */
  recent: number;
  lastSeen: number;
}

export interface SessionRecord {
  date: string; // YYYY-MM-DD
  completedBlocks: BlockId[];
  minutes: number;
  cardsReviewed: number;
  accuracy: number; // 0..1 across all graded blocks
}

export interface Favorite {
  id: string; // dialogue line id: `${dialogueId}:${lineIndex}`
  addedAt: number;
}

/**
 * A session that was started but not finished. Persisted so closing the app
 * part-way through resumes where you left off instead of restarting.
 */
export interface ActiveSession {
  date: string; // YYYY-MM-DD — only today's session is offered for resume
  blockIndex: number;
  completed: BlockId[];
  skipped: BlockId[];
  graded: { correct: number; total: number };
  cardsReviewed: number;
  /** Time actually spent in the session, excluding time the app was closed. */
  elapsedMs: number;
}

export interface Settings {
  newCardsPerDay: number;
  voiceURI: string | null;
  speechRate: number;
  theme: 'system' | 'light' | 'dark';
  furiganaDefault: boolean;
  /** Kanji writing: show the guide outline for the next stroke. */
  strokeHints: boolean;
  /** Kanji writing: hold strokes to a tighter standard. */
  strictStrokes: boolean;
  /** Kanji characters practised per writing block. */
  kanjiPerSession: number;
}

export const DEFAULT_SETTINGS: Settings = {
  newCardsPerDay: 10,
  voiceURI: null,
  speechRate: 1,
  theme: 'system',
  furiganaDefault: true,
  strokeHints: true,
  strictStrokes: false,
  kanjiPerSession: 4,
};

interface NihongoDB extends DBSchema {
  cards: { key: string; value: CardState; indexes: { 'by-due': number } };
  kanaStats: { key: string; value: KanaStat };
  kanjiStats: { key: string; value: KanjiStat };
  sessions: { key: string; value: SessionRecord };
  settings: { key: string; value: unknown };
  favorites: { key: string; value: Favorite };
  activeSession: { key: string; value: ActiveSession };
}

export const DB_NAME = 'nihongo-daily';
export const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<NihongoDB>> | null = null;

/**
 * Migration path. Each `if (oldVersion < N)` block upgrades one step; user
 * data is never dropped on a version bump — only added to or transformed.
 */
function migrate(db: IDBPDatabase<NihongoDB>, oldVersion: number): void {
  if (oldVersion < 1) {
    const cards = db.createObjectStore('cards', { keyPath: 'id' });
    cards.createIndex('by-due', 'due');
    db.createObjectStore('kanaStats', { keyPath: 'char' });
    db.createObjectStore('sessions', { keyPath: 'date' });
    db.createObjectStore('settings');
    db.createObjectStore('favorites', { keyPath: 'id' });
  }
  if (oldVersion < 2) {
    // Kanji handwriting practice. Purely additive — every existing store is
    // left untouched, so vocab/kana/streak progress carries over intact.
    db.createObjectStore('kanjiStats', { keyPath: 'char' });
  }
  if (oldVersion < 3) {
    // Resumable sessions. Additive; holds at most one in-flight session.
    db.createObjectStore('activeSession');
  }
}

export function getDb(): Promise<IDBPDatabase<NihongoDB>> {
  dbPromise ??= openDB<NihongoDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      migrate(db, oldVersion);
    },
  });
  return dbPromise;
}

// --- cards ---
export async function getAllCards(): Promise<CardState[]> {
  return (await getDb()).getAll('cards');
}
export async function putCard(card: CardState): Promise<void> {
  await (await getDb()).put('cards', card);
}
export async function putCards(cards: CardState[]): Promise<void> {
  const tx = (await getDb()).transaction('cards', 'readwrite');
  await Promise.all(cards.map((c) => tx.store.put(c)));
  await tx.done;
}

// --- kana stats ---
export async function getAllKanaStats(): Promise<Map<string, KanaStat>> {
  const all = await (await getDb()).getAll('kanaStats');
  return new Map(all.map((s) => [s.char, s]));
}
export async function putKanaStat(stat: KanaStat): Promise<void> {
  await (await getDb()).put('kanaStats', stat);
}

// --- kanji stats ---
export async function getAllKanjiStats(): Promise<Map<string, KanjiStat>> {
  const all = await (await getDb()).getAll('kanjiStats');
  return new Map(all.map((s) => [s.char, s]));
}

/** Record one completed character attempt, blending into a recent average. */
export async function recordKanjiAttempt(char: string, accuracy: number): Promise<void> {
  const db = await getDb();
  const prev = await db.get('kanjiStats', char);
  const next: KanjiStat = prev
    ? {
        char,
        attempts: prev.attempts + 1,
        completed: prev.completed + 1,
        best: Math.max(prev.best, accuracy),
        recent: Math.round((prev.recent * 0.6 + accuracy * 0.4) * 100) / 100,
        lastSeen: Date.now(),
      }
    : {
        char,
        attempts: 1,
        completed: 1,
        best: accuracy,
        recent: accuracy,
        lastSeen: Date.now(),
      };
  await db.put('kanjiStats', next);
}

// --- sessions ---
export async function getSession(date: string): Promise<SessionRecord | undefined> {
  return (await getDb()).get('sessions', date);
}
export async function putSession(record: SessionRecord): Promise<void> {
  await (await getDb()).put('sessions', record);
}
export async function getAllSessions(): Promise<SessionRecord[]> {
  return (await getDb()).getAll('sessions');
}

// --- active (unfinished) session ---
const ACTIVE_KEY = 'current';

export async function getActiveSession(): Promise<ActiveSession | undefined> {
  return (await getDb()).get('activeSession', ACTIVE_KEY);
}

export async function putActiveSession(session: ActiveSession): Promise<void> {
  await (await getDb()).put('activeSession', session, ACTIVE_KEY);
}

export async function clearActiveSession(): Promise<void> {
  await (await getDb()).delete('activeSession', ACTIVE_KEY);
}

// --- settings ---
export async function getSettings(): Promise<Settings> {
  const stored = (await (await getDb()).get('settings', 'app')) as Partial<Settings> | undefined;
  return { ...DEFAULT_SETTINGS, ...stored };
}
export async function putSettings(settings: Settings): Promise<void> {
  await (await getDb()).put('settings', settings, 'app');
}

// --- favorites ---
export async function getFavorites(): Promise<Favorite[]> {
  return (await getDb()).getAll('favorites');
}
export async function toggleFavorite(id: string): Promise<boolean> {
  const db = await getDb();
  const existing = await db.get('favorites', id);
  if (existing) {
    await db.delete('favorites', id);
    return false;
  }
  await db.put('favorites', { id, addedAt: Date.now() });
  return true;
}

// --- export / import ---
export interface ExportedData {
  version: number;
  exportedAt: string;
  cards: CardState[];
  kanaStats: KanaStat[];
  /** Added in v2; absent in backups taken from a v1 database. */
  kanjiStats?: KanjiStat[];
  sessions: SessionRecord[];
  settings: Settings;
  favorites: Favorite[];
}

export async function exportAll(): Promise<ExportedData> {
  const db = await getDb();
  return {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    cards: await db.getAll('cards'),
    kanaStats: await db.getAll('kanaStats'),
    kanjiStats: await db.getAll('kanjiStats'),
    sessions: await db.getAll('sessions'),
    settings: await getSettings(),
    favorites: await db.getAll('favorites'),
  };
}

export async function importAll(data: ExportedData): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(
    ['cards', 'kanaStats', 'kanjiStats', 'sessions', 'settings', 'favorites'],
    'readwrite',
  );
  await Promise.all([
    tx.objectStore('cards').clear(),
    tx.objectStore('kanaStats').clear(),
    tx.objectStore('kanjiStats').clear(),
    tx.objectStore('sessions').clear(),
    tx.objectStore('favorites').clear(),
  ]);
  for (const c of data.cards) void tx.objectStore('cards').put(c);
  for (const k of data.kanaStats) void tx.objectStore('kanaStats').put(k);
  for (const k of data.kanjiStats ?? []) void tx.objectStore('kanjiStats').put(k);
  for (const s of data.sessions) void tx.objectStore('sessions').put(s);
  for (const f of data.favorites) void tx.objectStore('favorites').put(f);
  void tx.objectStore('settings').put({ ...DEFAULT_SETTINGS, ...data.settings }, 'app');
  await tx.done;
}
