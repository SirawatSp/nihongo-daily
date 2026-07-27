import { useEffect, useMemo, useState } from 'react';
import readingsRaw from '../../data/readings.json';
import vocabRaw from '../../data/vocab.json';
import type { ReadingEntry, VocabEntry } from '../../data/schema';
import { alignFurigana } from '../../lib/furigana';
import { getSettings, type BlockId } from '../../lib/db';
import type { BlockResult } from '../useSession';
import { Button, Card, Ja } from '../../components/ui';

const readings = readingsRaw as ReadingEntry[];
const vocab = vocabRaw as VocabEntry[];

function findGloss(token: string): string | null {
  const hit = vocab.find((v) => v.kanji === token || v.kana === token);
  return hit ? `${hit.kana} — ${hit.meaning}` : null;
}

interface Props {
  onDone: (id: BlockId, result: BlockResult) => void;
  onSkip: () => void;
}

export default function Reading({ onDone }: Props) {
  const passage = useMemo(
    () => readings[Math.floor(Math.random() * readings.length)],
    [],
  );
  const [furigana, setFurigana] = useState(true);
  const [gloss, setGloss] = useState<{ text: string; body: string } | null>(null);
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    void getSettings().then((s) => setFurigana(s.furiganaDefault));
  }, []);

  const tokens = useMemo(
    () => (passage ? alignFurigana(passage.ja, passage.kana) : []),
    [passage],
  );

  if (!passage) return null;

  const tapToken = (text: string) => {
    const body = findGloss(text);
    setGloss({ text, body: body ?? 'No gloss for this word yet.' });
  };

  const answer = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">{passage.title}</h2>
        <div className="flex items-center gap-2">
          <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
            {passage.jlpt}
          </span>
          <Button
            onClick={() => setFurigana((f) => !f)}
            aria-pressed={furigana}
            className={`px-3 text-sm ${furigana ? 'ring-2 ring-accent' : ''}`}
          >
            ふりがな
          </Button>
        </div>
      </div>
      <Card className="mb-4">
        <p lang="ja" className="text-xl leading-ja">
          {tokens.map((t, i) =>
            t.ruby && furigana ? (
              <ruby key={i} className="cursor-pointer" onClick={() => tapToken(t.text)}>
                {t.text}
                <rt className="text-[0.55em] text-zinc-500">{t.ruby}</rt>
              </ruby>
            ) : (
              <span key={i} className="cursor-pointer" onClick={() => tapToken(t.text)}>
                {t.text}
              </span>
            ),
          )}
        </p>
        {gloss && (
          <div
            role="dialog"
            aria-label={`Gloss for ${gloss.text}`}
            className="mt-3 flex items-start justify-between rounded-xl bg-zinc-50 p-3 text-sm dark:bg-zinc-800/60"
          >
            <p>
              <Ja className="font-medium">{gloss.text}</Ja>
              <span className="ml-2 text-zinc-500">
                <Ja>{gloss.body}</Ja>
              </span>
            </p>
            <button aria-label="Close gloss" className="min-h-6 px-2" onClick={() => setGloss(null)}>
              ✕
            </button>
          </div>
        )}
      </Card>
      <p className="mb-2 text-sm text-zinc-500">{passage.question.prompt}</p>
      <div className="space-y-2">
        {passage.question.options.map((opt, i) => {
          let extra = '';
          if (picked !== null) {
            if (i === passage.question.answerIndex) extra = 'ring-2 ring-green-500';
            else if (i === picked) extra = 'ring-2 ring-red-400 opacity-60';
          }
          return (
            <Button key={i} onClick={() => answer(i)} className={`w-full py-3 text-left ${extra}`}>
              {opt}
            </Button>
          );
        })}
      </div>
      {picked !== null && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-zinc-500">{passage.en}</p>
          <Button
            variant="primary"
            className="w-full py-4"
            onClick={() =>
              onDone('reading', { correct: picked === passage.question.answerIndex ? 1 : 0, total: 1 })
            }
          >
            Finish session
          </Button>
        </div>
      )}
    </div>
  );
}
