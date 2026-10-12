import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TRIP_LESSONS } from '../data/trip';
import {
  getSettings,
  getTripProgress,
  putTripProgress,
  type TripProgress,
} from '../lib/db';
import { advanceTrip, freshTripProgress, TRIP_STEPS } from '../lib/trip';
import { stopSpeaking, ttsAvailable } from '../lib/speech';
import PhraseDisplay from '../components/TravelPhrase';
import { Button, Card, SpeakButton } from '../components/ui';

export default function TripLesson() {
  const { id } = useParams();
  const lesson = TRIP_LESSONS.find((l) => l.id === id);
  const [progress, setProgress] = useState<TripProgress | null>(null);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [transcript, setTranscript] = useState(false);
  const [slow, setSlow] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);

  useEffect(() => {
    let live = true;
    setProgress(null);
    setRevealed(false);
    setPicked(null);
    setTranscript(false);
    void Promise.all([getTripProgress(), getSettings()])
      .then(([all, settings]) => {
        if (!live || !id) return;
        setProgress(all.find((p) => p.id === id) ?? freshTripProgress(id));
        setVoiceURI(settings.voiceURI);
      })
      .catch(() => {
        if (live)
          setError('Could not load your lesson. Please reload and try again.');
      });
    return () => {
      live = false;
      stopSpeaking();
    };
  }, [id]);

  const save = async (next: TripProgress) => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      await putTripProgress(next);
      stopSpeaking();
      setProgress(next);
      setRevealed(false);
      setPicked(null);
      setTranscript(false);
      window.scrollTo({ top: 0 });
    } catch {
      setError('Your progress could not be saved. Please try again.');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  if (!lesson)
    return (
      <Card>
        <h1 className="text-xl">Lesson not found</h1>
        <Link className="text-accent underline" to="/">
          Back to your plan
        </Link>
      </Card>
    );
  if (!progress) return <p role="status">{error || 'Loading your lesson…'}</p>;
  const number = TRIP_LESSONS.indexOf(lesson) + 1;
  const stage =
    progress.step < 3
      ? 'Learn'
      : progress.step < 6
        ? 'Say it from memory'
        : 'Understand the reply';
  const phrase = lesson.phrases[progress.step % 3]!;
  const choices = [lesson.reply.en, ...lesson.distractors];
  // Rotate the answer position without reshuffling after an interaction.
  const offset = number % 3;
  const options = choices.slice(offset).concat(choices.slice(0, offset));
  const answerIndex = options.indexOf(lesson.reply.en);
  const nextLesson = TRIP_LESSONS[number];

  return (
    <div className="space-y-5">
      <Link
        to="/"
        className="inline-flex min-h-11 items-center text-sm text-zinc-600 dark:text-zinc-300"
      >
        ← Save & exit to plan
      </Link>
      <header>
        <p className="eyebrow">
          Lesson {number} · {lesson.theme}
        </p>
        <h1 className="mt-2 font-display text-3xl">{lesson.title}</h1>
      </header>
      {error && (
        <p role="alert" className="text-red-600 dark:text-red-300">
          {error}
        </p>
      )}
      {progress.step >= TRIP_STEPS ? (
        <>
          <Card className="space-y-4">
            <p className="eyebrow">Lesson practised ✓</p>
            <h2 className="text-2xl font-semibold">
              You’ve rehearsed a real situation.
            </h2>
            <p>{progress.recalled} of 3 phrases recalled without help.</p>
            <p>
              Reply understood:{' '}
              {progress.listeningCorrect ? 'yes' : 'needs another listen'}.
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              This records practice, not fluency. Repeat the phrases you needed
              help with before your trip.
            </p>
            <Button
              className="w-full"
              disabled={busy}
              onClick={() =>
                void save({
                  ...freshTripProgress(lesson.id),
                  completedAt: progress.completedAt,
                })
              }
            >
              Practise this lesson again
            </Button>
          </Card>
          {nextLesson && (
            <Link className="primary-link" to={`/trip/${nextLesson.id}`}>
              Next lesson · {nextLesson.title} →
            </Link>
          )}
          <Link className="secondary-link" to="/phrasebook">
            Open trip phrasebook
          </Link>
        </>
      ) : (
        <>
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span>{stage}</span>
              <span>
                {progress.step + 1} / {TRIP_STEPS}
              </span>
            </div>
            <progress
              className="h-2 w-full"
              aria-label="Lesson progress"
              max={TRIP_STEPS}
              value={progress.step}
            />
          </div>
          {progress.step < 3 ? (
            <>
              <Card>
                <PhraseDisplay phrase={phrase} voiceURI={voiceURI} />
              </Card>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Say it aloud twice. Try to copy the rhythm, then continue.
              </p>
              <Button
                variant="primary"
                className="w-full py-4"
                disabled={busy}
                onClick={() => void save(advanceTrip(progress))}
              >
                I’ve practised it · Continue
              </Button>
            </>
          ) : progress.step < 6 ? (
            <>
              <Card className="space-y-4">
                <p className="eyebrow">Your turn</p>
                <h2 className="text-2xl">{phrase.en}</h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  Say it in Japanese before revealing the phrase.
                </p>
                {revealed && (
                  <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
                    <PhraseDisplay
                      phrase={phrase}
                      voiceURI={voiceURI}
                      tip={false}
                    />
                  </div>
                )}
              </Card>
              {!revealed ? (
                <Button
                  variant="primary"
                  className="w-full py-4"
                  onClick={() => setRevealed(true)}
                >
                  Reveal & compare
                </Button>
              ) : (
                <>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    Could you say it without looking? Rate your recall yourself;
                    pronunciation is not automatically scored.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      disabled={busy}
                      onClick={() => void save(advanceTrip(progress, false))}
                    >
                      Needed help
                    </Button>
                    <Button
                      variant="primary"
                      disabled={busy}
                      onClick={() => void save(advanceTrip(progress, true))}
                    >
                      Recalled it
                    </Button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <Card className="space-y-4">
                <p>{lesson.replyContext}</p>
                {ttsAvailable() ? (
                  <div className="flex items-center gap-3">
                    <SpeakButton
                      text={lesson.reply.ja}
                      voiceURI={voiceURI}
                      rate={slow ? 0.75 : 1}
                      label="Listen to the reply"
                    />
                    <Button
                      aria-pressed={slow}
                      onClick={() => setSlow((s) => !s)}
                    >
                      {slow ? 'Slow · 0.75×' : 'Normal · 1×'}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm">
                    Audio is unavailable here. Read the Japanese reply instead.
                  </p>
                )}
                <Button
                  onClick={() => setTranscript((s) => !s)}
                  aria-expanded={transcript}
                >
                  {transcript ? 'Hide Japanese text' : 'Show Japanese text'}
                </Button>
                {(transcript || !ttsAvailable()) && (
                  <>
                    <p lang="ja" className="text-xl">
                      {lesson.reply.ja}
                    </p>
                    <p className="pronunciation">{lesson.reply.romaji}</p>
                  </>
                )}
                <h2 className="font-semibold">What does the reply mean?</h2>
                <div className="space-y-2">
                  {options.map((option, i) => (
                    <Button
                      key={option}
                      disabled={picked !== null}
                      className="w-full py-3 text-left"
                      onClick={() => setPicked(i)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
                {picked !== null && (
                  <div
                    role="status"
                    className="space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-700"
                  >
                    <p className="font-semibold">
                      {picked === answerIndex ? 'Correct.' : 'Not quite.'}{' '}
                      {lesson.reply.en}
                    </p>
                    <PhraseDisplay
                      phrase={lesson.reply}
                      voiceURI={voiceURI}
                      tip={false}
                    />
                  </div>
                )}
              </Card>
              {picked !== null && (
                <Button
                  variant="primary"
                  className="w-full py-4"
                  disabled={busy}
                  onClick={() =>
                    void save(advanceTrip(progress, picked === answerIndex))
                  }
                >
                  Finish lesson
                </Button>
              )}
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                If you hear no audio, use the text or check the Japanese voice
                in Settings. Offline audio needs an installed Japanese voice.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
