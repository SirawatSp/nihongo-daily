import { useEffect, useState } from 'react';
import kanjiRaw from '../../data/kanji.json';
import vocabRaw from '../../data/vocab.json';
import type { VocabEntry } from '../../data/schema';
import KanjiCanvas from '../../components/KanjiCanvas';
import { characterAccuracy, type StrokeScore } from '../../lib/stroke';
import {
  exampleWordFor,
  kanjiInWords,
  pickKanji,
  type KanjiEntry,
} from '../../lib/kanjiPicker';
import {
  getAllCards,
  getAllKanjiStats,
  getSettings,
  recordKanjiAttempt,
  type BlockId,
} from '../../lib/db';
import type { BlockResult } from '../useSession';
import { Button, Card, Ja, SpeakButton } from '../../components/ui';

const kanjiData = kanjiRaw as KanjiEntry[];
const vocab = vocabRaw as VocabEntry[];
const byChar = new Map(kanjiData.map((k) => [k.char, k]));

interface Props {
  onDone: (id: BlockId, result: BlockResult) => void;
  onSkip: () => void;
}

export default function KanjiWriting({ onDone }: Props) {
  const [queue, setQueue] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState<StrokeScore[] | null>(null);
  const [totalAccuracy, setTotalAccuracy] = useState(0);
  const [showHints, setShowHints] = useState(true);
  const [strict, setStrict] = useState(false);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void Promise.all([getAllCards(), getAllKanjiStats(), getSettings()]).then(
      ([cards, stats, settings]) => {
        if (!live) return;
        setShowHints(settings.strokeHints);
        setStrict(settings.strictStrokes);
        setVoiceURI(settings.voiceURI);

        // Prefer kanji from words already in the SRS (what you're learning),
        // then fall back to the wider vocabulary list.
        const studying = new Set(cards.filter((c) => c.status !== 'new').map((c) => c.id));
        const studiedWords = vocab.filter((v) => studying.has(v.id));
        const candidates = [...kanjiInWords(studiedWords), ...kanjiInWords(vocab)];

        setQueue(
          pickKanji({
            candidates,
            stats,
            available: new Set(byChar.keys()),
            count: settings.kanjiPerSession,
            now: Date.now(),
            maxStrokes: 14,
            strokeCountOf: (c) => byChar.get(c)?.strokes.length ?? 99,
          }),
        );
      },
    );
    return () => {
      live = false;
    };
  }, []);

  if (!queue) return <p className="text-zinc-500">Loading…</p>;
  if (queue.length === 0) {
    return (
      <Card className="text-center">
        <p className="mb-6 text-zinc-500">No kanji to practise right now.</p>
        <Button variant="primary" onClick={() => onDone('kanji', { correct: 0, total: 0 })}>
          Continue
        </Button>
      </Card>
    );
  }

  const char = queue[index];
  const entry = char ? byChar.get(char) : undefined;
  if (!char || !entry) return null;

  const word = exampleWordFor(char, vocab);

  const complete = (scores: StrokeScore[]) => {
    const accuracy = characterAccuracy(scores);
    setFinished(scores);
    setTotalAccuracy((t) => t + accuracy);
    void recordKanjiAttempt(char, accuracy);
  };

  const next = () => {
    setFinished(null);
    if (index + 1 >= queue.length) {
      // Graded on mean character accuracy across the block.
      const mean = totalAccuracy / queue.length;
      onDone('kanji', { correct: Math.round(mean * queue.length), total: queue.length });
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <div>
      <p className="mb-2 text-center text-sm text-zinc-400">
        {index + 1} / {queue.length}
      </p>

      <div className="mb-3 text-center">
        <p className="text-sm text-zinc-500">
          {entry.meanings.slice(0, 3).join(', ')}
        </p>
        {(entry.on.length > 0 || entry.kun.length > 0) && (
          <p className="mt-1 text-xs text-zinc-400">
            {entry.kun.length > 0 && (
              <span>
                kun <Ja>{entry.kun.join('・')}</Ja>
              </span>
            )}
            {entry.kun.length > 0 && entry.on.length > 0 && <span> · </span>}
            {entry.on.length > 0 && (
              <span>
                on <Ja>{entry.on.join('・')}</Ja>
              </span>
            )}
          </p>
        )}
      </div>

      <KanjiCanvas
        key={char}
        strokes={entry.strokes}
        showHints={showHints}
        strict={strict}
        onComplete={complete}
      />

      <div className="mt-3 flex justify-center gap-2">
        <Button
          onClick={() => setShowHints((h) => !h)}
          aria-pressed={showHints}
          className={`px-3 text-sm ${showHints ? 'ring-2 ring-accent' : ''}`}
        >
          {showHints ? 'Guides on' : 'Guides off'}
        </Button>
      </div>

      {finished && (
        <Card className="mt-4 text-center">
          <p className="mb-2 text-sm text-zinc-500">
            Accuracy {Math.round(characterAccuracy(finished) * 100)}%
          </p>
          <p className="mb-1">
            <Ja className="text-3xl">{entry.char}</Ja>
          </p>
          {word && (
            <div className="mb-4 flex items-center justify-center gap-2 text-sm">
              <span>
                <Ja>{word.kanji}</Ja> <Ja className="text-zinc-500">{word.kana}</Ja>
              </span>
              <span className="text-zinc-500">{word.meaning}</span>
              <SpeakButton text={word.kanji} voiceURI={voiceURI} label={`Play ${word.meaning}`} />
            </div>
          )}
          <Button variant="primary" className="w-full py-4" onClick={next}>
            {index + 1 >= queue.length ? 'Finish block' : 'Next kanji'}
          </Button>
        </Card>
      )}
    </div>
  );
}
