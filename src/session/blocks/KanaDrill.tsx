import { useEffect, useState } from 'react';
import { buildDrill, recordAnswer, type DrillItem } from '../../lib/kana';
import { getAllKanaStats, putKanaStat } from '../../lib/db';
import type { BlockId } from '../../lib/db';
import type { BlockResult } from '../useSession';
import { Button, Card, Ja } from '../../components/ui';

const DRILL_SIZE = 20;

interface Props {
  onDone: (id: BlockId, result: BlockResult) => void;
  onSkip: () => void;
}

export default function KanaDrill({ onDone }: Props) {
  const [items, setItems] = useState<DrillItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    void getAllKanaStats().then((stats) => {
      if (live) setItems(buildDrill(stats, DRILL_SIZE));
    });
    return () => {
      live = false;
    };
  }, []);

  if (!items) return <p className="text-zinc-500">Loading…</p>;

  const item = items[index];
  if (!item) return null;

  const answer = (optIndex: number) => {
    if (picked !== null) return;
    setPicked(optIndex);
    const isCorrect = optIndex === item.answerIndex;
    if (isCorrect) setCorrect((c) => c + 1);
    void getAllKanaStats().then((stats) =>
      putKanaStat(recordAnswer(stats.get(item.entry.char), item.entry.char, isCorrect, Date.now())),
    );
    window.setTimeout(() => {
      setPicked(null);
      if (index + 1 >= items.length) {
        onDone('kana', { correct: correct + (isCorrect ? 1 : 0), total: items.length });
      } else {
        setIndex((i) => i + 1);
      }
    }, 550);
  };

  return (
    <div>
      <p className="mb-2 text-center text-sm text-zinc-400">
        {index + 1} / {items.length}
      </p>
      <Card className="mb-6 py-10 text-center">
        <Ja className="text-7xl font-medium">{item.entry.char}</Ja>
        <p className="mt-3 text-xs uppercase tracking-wide text-zinc-400">{item.entry.script}</p>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        {item.options.map((opt, i) => {
          let extra = '';
          if (picked !== null) {
            if (i === item.answerIndex) extra = 'ring-2 ring-green-500';
            else if (i === picked) extra = 'ring-2 ring-red-400 opacity-60';
          }
          return (
            <Button key={`${opt}-${i}`} onClick={() => answer(i)} className={`py-4 ${extra}`}>
              {opt}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
