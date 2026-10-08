import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getActiveSession, type ActiveSession } from '../lib/db';
import { dateKey } from '../lib/streak';
import { useSession } from '../session/useSession';
import { Button, Card } from '../components/ui';

export default function More() {
  const [saved, setSaved] = useState<ActiveSession | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    void getActiveSession().then((s) =>
      setSaved(s?.date === dateKey(new Date()) ? s : null),
    );
  }, []);
  return (
    <div className="space-y-5">
      <header>
        <p className="eyebrow">Make it yours</p>
        <h1 className="mt-2 font-display text-3xl">More ways to learn</h1>
      </header>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        Your travel lessons cover the essentials. These tools are here when you
        want to go further.
      </p>
      <div className="space-y-2">
        {[
          ['/progress', 'Your progress', 'Travel lessons and extra study'],
          [
            '/settings',
            'Settings & backup',
            'Departure date, voice, appearance, and saved progress',
          ],
          ['/grammar', 'Grammar reference', 'Look up patterns and examples'],
          ['/kanji', 'Kanji writing', 'Optional character practice'],
        ].map(([to, title, hint]) => (
          <Link key={to} to={to!} className="shortcut-card block">
            <span className="block font-semibold">{title} →</span>
            <span className="mt-1 block text-sm text-zinc-600 dark:text-zinc-300">
              {hint}
            </span>
          </Link>
        ))}
      </div>
      <Card className="space-y-3">
        <h2 className="font-semibold">Full study session</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          ~18 minutes · Kana, vocabulary, handwriting, listening, speaking, and
          reading. Includes N4–N3 material.
        </p>
        {saved && (
          <Button
            className="w-full"
            onClick={() => {
              useSession.getState().resume(saved);
              navigate('/session');
            }}
          >
            Resume full session
          </Button>
        )}
        <Button
          className="w-full"
          onClick={() => {
            useSession.getState().start();
            navigate('/session');
          }}
        >
          Start full session
        </Button>
      </Card>
      <p className="text-xs text-zinc-600 dark:text-zinc-300">
        For more beginner listening practice, explore the Japan Foundation’s{' '}
        <a
          className="underline"
          href="https://www.irodori.jpf.go.jp/en/starter/pdf.html"
          target="_blank"
          rel="noreferrer"
        >
          Irodori Starter
        </a>
        .
      </p>
    </div>
  );
}
