import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import dialoguesRaw from '../data/dialogues.json';
import type { DialogueEntry } from '../data/schema';
import {
  buildQuickDeck,
  confidentCount,
  ratePhrase,
  SCENARIOS,
  travelPhrases,
  type Phrase,
  type ScenarioId,
} from '../lib/quick';
import { getAllPhraseStats, getSettings, putPhraseStat, type PhraseStat } from '../lib/db';
import { speakJa, ttsAvailable } from '../lib/speech';
import { Button, Card, Ja } from '../components/ui';

const dialogues = dialoguesRaw as DialogueEntry[];
const ALL_PHRASES = travelPhrases(dialogues);
const DECK_SIZE = 8;

/**
 * Quick Practice — a ~3-minute recall drill on phrases you would actually
 * say. Pick the situation you are walking into, see the English, try to say
 * the Japanese from memory, then check yourself.
 */
export default function Quick() {
  const [stats, setStats] = useState<Map<string, PhraseStat>>(new Map());
  const [deck, setDeck] = useState<Phrase[] | null>(null);
  const [scenario, setScenario] = useState<ScenarioId | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [gotCount, setGotCount] = useState(0);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const [rate, setRate] = useState(1);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    void getAllPhraseStats().then(setStats);
    void getSettings().then((s) => {
      setVoiceURI(s.voiceURI);
      setRate(s.speechRate);
    });
  }, []);

  /** Per-situation totals and how many you already recall confidently. */
  const counts = useMemo(() => {
    const map = new Map<string, { total: number; solid: number }>();
    for (const p of ALL_PHRASES) {
      const row = map.get(p.theme) ?? { total: 0, solid: 0 };
      row.total += 1;
      if ((stats.get(p.id)?.strength ?? 0) >= 0.7) row.solid += 1;
      map.set(p.theme, row);
    }
    return map;
  }, [stats]);

  const begin = (id: ScenarioId | null) => {
    setScenario(id);
    setDeck(
      buildQuickDeck({
        phrases: ALL_PHRASES,
        stats,
        scenario: id,
        count: DECK_SIZE,
        now: Date.now(),
      }),
    );
    setIndex(0);
    setRevealed(false);
    setGotCount(0);
  };

  const speak = (text: string) => void speakJa(text, { rate: slow ? 0.75 : rate, voiceURI });

  const rate_ = (got: boolean) => {
    const phrase = deck?.[index];
    if (!phrase) return;
    const next = ratePhrase(stats.get(phrase.id), phrase.id, got, Date.now());
    void putPhraseStat(next);
    setStats((prev) => new Map(prev).set(phrase.id, next));
    if (got) setGotCount((n) => n + 1);
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  // --- picker ---
  if (!deck) {
    return (
      <div>
        <h1 className="mb-1 text-xl font-semibold">Quick practice</h1>
        <p className="mb-1 text-sm text-zinc-500">
          Three minutes on the phrases you need right now. Pick where you are.
        </p>
        <p className="mb-5 text-xs text-zinc-400">
          {confidentCount(stats)} of {ALL_PHRASES.length} phrases solid
        </p>
        <div className="space-y-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => begin(s.id)}
              className="flex min-h-16 w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-left dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span>
                <span className="block font-medium">{s.label}</span>
                <span className="block text-sm text-zinc-500">{s.hint}</span>
              </span>
              <span className="shrink-0 text-xs text-zinc-400">
                {counts.get(s.id)?.solid ?? 0}/{counts.get(s.id)?.total ?? 0}
              </span>
            </button>
          ))}
          <Button variant="primary" className="w-full py-4" onClick={() => begin(null)}>
            Mixed — a bit of everything
          </Button>
        </div>
      </div>
    );
  }

  // --- summary ---
  if (index >= deck.length) {
    const label = SCENARIOS.find((s) => s.id === scenario)?.label ?? 'Mixed';
    return (
      <Card className="mt-8 text-center">
        <h2 className="mb-2 text-xl font-semibold">Done — {label}</h2>
        <p className="mb-6 text-zinc-500">
          {gotCount} of {deck.length} recalled without help.
        </p>
        <div className="space-y-2">
          <Button variant="primary" className="w-full py-4" onClick={() => begin(scenario)}>
            Go again
          </Button>
          <Button className="w-full" onClick={() => setDeck(null)}>
            Another situation
          </Button>
          <Link to="/" className="block">
            <Button className="w-full">Home</Button>
          </Link>
        </div>
      </Card>
    );
  }

  // --- drill ---
  const phrase = deck[index]!;
  return (
    <div className="flex min-h-[80dvh] flex-col">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setDeck(null)} className="min-h-11 text-sm text-zinc-500">
          ← Situations
        </button>
        <span className="text-xs text-zinc-400">
          {index + 1} of {deck.length}
        </span>
      </div>

      <p className="mb-2 text-center text-xs uppercase tracking-wide text-zinc-400">
        {phrase.scene}
      </p>

      <Card className="text-center">
        <p className="text-xl">{phrase.en}</p>
        <p className="mt-3 text-sm text-zinc-500">
          {revealed ? 'How did you do?' : 'Say it in Japanese, then check.'}
        </p>

        {revealed && (
          <div className="mt-5 border-t border-zinc-100 pt-5 dark:border-zinc-800">
            <p className="text-2xl">
              <Ja>{phrase.ja}</Ja>
            </p>
            <p className="mt-2 text-zinc-500">
              <Ja>{phrase.kana}</Ja>
            </p>
            {ttsAvailable() && (
              <div className="mt-4 flex justify-center gap-2">
                <Button onClick={() => speak(phrase.ja)} aria-label="Play audio">
                  🔊 Listen
                </Button>
                <Button
                  onClick={() => setSlow((s) => !s)}
                  aria-pressed={slow}
                  className={slow ? 'ring-2 ring-accent' : ''}
                >
                  0.75×
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Actions live at the bottom, within thumb reach. */}
      <div className="mt-auto pt-6">
        {!revealed ? (
          <Button
            variant="primary"
            className="w-full py-5 text-lg"
            onClick={() => {
              setRevealed(true);
              if (ttsAvailable()) speak(phrase.ja);
            }}
          >
            Show me
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Button className="py-5 text-amber-600 dark:text-amber-400" onClick={() => rate_(false)}>
              Not yet
            </Button>
            <Button className="py-5 text-green-600 dark:text-green-400" onClick={() => rate_(true)}>
              Got it
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
