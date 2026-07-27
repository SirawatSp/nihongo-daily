import { useEffect, useMemo, useRef, useState } from 'react';
import dialoguesRaw from '../../data/dialogues.json';
import type { DialogueEntry } from '../../data/schema';
import { getSettings, type BlockId } from '../../lib/db';
import { asrAvailable, recognizeJa, speakJa, ttsAvailable, type RecognizeHandle } from '../../lib/speech';
import { matchAnswer } from '../../lib/match';
import type { BlockResult } from '../useSession';
import { Button, Card, Ja, SpeakButton } from '../../components/ui';

const dialogues = dialoguesRaw as DialogueEntry[];
const PROMPT_COUNT = 6;

interface Prompt {
  en: string;
  ja: string;
  kana: string;
}

function buildPrompts(): Prompt[] {
  const pool = dialogues
    .flatMap((d) => d.lines.filter((l) => l.speaker === 'You'))
    .filter((l) => l.ja.length <= 30);
  return [...pool]
    .sort(() => Math.random() - 0.5)
    .slice(0, PROMPT_COUNT)
    .map((l) => ({ en: l.en, ja: l.ja, kana: l.kana }));
}

interface Props {
  onDone: (id: BlockId, result: BlockResult) => void;
  onSkip: () => void;
}

type Phase = 'idle' | 'listening' | 'result';

export default function Speaking({ onDone }: Props) {
  const prompts = useMemo(buildPrompts, []);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [passed, setPassed] = useState<boolean | null>(null);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const handle = useRef<RecognizeHandle | null>(null);
  const asr = asrAvailable();

  useEffect(() => {
    void getSettings().then((s) => setVoiceURI(s.voiceURI));
    return () => handle.current?.stop();
  }, []);

  const prompt = prompts[index];
  if (!prompt) return null;

  const startListening = () => {
    setPhase('listening');
    setTranscript('');
    handle.current = recognizeJa({
      onResult: (text) => {
        const result = matchAnswer(text, prompt);
        setTranscript(text);
        setPassed(result.pass);
        setPhase('result');
        if (ttsAvailable()) void speakJa(prompt.ja, { voiceURI });
      },
      onError: () => {
        setTranscript('');
        setPassed(null);
        setPhase('result');
        if (ttsAvailable()) void speakJa(prompt.ja, { voiceURI });
      },
      onEnd: () => {
        // No result event (silence): fall through to the model answer.
        setPhase((p) => (p === 'listening' ? 'result' : p));
      },
    });
    if (!handle.current) setPhase('result');
  };

  const reveal = () => {
    setPassed(null);
    setPhase('result');
    if (ttsAvailable()) void speakJa(prompt.ja, { voiceURI });
  };

  const next = () => {
    setPhase('idle');
    setTranscript('');
    setPassed(null);
    if (index + 1 >= prompts.length) {
      // Speaking is practice, not a gate — it contributes no graded answers.
      onDone('speaking', { correct: 0, total: 0 });
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <div>
      <p className="mb-2 text-center text-sm text-zinc-400">
        {index + 1} / {prompts.length}
      </p>
      <Card className="mb-6 text-center">
        <p className="text-sm uppercase tracking-wide text-zinc-400">Say in Japanese</p>
        <p className="mt-3 text-xl">{prompt.en}</p>
        {phase === 'result' && (
          <div className="mt-5 space-y-2 rounded-xl bg-zinc-50 p-4 text-left dark:bg-zinc-800/60">
            {transcript && (
              <p className="text-sm">
                You said: <Ja>{transcript}</Ja>{' '}
                {passed !== null && (
                  <span className={passed ? 'text-green-600' : 'text-zinc-400'}>
                    {passed ? '· close enough!' : '· keep practicing'}
                  </span>
                )}
              </p>
            )}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p>
                  <Ja>{prompt.ja}</Ja>
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  <Ja>{prompt.kana}</Ja>
                </p>
              </div>
              <SpeakButton text={prompt.ja} voiceURI={voiceURI} />
            </div>
          </div>
        )}
      </Card>
      {phase === 'idle' &&
        (asr ? (
          <div className="space-y-2">
            <Button variant="primary" className="w-full py-4" onClick={startListening}>
              🎤 Tap to speak
            </Button>
            <Button className="w-full" onClick={reveal}>
              Show answer instead
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-center text-sm text-zinc-500">
              Speech recognition isn't available in this browser — say it aloud, then compare.
            </p>
            <Button variant="primary" className="w-full py-4" onClick={reveal}>
              Show model answer
            </Button>
          </div>
        ))}
      {phase === 'listening' && (
        <Button className="w-full animate-pulse py-4" onClick={() => handle.current?.stop()}>
          Listening… tap to stop
        </Button>
      )}
      {phase === 'result' && (
        <Button variant="primary" className="w-full py-4" onClick={next}>
          {index + 1 >= prompts.length ? 'Finish block' : 'Next'}
        </Button>
      )}
    </div>
  );
}
