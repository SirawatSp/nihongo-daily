import { describe, expect, it } from 'vitest';
import { ESSENTIAL_PHRASES, TRIP_LESSONS } from '../data/trip';
import {
  advanceTrip,
  daysUntil,
  freshTripProgress,
  nextTripLesson,
  TRIP_STEPS,
} from './trip';

describe('beginner travel plan', () => {
  it('provides fourteen lessons with three complete phrases and an unambiguous reply question', () => {
    expect(TRIP_LESSONS).toHaveLength(14);
    expect(new Set(TRIP_LESSONS.map((l) => l.id)).size).toBe(14);
    expect(ESSENTIAL_PHRASES).toHaveLength(36);
    expect(new Set(ESSENTIAL_PHRASES.map((p) => p.id)).size).toBe(36);
    for (const lesson of TRIP_LESSONS) {
      expect(lesson.phrases).toHaveLength(3);
      for (const phrase of lesson.phrases) {
        for (const text of Object.values(phrase))
          expect(text.trim().length).toBeGreaterThan(0);
      }
      expect(new Set([lesson.reply.en, ...lesson.distractors]).size).toBe(3);
      expect(lesson.replyContext).toBeTruthy();
    }
  });
  it('never treats partial practice as a completed lesson', () => {
    let progress = freshTripProgress('politeness');
    for (let i = 0; i < TRIP_STEPS - 1; i++) {
      progress = advanceTrip(progress, true);
      expect(progress.completedAt).toBeUndefined();
    }
    expect(progress.recalled).toBe(3);
    expect(nextTripLesson([progress]).id).toBe('politeness');
    const done = advanceTrip(progress, false, new Date('2026-10-08T12:00:00Z'));
    expect(done.completedAt).toBe('2026-10-08T12:00:00.000Z');
    expect(done.listeningCorrect).toBe(false);
    expect(nextTripLesson([done]).id).toBe('repair');
    expect(advanceTrip(done, true)).toEqual(done);
  });
  it('only counts recall ratings in the recall stage', () => {
    let p = freshTripProgress('politeness');
    for (let i = 0; i < 3; i++) p = advanceTrip(p, true);
    expect(p.recalled).toBe(0);
    p = advanceTrip(p, false);
    p = advanceTrip(p, true);
    p = advanceTrip(p, false);
    expect(p.recalled).toBe(1);
  });
  it('counts departure days without time or daylight-saving drift', () => {
    expect(daysUntil('2026-10-22', '2026-10-08')).toBe(14);
    expect(daysUntil('2026-10-22', '2026-10-22')).toBe(0);
    expect(daysUntil('2026-10-22', '2026-10-23')).toBe(-1);
  });
});
