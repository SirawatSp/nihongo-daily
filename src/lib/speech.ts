// Web Speech API wrappers with capability detection.
// Every consumer must handle the "unavailable" case — the app degrades to
// text-only, it never crashes or blocks on a missing browser API.

export function ttsAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function recognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function asrAvailable(): boolean {
  return recognitionCtor() !== null;
}

export function jaVoices(): SpeechSynthesisVoice[] {
  if (!ttsAvailable()) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang.replace('_', '-').startsWith('ja'));
}

export interface SpeakOptions {
  rate?: number; // 1 = normal, 0.75 = slow toggle
  voiceURI?: string | null;
}

/** Speak Japanese text. Resolves when done; resolves immediately if TTS is unavailable. */
export function speakJa(text: string, opts: SpeakOptions = {}): Promise<void> {
  if (!ttsAvailable()) return Promise.resolve();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = opts.rate ?? 1;
    if (opts.voiceURI) {
      const voice = jaVoices().find((v) => v.voiceURI === opts.voiceURI);
      if (voice) u.voice = voice;
    }
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  });
}

export function stopSpeaking(): void {
  if (ttsAvailable()) window.speechSynthesis.cancel();
}

export interface RecognizeHandle {
  stop: () => void;
}

/**
 * One-shot Japanese speech recognition. Calls `onResult` with the best
 * transcript, or `onUnavailable`/`onError` on failure. Never throws.
 */
export function recognizeJa(
  callbacks: {
    onResult: (transcript: string) => void;
    onError: (message: string) => void;
    onEnd?: () => void;
  },
): RecognizeHandle | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = 'ja-JP';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e) => {
    const transcript = e.results[0]?.[0]?.transcript ?? '';
    callbacks.onResult(transcript);
  };
  rec.onerror = (e) => {
    callbacks.onError(e.error ?? 'recognition-error');
  };
  rec.onend = () => {
    callbacks.onEnd?.();
  };
  try {
    rec.start();
  } catch {
    callbacks.onError('recognition-start-failed');
    return null;
  }
  return { stop: () => rec.stop() };
}
