import { TRIP_LESSONS } from '../data/trip';
import type { TripProgress } from './db';

export const TRIP_STEPS = 7; // Learn three, recall three, understand one reply.
export function freshTripProgress(id: string): TripProgress {
  return { id, step: 0, recalled: 0, listeningCorrect: null };
}
export function nextTripLesson(progress: readonly TripProgress[]) {
  const done = new Set(progress.filter((p) => p.completedAt).map((p) => p.id));
  return (
    TRIP_LESSONS.find((l) => !done.has(l.id)) ??
    TRIP_LESSONS[TRIP_LESSONS.length - 1]!
  );
}
export function advanceTrip(
  progress: TripProgress,
  got?: boolean,
  now = new Date(),
): TripProgress {
  if (progress.step >= TRIP_STEPS) return progress;
  const next = { ...progress, step: progress.step + 1 };
  if (progress.step >= 3 && progress.step < 6 && got) next.recalled += 1;
  if (progress.step === 6) next.listeningCorrect = got ?? false;
  if (next.step === TRIP_STEPS) next.completedAt = now.toISOString();
  return next;
}
export function daysUntil(departure: string, today: string): number {
  // UTC date-only arithmetic avoids daylight-saving and time-of-day drift.
  return Math.ceil((Date.parse(departure) - Date.parse(today)) / 86_400_000);
}
