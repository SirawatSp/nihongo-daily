import { openDB } from 'idb';
import { expect, it } from 'vitest';
import { DB_NAME, getAllSessions, getDb, getSettings, getTripProgress, putTripProgress } from './db';

it('upgrades an existing v4 database without losing sessions or settings', async () => {
  const old = await openDB(DB_NAME, 4, {
    upgrade(db) {
      const cards = db.createObjectStore('cards', { keyPath: 'id' });
      cards.createIndex('by-due', 'due');
      db.createObjectStore('kanaStats', { keyPath: 'char' });
      db.createObjectStore('kanjiStats', { keyPath: 'char' });
      db.createObjectStore('sessions', { keyPath: 'date' });
      db.createObjectStore('settings');
      db.createObjectStore('favorites', { keyPath: 'id' });
      db.createObjectStore('activeSession');
      db.createObjectStore('phraseStats', { keyPath: 'id' });
    },
  });
  const session = { date: '2026-10-07', completedBlocks: ['kana'], minutes: 3, cardsReviewed: 0, accuracy: 0.8 };
  await old.put('sessions', session);
  await old.put('settings', { speechRate: 0.9, theme: 'dark' }, 'app');
  old.close();
  expect((await getDb()).version).toBe(5);
  expect(await getAllSessions()).toEqual([session]);
  expect(await getSettings()).toMatchObject({ speechRate: 0.9, theme: 'dark', tripDepartureDate: '2026-10-22' });
  await putTripProgress({ id: 'politeness', step: 1, recalled: 0, listeningCorrect: null });
  expect(await getTripProgress()).toHaveLength(1);
});
