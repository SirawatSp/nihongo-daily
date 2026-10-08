import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TRIP_LESSONS } from '../data/trip';
import { getSettings, getTripProgress, type TripProgress } from '../lib/db';
import { daysUntil, nextTripLesson, TRIP_STEPS } from '../lib/trip';
import { dateKey } from '../lib/streak';

export default function Home() {
  const [progress, setProgress] = useState<TripProgress[]>([]);
  const [departure, setDeparture] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    void Promise.all([getTripProgress(), getSettings()])
      .then(([all, settings]) => {
        if (!live) return;
        setProgress(all);
        setDeparture(settings.tripDepartureDate);
        setLoaded(true);
      })
      .catch(() => {
        if (live)
          setError('Could not load your plan. Please reload to try again.');
      });
    return () => {
      live = false;
    };
  }, []);
  const completed = TRIP_LESSONS.filter((l) =>
    progress.some((p) => p.id === l.id && p.completedAt),
  ).length;
  const next = nextTripLesson(progress);
  const checkpoint = progress.find((p) => p.id === next.id);
  const remaining = daysUntil(departure, dateKey(new Date()));
  const allDone = completed === TRIP_LESSONS.length;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 pt-3">
        <div>
          <p className="eyebrow">Your pocket Japanese</p>
          <h1 className="mt-1 font-display text-2xl">
            Nihongo Daily<span className="text-accent">.</span>
          </h1>
        </div>
        <span lang="ja" aria-hidden="true" className="travel-stamp">
          日本
        </span>
      </header>
      <section className="trip-hero" aria-labelledby="trip-title">
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow">The departure plan</p>
          <Link to="/settings" className="text-xs underline underline-offset-4">
            {departure
              ? remaining > 0
                ? `${remaining} days to go`
                : 'Ready for your trip'
              : 'Set departure'}
          </Link>
        </div>
        <h2
          id="trip-title"
          className="mt-5 font-display text-3xl leading-tight sm:text-4xl"
        >
          A little Japanese.
          <br />A better trip.
        </h2>
        <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          Polite, beginner phrases for the moments that matter. Learn what to
          say—and understand what comes back.
        </p>
        <div className="mt-6 flex gap-4 border-t border-zinc-400/30 pt-4 text-xs">
          <span>14 short lessons</span>
          <span>3 phrases a day</span>
          <span>~5–8 min</span>
        </div>
      </section>
      {error && <p role="alert">{error}</p>}
      {!loaded && !error ? (
        <p role="status">Loading your plan…</p>
      ) : (
        loaded && (
          <>
            <section className="space-y-4" aria-labelledby="next-lesson">
              <div className="flex items-center justify-between">
                <h2 id="next-lesson" className="eyebrow">
                  {allDone ? 'Keep it fresh' : 'Your next lesson'}
                </h2>
                <span className="text-xs text-zinc-600 dark:text-zinc-300">
                  {completed} / 14 practised
                </span>
              </div>
              <progress
                className="h-1.5 w-full"
                max={14}
                value={completed}
                aria-label="Travel lessons practised"
              />
              <Link to={`/trip/${next.id}`} className="lesson-ticket">
                <span className="ticket-number">
                  {String(TRIP_LESSONS.indexOf(next) + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0">
                  <span className="mb-1 block text-xs text-accent dark:text-accent-dark">
                    {checkpoint &&
                    checkpoint.step > 0 &&
                    checkpoint.step < TRIP_STEPS
                      ? 'Continue where you stopped'
                      : allDone
                        ? 'Review your final rehearsal'
                        : next.theme}
                  </span>
                  <span className="block text-lg font-semibold">
                    {next.title}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {next.goal}
                  </span>
                </span>
                <span aria-hidden="true" className="text-xl">
                  →
                </span>
              </Link>
              <Link to={`/trip/${next.id}`} className="primary-link">
                {checkpoint &&
                checkpoint.step > 0 &&
                checkpoint.step < TRIP_STEPS
                  ? 'Continue lesson'
                  : allDone
                    ? 'Review lesson'
                    : 'Start today’s lesson'}{' '}
                →
              </Link>
            </section>
            <section
              className="grid grid-cols-2 gap-3"
              aria-label="Travel shortcuts"
            >
              <Link to="/phrasebook" className="shortcut-card">
                <span className="eyebrow">On the trip</span>
                <span className="mt-2 block font-semibold">
                  Find a phrase ↗
                </span>
                <span className="mt-1 block text-xs text-zinc-600 dark:text-zinc-300">
                  Search, listen, or show staff
                </span>
              </Link>
              <Link to="/quick" className="shortcut-card">
                <span className="eyebrow">Have 3 minutes?</span>
                <span className="mt-2 block font-semibold">Quick recall ↗</span>
                <span className="mt-1 block text-xs text-zinc-600 dark:text-zinc-300">
                  Rehearse one situation
                </span>
              </Link>
            </section>
            <section aria-labelledby="your-plan">
              <h2 id="your-plan" className="mb-3 font-display text-2xl">
                Your two-week route
              </h2>
              <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
                One lesson a day. Revisit any lesson whenever you want. Reading
                kana and writing kanji are optional extras.
              </p>
              <ol className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {TRIP_LESSONS.map((lesson, i) => {
                  const saved = progress.find((p) => p.id === lesson.id);
                  const status = saved?.completedAt
                    ? 'Practised'
                    : saved && saved.step > 0
                      ? 'In progress'
                      : '~5–8 min';
                  return (
                    <li key={lesson.id}>
                      <Link
                        to={`/trip/${lesson.id}`}
                        className="flex min-h-16 items-center gap-4 py-3"
                      >
                        <span className="w-7 shrink-0 font-mono text-sm text-zinc-500">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="flex-1">
                          <span className="block font-medium">
                            {lesson.title}
                          </span>
                          <span className="block text-xs text-zinc-600 dark:text-zinc-300">
                            {lesson.theme} · {status}
                          </span>
                        </span>
                        <span aria-hidden="true">
                          {saved?.completedAt ? '✓' : '→'}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>
          </>
        )
      )}
      <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
        Pronunciation bridge: ā, ī, ū, ē, ō are long vowels. Listen and imitate
        the rhythm. A short polite phrase, a gesture, and a follow-up question
        go a long way.
      </p>
    </div>
  );
}
