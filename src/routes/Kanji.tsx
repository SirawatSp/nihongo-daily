import { useEffect, useMemo, useState } from 'react';
import kanjiRaw from '../data/kanji.json';
import vocabRaw from '../data/vocab.json';
import type { VocabEntry } from '../data/schema';
import KanjiCanvas from '../components/KanjiCanvas';
import { characterAccuracy, type StrokeScore } from '../lib/stroke';
import { exampleWordFor, type KanjiEntry } from '../lib/kanjiPicker';
import {
  getAllKanjiStats,
  getSettings,
  recordKanjiAttempt,
  type KanjiStat,
} from '../lib/db';
import { Button, Card, Ja, SpeakButton } from '../components/ui';

const kanjiData = kanjiRaw as KanjiEntry[];
const vocab = vocabRaw as VocabEntry[];

type Level = 'all' | 'N5' | 'N4' | 'N3';

/** Colour a character by how well it is written, for the browse grid. */
function tone(stat: KanjiStat | undefined): string {
  if (!stat) return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300';
  if (stat.recent >= 0.85) return 'bg-green-500/80 text-white';
  if (stat.recent >= 0.6) return 'bg-amber-400/80 text-white';
  return 'bg-red-400/80 text-white';
}

export default function Kanji() {
  const [stats, setStats] = useState<Map<string, KanjiStat>>(new Map());
  const [level, setLevel] = useState<Level>('all');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<KanjiEntry | null>(null);
  const [result, setResult] = useState<StrokeScore[] | null>(null);
  // Bumped only by "Practise again", so finishing a character leaves the
  // completed strokes on screen instead of remounting the canvas.
  const [attempt, setAttempt] = useState(0);
  const [showHints, setShowHints] = useState(true);
  const [strict, setStrict] = useState(false);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);

  useEffect(() => {
    void getAllKanjiStats().then(setStats);
    void getSettings().then((s) => {
      setShowHints(s.strokeHints);
      setStrict(s.strictStrokes);
      setVoiceURI(s.voiceURI);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return kanjiData
      .filter((k) => level === 'all' || k.jlpt === level)
      .filter(
        (k) =>
          q === '' ||
          k.char === q ||
          k.meanings.some((m) => m.includes(q)) ||
          k.on.some((r) => r.includes(q)) ||
          k.kun.some((r) => r.includes(q)),
      )
      .sort((a, b) => a.strokes.length - b.strokes.length);
  }, [level, query]);

  const written = [...stats.values()].filter((s) => s.completed > 0).length;

  const complete = (scores: StrokeScore[]) => {
    if (!active) return;
    setResult(scores);
    void recordKanjiAttempt(active.char, characterAccuracy(scores)).then(() =>
      getAllKanjiStats().then(setStats),
    );
  };

  // Practice view for a single character.
  if (active) {
    const word = exampleWordFor(active.char, vocab);
    return (
      <div>
        <button
          onClick={() => {
            setActive(null);
            setResult(null);
            setAttempt(0);
          }}
          className="mb-3 min-h-11 text-sm text-zinc-500"
        >
          ← All kanji
        </button>

        <div className="mb-3 text-center">
          <p className="text-lg">{active.meanings.slice(0, 3).join(', ')}</p>
          <p className="mt-1 text-sm text-zinc-500">
            {active.kun.length > 0 && (
              <span>
                kun <Ja>{active.kun.join('・')}</Ja>
              </span>
            )}
            {active.kun.length > 0 && active.on.length > 0 && <span> · </span>}
            {active.on.length > 0 && (
              <span>
                on <Ja>{active.on.join('・')}</Ja>
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {active.strokes.length} strokes{active.jlpt ? ` · ${active.jlpt}` : ''}
          </p>
        </div>

        <KanjiCanvas
          key={`${active.char}-${attempt}`}
          strokes={active.strokes}
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
          <Button
            onClick={() => {
              setResult(null);
              setAttempt((a) => a + 1);
            }}
            className="px-3 text-sm"
          >
            Practise again
          </Button>
        </div>

        {result && (
          <Card className="mt-4 text-center">
            <p className="mb-2 text-sm text-zinc-500">
              Accuracy {Math.round(characterAccuracy(result) * 100)}%
            </p>
            {word && (
              <div className="flex items-center justify-center gap-2 text-sm">
                <span>
                  <Ja>{word.kanji}</Ja> <Ja className="text-zinc-500">{word.kana}</Ja>
                </span>
                <span className="text-zinc-500">{word.meaning}</span>
                <SpeakButton text={word.kanji} voiceURI={voiceURI} label={`Play ${word.meaning}`} />
              </div>
            )}
          </Card>
        )}
      </div>
    );
  }

  // Browse / pick a character.
  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">Kanji</h1>
      <p className="mb-4 text-sm text-zinc-500">
        {written} of {kanjiData.length} written · tap any character to practise
      </p>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search meaning or reading…"
        aria-label="Search kanji"
        className="mb-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900"
      />

      <div role="group" aria-label="Filter by JLPT level" className="mb-4 flex gap-2">
        {(['all', 'N5', 'N4', 'N3'] as Level[]).map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            aria-pressed={level === l}
            className={`min-h-11 rounded-full px-4 text-sm ${
              level === l
                ? 'bg-accent font-medium text-white dark:bg-accent-dark'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
            }`}
          >
            {l === 'all' ? 'All' : l}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-zinc-500">No kanji match that search.</p>
      )}

      <div className="grid grid-cols-6 gap-2">
        {filtered.map((k) => (
          <button
            key={k.char}
            onClick={() => {
              setActive(k);
              setResult(null);
              setAttempt(0);
            }}
            aria-label={`Practise ${k.char}, ${k.meanings[0] ?? ''}`}
            className={`flex aspect-square items-center justify-center rounded-lg text-2xl ${tone(stats.get(k.char))}`}
          >
            <Ja>{k.char}</Ja>
          </button>
        ))}
      </div>
    </div>
  );
}
