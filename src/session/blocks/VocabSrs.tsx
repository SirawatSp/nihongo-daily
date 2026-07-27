import { useEffect, useState } from 'react';
import vocabRaw from '../../data/vocab.json';
import type { VocabEntry } from '../../data/schema';
import { buildQueue, newCard, schedule, type CardState, type Grade } from '../../lib/srs';
import { getAllCards, getSettings, putCard, type BlockId } from '../../lib/db';
import type { BlockResult } from '../useSession';
import { Button, Card, Ja, SpeakButton } from '../../components/ui';

const vocab = vocabRaw as VocabEntry[];
const byId = new Map(vocab.map((v) => [v.id, v]));
const MAX_REVIEWS_PER_SESSION = 40;

interface Props {
  onDone: (id: BlockId, result: BlockResult) => void;
  onSkip: () => void;
}

const GRADES: { grade: Grade; label: string; klass: string }[] = [
  { grade: 'again', label: 'Again', klass: 'text-red-600 dark:text-red-400' },
  { grade: 'hard', label: 'Hard', klass: 'text-amber-600 dark:text-amber-400' },
  { grade: 'good', label: 'Good', klass: 'text-green-600 dark:text-green-400' },
  { grade: 'easy', label: 'Easy', klass: 'text-blue-600 dark:text-blue-400' },
];

export default function VocabSrs({ onDone }: Props) {
  const [queue, setQueue] = useState<CardState[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [speechRate, setSpeechRate] = useState(1);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void Promise.all([getAllCards(), getSettings()]).then(([stored, settings]) => {
      if (!live) return;
      setSpeechRate(settings.speechRate);
      setVoiceURI(settings.voiceURI);
      const known = new Map(stored.map((c) => [c.id, c]));
      const now = Date.now();
      const all = vocab.map((v) => known.get(v.id) ?? newCard(v.id, now));
      const q = buildQueue(all, now, settings.newCardsPerDay).slice(0, MAX_REVIEWS_PER_SESSION);
      setQueue(q);
    });
    return () => {
      live = false;
    };
  }, []);

  if (!queue) return <p className="text-zinc-500">Loading…</p>;
  if (queue.length === 0) {
    return (
      <Card className="text-center">
        <p className="mb-6 text-zinc-500">No cards due right now. Nice work.</p>
        <Button variant="primary" onClick={() => onDone('vocab', { correct: 0, total: 0, cards: 0 })}>
          Continue
        </Button>
      </Card>
    );
  }

  const card = queue[index];
  const entry = card ? byId.get(card.id) : undefined;
  if (!card || !entry) return null;

  const grade = (g: Grade) => {
    void putCard(schedule(card, g, Date.now()));
    const isCorrect = g === 'good' || g === 'easy';
    if (isCorrect) setCorrect((c) => c + 1);
    setRevealed(false);
    if (index + 1 >= queue.length) {
      onDone('vocab', {
        correct: correct + (isCorrect ? 1 : 0),
        total: queue.length,
        cards: queue.length,
      });
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <div>
      <p className="mb-2 text-center text-sm text-zinc-400">
        {index + 1} / {queue.length}
        {card.status === 'new' && <span className="ml-2 text-accent dark:text-accent-dark">new</span>}
      </p>
      <Card className="mb-6 text-center">
        <Ja className="text-4xl font-medium">{entry.kanji}</Ja>
        {revealed && (
          <div className="mt-4 space-y-3">
            <p>
              <Ja className="text-xl text-zinc-500">{entry.kana}</Ja>
            </p>
            <p className="text-lg">{entry.meaning}</p>
            <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-left dark:bg-zinc-800/60">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p>
                    <Ja>{entry.exampleJa}</Ja>
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    <Ja>{entry.exampleKana}</Ja>
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">{entry.exampleEn}</p>
                </div>
                <SpeakButton text={entry.exampleJa} rate={speechRate} voiceURI={voiceURI} />
              </div>
            </div>
          </div>
        )}
      </Card>
      {!revealed ? (
        <Button variant="primary" className="w-full py-4" onClick={() => setRevealed(true)}>
          Show answer
        </Button>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {GRADES.map((g) => (
            <Button key={g.grade} onClick={() => grade(g.grade)} className={`py-4 text-sm ${g.klass}`}>
              {g.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
