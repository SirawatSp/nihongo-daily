import { useEffect, useState } from 'react';
import dialoguesRaw from '../data/dialogues.json';
import type { DialogueEntry } from '../data/schema';
import { getFavorites, getSettings, toggleFavorite } from '../lib/db';
import { Ja, SpeakButton } from '../components/ui';

const dialogues = dialoguesRaw as DialogueEntry[];

/**
 * The under-pressure screen: largest type, least chrome. Favorites pinned
 * to the top so a needed phrase is reachable in five seconds.
 */
export default function Phrasebook() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const [speechRate, setSpeechRate] = useState(1);

  useEffect(() => {
    void getFavorites().then((f) => setFavorites(new Set(f.map((x) => x.id))));
    void getSettings().then((s) => {
      setVoiceURI(s.voiceURI);
      setSpeechRate(s.speechRate);
    });
  }, []);

  const toggle = (id: string) => {
    void toggleFavorite(id).then((added) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (added) next.add(id);
        else next.delete(id);
        return next;
      });
    });
  };

  const favoriteLines = dialogues.flatMap((d) =>
    d.lines
      .map((line, i) => ({ line, id: `${d.id}:${i}`, scene: d.scene }))
      .filter((x) => favorites.has(x.id)),
  );

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Phrasebook</h1>

      {favoriteLines.length > 0 && (
        <section aria-label="Favorite phrases" className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
            ★ Favorites
          </h2>
          <ul className="space-y-2">
            {favoriteLines.map(({ line, id }) => (
              <li
                key={id}
                className="flex items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="min-w-0">
                  <p className="text-xl">
                    <Ja>{line.ja}</Ja>
                  </p>
                  <p className="text-sm text-zinc-500">{line.en}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <SpeakButton text={line.ja} rate={speechRate} voiceURI={voiceURI} />
                  <button
                    aria-label="Remove from favorites"
                    className="min-h-11 min-w-11 text-lg text-amber-500"
                    onClick={() => toggle(id)}
                  >
                    ★
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ul className="space-y-2">
        {dialogues.map((d) => (
          <li key={d.id} className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <button
              className="flex min-h-12 w-full items-center justify-between px-4 py-3 text-left font-medium"
              aria-expanded={open === d.id}
              onClick={() => setOpen((o) => (o === d.id ? null : d.id))}
            >
              {d.scene}
              <span aria-hidden="true" className="text-zinc-400">
                {open === d.id ? '▾' : '▸'}
              </span>
            </button>
            {open === d.id && (
              <ul className="space-y-3 border-t border-zinc-100 p-4 dark:border-zinc-800">
                {d.lines.map((line, i) => {
                  const id = `${d.id}:${i}`;
                  return (
                    <li key={id} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-400">{line.speaker}</p>
                        <p className="text-lg">
                          <Ja>{line.ja}</Ja>
                        </p>
                        <p className="text-sm text-zinc-500">
                          <Ja>{line.kana}</Ja>
                        </p>
                        <p className="text-sm text-zinc-500">{line.en}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <SpeakButton text={line.ja} rate={speechRate} voiceURI={voiceURI} />
                        <button
                          aria-label={favorites.has(id) ? 'Remove from favorites' : 'Add to favorites'}
                          className={`min-h-11 min-w-11 text-lg ${favorites.has(id) ? 'text-amber-500' : 'text-zinc-300 dark:text-zinc-600'}`}
                          onClick={() => toggle(id)}
                        >
                          ★
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
