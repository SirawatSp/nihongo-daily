import { useEffect, useState } from 'react';
import vocabRaw from '../data/vocab.json';
import type { VocabEntry } from '../data/schema';
import { getAllCards, getAllKanaStats, getAllSessions, type SessionRecord } from '../lib/db';
import { KANA_TABLE, type KanaStat } from '../lib/kana';
import { currentStreak, dateKey, lastNDays } from '../lib/streak';
import { Card } from '../components/ui';

const vocab = vocabRaw as VocabEntry[];

function KanaHeatmap({ stats }: { stats: Map<string, KanaStat> }) {
  return (
    <div className="grid grid-cols-10 gap-1" role="img" aria-label="Per-character kana accuracy">
      {KANA_TABLE.map((k) => {
        const s = stats.get(k.char);
        const acc = s && s.seen > 0 ? s.correct / s.seen : null;
        const bg =
          acc === null
            ? 'bg-zinc-100 text-zinc-300 dark:bg-zinc-800 dark:text-zinc-600'
            : acc > 0.9
              ? 'bg-green-500/80 text-white'
              : acc > 0.7
                ? 'bg-amber-400/80 text-white'
                : 'bg-red-400/80 text-white';
        return (
          <span
            key={k.char}
            lang="ja"
            title={s ? `${k.char}: ${Math.round((acc ?? 0) * 100)}% of ${s.seen}` : `${k.char}: unseen`}
            className={`flex aspect-square items-center justify-center rounded text-sm ${bg}`}
          >
            {k.char}
          </span>
        );
      })}
    </div>
  );
}

function StreakCalendar({ sessions }: { sessions: SessionRecord[] }) {
  const days = lastNDays(dateKey(new Date()), 30);
  const done = new Set(sessions.map((s) => s.date));
  return (
    <div className="grid grid-cols-10 gap-1" role="img" aria-label="Last 30 days of sessions">
      {days.map((d) => (
        <span
          key={d}
          title={d}
          className={`aspect-square rounded ${
            done.has(d) ? 'bg-accent dark:bg-accent-dark' : 'bg-zinc-100 dark:bg-zinc-800'
          }`}
        />
      ))}
    </div>
  );
}

function AccuracyTrend({ sessions }: { sessions: SessionRecord[] }) {
  const recent = [...sessions].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  if (recent.length < 2) {
    return <p className="text-sm text-zinc-500">Complete a few sessions to see the trend.</p>;
  }
  const w = 280;
  const h = 60;
  const points = recent
    .map((s, i) => {
      const x = (i / (recent.length - 1)) * w;
      const y = h - s.accuracy * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-16 w-full"
      role="img"
      aria-label={`Accuracy trend across the last ${recent.length} sessions`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-accent dark:text-accent-dark"
      />
    </svg>
  );
}

export default function Progress() {
  const [cards, setCards] = useState({ known: 0, learning: 0, fresh: 0 });
  const [kanaStats, setKanaStats] = useState<Map<string, KanaStat>>(new Map());
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  useEffect(() => {
    void getAllCards().then((all) => {
      const seen = new Set(all.map((c) => c.id));
      setCards({
        known: all.filter((c) => c.status === 'known').length,
        learning: all.filter((c) => c.status === 'learning').length,
        fresh: vocab.filter((v) => !seen.has(v.id)).length,
      });
    });
    void getAllKanaStats().then(setKanaStats);
    void getAllSessions().then(setSessions);
  }, []);

  const streak = currentStreak(sessions.map((s) => s.date), dateKey(new Date()));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Progress</h1>
      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">Vocab</h2>
        <div className="flex justify-around text-center">
          <div>
            <p className="text-2xl font-semibold">{cards.known}</p>
            <p className="text-xs text-zinc-500">known</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{cards.learning}</p>
            <p className="text-xs text-zinc-500">learning</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{cards.fresh}</p>
            <p className="text-xs text-zinc-500">new</p>
          </div>
        </div>
      </Card>
      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Kana accuracy
        </h2>
        <KanaHeatmap stats={kanaStats} />
      </Card>
      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Last 30 days {streak > 0 && `· ${streak}-day streak`}
        </h2>
        <StreakCalendar sessions={sessions} />
      </Card>
      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Session accuracy
        </h2>
        <AccuracyTrend sessions={sessions} />
      </Card>
    </div>
  );
}
