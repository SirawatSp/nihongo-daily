import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BLOCKS, useSession } from './useSession';
import KanaDrill from './blocks/KanaDrill';
import VocabSrs from './blocks/VocabSrs';
import KanjiWriting from './blocks/KanjiWriting';
import Listening from './blocks/Listening';
import Speaking from './blocks/Speaking';
import Reading from './blocks/Reading';
import { getAllSessions, putSession } from '../lib/db';
import { currentStreak, dateKey } from '../lib/streak';
import { Button, Card } from '../components/ui';

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
  const { startedAt, completed, graded, cardsReviewed } = useSession();
  const [streak, setStreak] = useState<number | null>(null);
  const saved = useRef(false);
  const minutes = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 60000)) : 0;
  const accuracy = graded.total > 0 ? graded.correct / graded.total : 0;

  useEffect(() => {
    if (saved.current) return;
    saved.current = true;
    const today = dateKey(new Date());
    void putSession({
      date: today,
      completedBlocks: completed,
      minutes,
      cardsReviewed,
      accuracy,
    })
      .then(getAllSessions)
      .then((all) => setStreak(currentStreak(all.map((s) => s.date), today)));
  }, [completed, minutes, cardsReviewed, accuracy]);

  return (
    <Card className="mt-8 text-center">
      <h2 className="mb-6 text-xl font-semibold">Session done</h2>
      <dl className="mb-8 space-y-3 text-left">
        <div className="flex justify-between">
          <dt className="text-zinc-500">Cards reviewed</dt>
          <dd className="font-medium">{cardsReviewed}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-zinc-500">Accuracy</dt>
          <dd className="font-medium">{graded.total > 0 ? `${Math.round(accuracy * 100)}%` : '—'}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-zinc-500">Streak</dt>
          <dd className="font-medium">{streak === null ? '…' : `${streak} days`}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-zinc-500">Minutes</dt>
          <dd className="font-medium">{minutes}</dd>
        </div>
      </dl>
      <Link to="/" className="block">
        <Button variant="primary" className="w-full">
          Back to home
        </Button>
      </Link>
    </Card>
  );
}

export default function SessionShell() {
  const { blockIndex, startedAt, finishBlock, skipBlock } = useSession();

  if (startedAt === null) return null;
  if (blockIndex >= BLOCKS.length) return <Summary />;

  const block = BLOCKS[blockIndex];
  if (!block) return <Summary />;

  const common = {
    onDone: finishBlock,
    onSkip: () => skipBlock(block.id),
  };

  return (
    <div>
      <ProgressRail />
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {block.label}
        </h1>
        <button
          onClick={common.onSkip}
          className="min-h-11 rounded-lg px-3 text-sm text-zinc-400"
        >
          Skip
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
