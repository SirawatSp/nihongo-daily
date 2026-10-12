import type { TravelPhrase } from '../data/trip';
import { Ja, SpeakButton } from './ui';

export default function PhraseDisplay({
  phrase,
  voiceURI,
  rate = 0.85,
  tip = true,
}: {
  phrase: Omit<TravelPhrase, 'tip'> & { tip?: string };
  voiceURI: string | null;
  rate?: number;
  tip?: boolean;
}) {
  return (
    <div className="space-y-3">
      <p className="text-2xl font-medium">
        <Ja>{phrase.ja}</Ja>
      </p>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        <Ja>{phrase.kana}</Ja>
      </p>
      <p className="pronunciation">{phrase.romaji}</p>
      <p className="font-medium">{phrase.en}</p>
      <div className="flex items-center gap-2">
        <SpeakButton
          text={phrase.ja}
          voiceURI={voiceURI}
          rate={rate}
          label="Listen to Japanese"
        />
        <span className="text-sm text-zinc-600 dark:text-zinc-300">
          Listen, then repeat aloud
        </span>
      </div>
      {tip && phrase.tip && (
        <p className="border-t border-zinc-200 pt-3 text-sm leading-relaxed text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
          {phrase.tip}
        </p>
      )}
    </div>
  );
}
