import { useEffect, useState } from 'react';
import dialoguesRaw from '../data/dialogues.json';
import type { DialogueEntry } from '../data/schema';
import { ESSENTIAL_PHRASES } from '../data/trip';
import { getFavorites, getSettings, toggleFavorite } from '../lib/db';
import { Button, Ja, SpeakButton } from '../components/ui';

const dialogues = dialoguesRaw as DialogueEntry[];
const categories = [
  'All',
  ...new Set(ESSENTIAL_PHRASES.map((p) => p.category)),
];
const conversationLines = dialogues.flatMap((d) =>
  d.lines.map((line, i) => ({ ...line, id: `${d.id}:${i}`, scene: d.scene })),
);
const matches = (query: string, ...fields: string[]) =>
  fields
    .join(' ')
    .toLocaleLowerCase()
    .includes(query.trim().toLocaleLowerCase());

export default function Phrasebook() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [view, setView] = useState<
    'essentials' | 'conversations' | 'favorites'
  >('essentials');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [open, setOpen] = useState<string | null>(null);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const [speechRate, setSpeechRate] = useState(0.85);
  const [error, setError] = useState('');
  const [pendingFavorite, setPendingFavorite] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void Promise.all([getFavorites(), getSettings()])
      .then(([saved, settings]) => {
        if (!live) return;
        setFavorites(new Set(saved.map((x) => x.id)));
        setVoiceURI(settings.voiceURI);
        setSpeechRate(settings.speechRate);
      })
      .catch(() => {
        if (live)
          setError('Could not load favorites. Please reload and try again.');
      });
    return () => {
      live = false;
    };
  }, []);
  const toggle = async (id: string) => {
    if (pendingFavorite) return;
    setPendingFavorite(id);
    try {
      const added = await toggleFavorite(id);
      setFavorites((prev) => {
        const next = new Set(prev);
        if (added) next.add(id);
        else next.delete(id);
        return next;
      });
    } catch {
      setError('Could not save this favorite. Please try again.');
    } finally {
      setPendingFavorite(null);
    }
  };
  const star = (id: string) => (
    <button
      disabled={pendingFavorite !== null}
      aria-label={
        favorites.has(id) ? 'Remove from favorites' : 'Add to favorites'
      }
      aria-pressed={favorites.has(id)}
      onClick={() => void toggle(id)}
      className={`min-h-11 min-w-11 text-xl ${favorites.has(id) ? 'text-amber-700 dark:text-amber-300' : 'text-zinc-500'}`}
    >
      ★
    </button>
  );
  const essentials = ESSENTIAL_PHRASES.filter(
    (p) =>
      (view !== 'favorites' || favorites.has(p.id)) &&
      (view === 'favorites' || category === 'All' || category === p.category) &&
      matches(query, p.ja, p.kana, p.romaji, p.en, p.scene, p.category),
  );
  const favoriteLines = conversationLines.filter(
    (p) => favorites.has(p.id) && matches(query, p.ja, p.kana, p.en, p.scene),
  );
  const filteredDialogues = dialogues.filter((d) =>
    matches(query, d.scene, ...d.lines.flatMap((l) => [l.ja, l.kana, l.en])),
  );

  return (
    <div className="space-y-4">
      <header>
        <p className="eyebrow">Use it in the moment</p>
        <h1 className="mt-2 font-display text-3xl">Trip phrasebook</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Find a phrase, listen, or show the Japanese to someone.
        </p>
      </header>
      <label className="block">
        <span className="sr-only">Search phrases</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search: water, station, slowly…"
          className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      <div className="flex gap-2" role="group" aria-label="Phrasebook view">
        {(['essentials', 'favorites', 'conversations'] as const).map((v) => (
          <button
            key={v}
            aria-pressed={view === v}
            onClick={() => {
              setView(v);
              setOpen(null);
            }}
            className={`min-h-11 flex-1 rounded-lg px-1 text-xs font-semibold capitalize ${view === v ? 'bg-accent text-white dark:bg-accent-dark' : 'bg-zinc-200 dark:bg-zinc-800'}`}
          >
            {v}
          </button>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      {view === 'essentials' && (
        <label className="flex items-center gap-3 text-sm">
          <span>Situation</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="min-h-11 flex-1 rounded-lg border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900"
          >
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      )}
      {view !== 'conversations' ? (
        <>
          <p role="status" className="text-xs text-zinc-500">
            {essentials.length +
              (view === 'favorites' ? favoriteLines.length : 0)}{' '}
            phrases{view === 'favorites' ? ' saved' : ' found'}
          </p>
          <ul className="space-y-3">
            {essentials.map((phrase) => (
              <li key={phrase.id} className="shortcut-card">
                <div className="mb-2 flex items-center justify-between">
                  <p className="eyebrow">{phrase.category}</p>
                  {star(phrase.id)}
                </div>
                <p className="text-xl">
                  <Ja>{phrase.ja}</Ja>
                </p>
                <p className="pronunciation mt-1 text-sm">{phrase.romaji}</p>
                <p className="mt-2 font-medium">{phrase.en}</p>
                <div className="mt-3 flex items-center justify-between">
                  <SpeakButton
                    text={phrase.ja}
                    voiceURI={voiceURI}
                    rate={speechRate}
                  />
                  <Button
                    aria-expanded={open === phrase.id}
                    onClick={() =>
                      setOpen(open === phrase.id ? null : phrase.id)
                    }
                  >
                    Usage note
                  </Button>
                </div>
                {open === phrase.id && (
                  <p className="mt-3 text-sm leading-relaxed text-zinc-500">
                    {phrase.tip}
                  </p>
                )}
              </li>
            ))}
            {view === 'favorites' &&
              favoriteLines.map((line) => (
                <li key={line.id} className="shortcut-card">
                  <div className="mb-2 flex justify-between">
                    <p className="eyebrow">{line.scene}</p>
                    {star(line.id)}
                  </div>
                  <p className="text-xl">
                    <Ja>{line.ja}</Ja>
                  </p>
                  <p className="text-sm text-zinc-500">
                    <Ja>{line.kana}</Ja>
                  </p>
                  <p className="my-2">{line.en}</p>
                  <SpeakButton
                    text={line.ja}
                    voiceURI={voiceURI}
                    rate={speechRate}
                  />
                </li>
              ))}
          </ul>
          {essentials.length === 0 &&
            (view !== 'favorites' || favoriteLines.length === 0) && (
              <p className="py-6 text-sm text-zinc-500">
                {view === 'favorites' && !query
                  ? 'Tap a star on a phrase to keep it here for your trip.'
                  : 'No phrases match. Try another word or situation.'}
              </p>
            )}
        </>
      ) : (
        <>
          <p className="text-sm text-zinc-500">
            Full example conversations, including what staff might say.
          </p>
          <ul className="space-y-2">
            {filteredDialogues.map((d) => (
              <li
                key={d.id}
                className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
              >
                <button
                  className="flex min-h-12 w-full items-center justify-between px-4 py-3 text-left font-medium"
                  aria-expanded={open === d.id}
                  onClick={() => setOpen(open === d.id ? null : d.id)}
                >
                  {d.scene}
                  <span aria-hidden="true">{open === d.id ? '−' : '+'}</span>
                </button>
                {open === d.id && (
                  <ul className="space-y-5 border-t border-zinc-200 p-4 dark:border-zinc-700">
                    {d.lines.map((line, i) => {
                      const id = `${d.id}:${i}`;
                      return (
                        <li key={id}>
                          <p className="eyebrow">{line.speaker}</p>
                          <p className="text-lg">
                            <Ja>{line.ja}</Ja>
                          </p>
                          <p className="text-sm text-zinc-500">
                            <Ja>{line.kana}</Ja>
                          </p>
                          <p className="mt-1 text-sm">{line.en}</p>
                          <div className="mt-2 flex gap-2">
                            <SpeakButton
                              text={line.ja}
                              rate={speechRate}
                              voiceURI={voiceURI}
                            />
                            {star(id)}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          {filteredDialogues.length === 0 && (
            <p role="status">No conversations match. Try another word.</p>
          )}
        </>
      )}
    </div>
  );
}
