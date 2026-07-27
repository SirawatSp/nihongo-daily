import { useMemo, useState } from 'react';
import grammarRaw from '../data/grammar.json';
import type { GrammarEntry, Jlpt } from '../data/schema';
import { Card, Ja } from '../components/ui';

const grammar = grammarRaw as GrammarEntry[];
const LEVELS: (Jlpt | 'all')[] = ['all', 'N5', 'N4', 'N3'];

export default function Grammar() {
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<Jlpt | 'all'>('all');
  const [open, setOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return grammar.filter(
      (g) =>
        (level === 'all' || g.jlpt === level) &&
        (q === '' ||
          g.pattern.toLowerCase().includes(q) ||
          g.plainExplanation.toLowerCase().includes(q)),
    );
  }, [query, level]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Grammar</h1>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search patterns…"
        aria-label="Search grammar patterns"
        className="mb-3 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <div role="group" aria-label="Filter by JLPT level" className="mb-4 flex gap-2">
        {LEVELS.map((l) => (
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
        <p className="py-8 text-center text-zinc-500">No patterns match that search.</p>
      )}
      <ul className="space-y-2">
        {filtered.map((g) => (
          <li key={g.id}>
            <Card className="p-0">
              <button
                className="flex min-h-12 w-full items-center justify-between px-4 py-3 text-left"
                aria-expanded={open === g.id}
                onClick={() => setOpen((o) => (o === g.id ? null : g.id))}
              >
                <span className="font-medium">
                  <Ja>{g.pattern}</Ja>
                </span>
                <span className="ml-2 shrink-0 rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">
                  {g.jlpt}
                </span>
              </button>
              {open === g.id && (
                <div className="border-t border-zinc-100 px-4 py-3 dark:border-zinc-800">
                  <p className="mb-2 text-sm">{g.plainExplanation}</p>
                  <p className="mb-3 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
                    <Ja>{g.formula}</Ja>
                  </p>
                  <ul className="space-y-2">
                    {g.examples.map((ex, i) => (
                      <li key={i} className="text-sm">
                        <p>
                          <Ja>{ex.ja}</Ja>
                        </p>
                        <p className="text-zinc-500">
                          <Ja>{ex.kana}</Ja>
                        </p>
                        <p className="text-zinc-500">{ex.en}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
