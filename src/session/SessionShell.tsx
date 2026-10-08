import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BLOCKS, endSession, sessionMinutes, useSession } from './useSession';
import KanaDrill from './blocks/KanaDrill';
import VocabSrs from './blocks/VocabSrs';
import KanjiWriting from './blocks/KanjiWriting';
import Listening from './blocks/Listening';
import Speaking from './blocks/Speaking';
import Reading from './blocks/Reading';
import { getAllSessions, putSession } from '../lib/db';
import { currentStreak, dateKey } from '../lib/streak';
import { Card } from '../components/ui';

function ProgressRail() {
  const { blockIndex, skipped } = useSession();
  return (
    <ol aria-label="Session progress" className="mb-4 flex gap-1.5">
      {BLOCKS.map((b, i) => (
        <li
          key={b.id}
          aria-current={i === blockIndex ? 'step' : undefined}
          className={`h-1.5 flex-1 rounded-full ${
            i < blockIndex
              ? skipped.includes(b.id)
                ? 'bg-zinc-300 dark:bg-zinc-700'
                : 'bg-accent dark:bg-accent-dark'
              : i === blockIndex
                ? 'bg-accent/40 dark:bg-accent-dark/40'
                : 'bg-zinc-200 dark:bg-zinc-800'
          }`}
        >
          <span className="sr-only">{b.label}</span>
        </li>
      ))}
    </ol>
  );
}

function Summary() {
  const state = useSession();
  const { completed, graded, cardsReviewed } = state;
  const [streak, setStreak] = useState<number | null>(null);
  const [error, setError] = useState('');
  const meaningful = completed.length > 0;
  const saved = useRef(false);
  const minutes = useRef(sessionMinutes(state)).current;
  const accuracy = graded.total > 0 ? graded.correct / graded.total : 0;

  useEffect(() => {
    if (saved.current) return;
    saved.current = true;
    const today = dateKey(new Date());
    const record = {
      date: today,
      completedBlocks: completed,
      minutes,
      cardsReviewed,
      accuracy,
    };
    void (meaningful ? putSession(record) : Promise.resolve())
      // The session is finished, so the resume record is no longer wanted.
      .then(endSession)
      .then(getAllSessions)
      .then((all) =>
        setStreak(
          currentStreak(
            all.map((s) => s.date),
            today,
          ),
        ),
      )
      .catch(() =>
        setError(
          'Could not save the session. Your previous progress is unchanged.',
        ),
      );
  }, [completed, minutes, cardsReviewed, accuracy, meaningful]);

  return (
    <Card className="mt-8 text-center">
      <h2 className="mb-3 text-xl font-semibold">
        {meaningful
          ? state.skipped.length > 0
            ? 'Partial practice saved'
            : 'Session done'
          : 'No sections completed'}
      </h2>
      <p className="mb-6 text-sm text-zinc-500">
        {meaningful
          ? `${completed.length} of ${BLOCKS.length} sections completed.`
          : 'Skipped sections do not count toward your study streak.'}
      </p>
      {error && <p role="alert">{error}</p>}
      <dl className="mb-8 space-y-3 text-left">
        <div className="flex justify-between">
          <dt className="text-zinc-500">Vocabulary cards reviewed</dt>
          <dd className="font-medium">{cardsReviewed}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-zinc-500">Accuracy</dt>
          <dd className="font-medium">
            {graded.total > 0 ? `${Math.round(accuracy * 100)}%` : '—'}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-zinc-500">Streak</dt>
          <dd className="font-medium">
            {streak === null
              ? '…'
              : `${streak} ${streak === 1 ? 'day' : 'days'}`}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-zinc-500">Minutes</dt>
          <dd className="font-medium">{minutes}</dd>
        </div>
      </dl>
      <Link to="/" className="primary-link">
        Back to home
      </Link>
    </Card>
  );
}

export default function SessionShell() {
  const { blockIndex, active, finishBlock, skipBlock } = useSession();

  if (!active) return null;
  if (blockIndex >= BLOCKS.length) return <Summary />;

  const block = BLOCKS[blockIndex];
  if (!block) return <Summary />;

  const common = {
    onDone: finishBlock,
    onSkip: () => skipBlock(block.id),
  };

  return (
    <div>
      <Link
        to="/more"
        className="mb-3 inline-flex min-h-11 items-center text-sm text-zinc-500"
      >
        ← Exit full session
      </Link>
      <ProgressRail />
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {block.label}
        </h1>
        <button
          onClick={common.onSkip}
          className="min-h-11 rounded-lg px-3 text-sm text-zinc-400"
        >
          Skip section
        </button>
      </div>
      {block.id === 'kana' && <KanaDrill {...common} />}
      {block.id === 'vocab' && <VocabSrs {...common} />}
      {block.id === 'kanji' && <KanjiWriting {...common} />}
      {block.id === 'listening' && <Listening {...common} />}
      {block.id === 'speaking' && <Speaking {...common} />}
      {block.id === 'reading' && <Reading {...common} />}
    </div>
  );
}
