import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  exportAll,
  importAll,
  putSettings,
  getSettings,
  type ExportedData,
  type Settings as SettingsType,
} from '../lib/db';
import { jaVoices, ttsAvailable } from '../lib/speech';
import { applyTheme } from '../App';
import { Button, Card } from '../components/ui';

export default function Settings() {
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getSettings().then(setSettings);
    if (ttsAvailable()) {
      setVoices(jaVoices());
      // Voices often load asynchronously.
      window.speechSynthesis.onvoiceschanged = () => setVoices(jaVoices());
    }
  }, []);

  const update = (patch: Partial<SettingsType>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    void putSettings(next);
    if (patch.theme) applyTheme(patch.theme);
  };

  const doExport = async () => {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nihongo-daily-backup-${data.exportedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Progress exported.');
  };

  const doImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as ExportedData;
      if (!Array.isArray(data.cards) || !Array.isArray(data.sessions)) {
        throw new Error('not a Nihongo Daily backup');
      }
      await importAll(data);
      setSettings(await getSettings());
      setMessage('Progress imported. Your previous state is restored.');
    } catch (e) {
      setMessage(`Import failed: ${e instanceof Error ? e.message : 'invalid file'}`);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>

      <Card>
        <label htmlFor="new-cards" className="mb-1 block font-medium">
          New cards per day
        </label>
        <p className="mb-2 text-sm text-zinc-500">Reviews are never capped.</p>
        <input
          id="new-cards"
          type="number"
          min={0}
          max={50}
          value={settings.newCardsPerDay}
          onChange={(e) => update({ newCardsPerDay: Math.max(0, Number(e.target.value) || 0) })}
          className="w-24 rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Card>

      <Card>
        <label htmlFor="voice" className="mb-2 block font-medium">
          Japanese voice
        </label>
        {ttsAvailable() ? (
          <>
            <select
              id="voice"
              value={settings.voiceURI ?? ''}
              onChange={(e) => update({ voiceURI: e.target.value || null })}
              className="mb-4 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">Browser default</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                </option>
              ))}
            </select>
            <label htmlFor="rate" className="mb-1 block font-medium">
              Speech rate: {settings.speechRate.toFixed(2)}×
            </label>
            <input
              id="rate"
              type="range"
              min={0.5}
              max={1.25}
              step={0.05}
              value={settings.speechRate}
              onChange={(e) => update({ speechRate: Number(e.target.value) })}
              className="w-full"
            />
          </>
        ) : (
          <p className="text-sm text-zinc-500">
            Speech synthesis is not available in this browser, so audio features are hidden.
          </p>
        )}
      </Card>

      <Card>
        <p className="mb-2 font-medium">Appearance</p>
        <div role="group" aria-label="Theme" className="mb-4 flex gap-2">
          {(['system', 'light', 'dark'] as const).map((t) => (
            <button
              key={t}
              onClick={() => update({ theme: t })}
              aria-pressed={settings.theme === t}
              className={`min-h-11 rounded-full px-4 text-sm capitalize ${
                settings.theme === t
                  ? 'bg-accent font-medium text-white dark:bg-accent-dark'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <label className="flex min-h-11 items-center justify-between">
          <span className="font-medium">Furigana on by default</span>
          <input
            type="checkbox"
            checked={settings.furiganaDefault}
            onChange={(e) => update({ furiganaDefault: e.target.checked })}
            className="h-5 w-5 accent-blue-600"
          />
        </label>
      </Card>

      <Card>
        <p className="mb-3 font-medium">Backup</p>
        <div className="flex gap-2">
          <Button onClick={() => void doExport()} className="flex-1">
            Export progress
          </Button>
          <Button onClick={() => fileInput.current?.click()} className="flex-1">
            Import progress
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            aria-label="Import progress file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void doImport(f);
              e.target.value = '';
            }}
          />
        </div>
        {message && <p className="mt-3 text-sm text-zinc-500">{message}</p>}
      </Card>

      <p className="px-2 text-xs text-zinc-400">
        Speech recognition works in Chrome and Edge; it is unavailable or unreliable on iOS Safari.
        Everything else works fully offline.
      </p>
    </div>
  );
}
