import { useEffect, useMemo, useState } from 'react';
import vocabRaw from '../../data/vocab.json';
import type { VocabEntry } from '../../data/schema';
import { getSettings, type BlockId } from '../../lib/db';
import { speakJa, ttsAvailable } from '../../lib/speech';
import type { BlockResult } from '../useSession';
import { Button, Card, Ja } from '../../components/ui';

const vocab = vocabRaw as VocabEntry[];
const ITEM_COUNT = 8;

interface Item {
  entry: VocabEntry;
  options: string[]; // English meanings, one correct
  answerIndex: number;
}

/** Distractors share a theme with the answer — plausible, not random. */
function buildItems(count: number): Item[] {
  const pool = [...vocab].sort(() => Math.random() - 0.5).slice(0, count);
  return pool.map((entry) => {
    const theme = entry.themes[0];
    const sameTheme = vocab.filter(
      (v) => v.id !== entry.id && v.themes.some((t) => t === theme) && v.exampleEn !== entry.exampleEn,
    );
    const others = (sameTheme.length >= 2 ? sameTheme : vocab.filter((v) => v.id !== entry.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, 2)
      .map((v) => v.exampleEn);
    const answerIndex = Math.floor(Math.random() * 3);
    const options = [...others];
    options.splice(answerIndex, 0, entry.exampleEn);
    return { entry, options, answerIndex };
  });
}

interface Props {
  onDone: (id: BlockId, result: BlockResult) => void;
  onSkip: () => void;
}

export default function Listening({ onDone }: Props) {
  const items = useMemo(() => buildItems(ITEM_COUNT), []);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [slow, setSlow] = useState(false);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const tts = ttsAvailable();

  const item = items[index];

  useEffect(() => {
    void getSettings().then((s) => setVoiceURI(s.voiceURI));
  }, []);

  useEffect(() => {
    if (tts && item) void speakJa(item.entry.exampleJa, { rate: slow ? 0.75 : 1, voiceURI });
    // Speak once when the item appears; replay is manual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, tts]);

  if (!item) return null;

  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    if (i === item.answerIndex) setCorrect((c) => c + 1);
  };

  const next = () => {
    const finalCorrect = correct;
    setPicked(null);
    if (index + 1 >= items.length) {
      onDone('listening', { correct: finalCorrect, total: items.length });
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <div>
      <p className="mb-2 text-center text-sm text-zinc-400">
        {index + 1} / {items.length}
      </p>
      <Card className="mb-6 text-center">
        {tts ? (
          <>
            <div className="mb-4 flex items-center justify-center gap-3">
              <Button
                onClick={() =>
                  void speakJa(item.entry.exampleJa, { rate: slow ? 0.75 : 1, voiceURI })
                }
                aria-label="Replay audio"
                className="text-2xl"
              >
                🔊 Replay
              </Button>
              <Button
                onClick={() => setSlow((s) => !s)}
                aria-pressed={slow}
                className={slow ? 'ring-2 ring-accent' : ''}
              >
                0.75×
              </Button>
            </div>
            {picked !== null && (
              <p className="mt-2">
                <Ja className="text-lg">{item.entry.exampleJa}</Ja>
              </p>
            )}
          </>
        ) : (
          <>
            <p className="mb-3 text-sm text-zinc-500">
              Audio isn't available in this browser, so read the sentence instead.
            </p>
            <Ja className="text-lg">{item.entry.exampleJa}</Ja>
          </>
        )}
      </Card>
      <p className="mb-2 text-sm text-zinc-500">What does it mean?</p>
      <div className="space-y-2">
        {item.options.map((opt, i) => {
          let extra = '';
          if (picked !== null) {
            if (i === item.answerIndex) extra = 'ring-2 ring-green-500';
            else if (i === picked) extra = 'ring-2 ring-red-400 opacity-60';
          }
          return (
            <Button key={i} onClick={() => pick(i)} className={`w-full py-3 text-left ${extra}`}>
              {opt}
            </Button>
          );
        })}
      </div>
      {picked !== null && (
        <Button variant="primary" className="mt-4 w-full py-4" onClick={next}>
          {index + 1 >= items.length ? 'Finish block' : 'Next'}
        </Button>
      )}
    </div>
  );
}
