// Shared UI primitives. Keep these dumb — no data access here.
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { speakJa, ttsAvailable } from '../lib/speech';

export function Ja({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span lang="ja" className={`leading-ja ${className}`}>
      {children}
    </span>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' };

export function Button({ variant = 'ghost', className = '', ...rest }: ButtonProps) {
  const base =
    'min-h-11 rounded-xl px-4 text-base font-medium transition-colors disabled:opacity-40';
  const styles =
    variant === 'primary'
      ? 'bg-accent text-white active:bg-blue-700 dark:bg-accent-dark'
      : 'bg-zinc-100 text-zinc-800 active:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100';
  return <button className={`${base} ${styles} ${className}`} {...rest} />;
}

export function SpeakButton({
  text,
  rate = 1,
  voiceURI = null,
  label = 'Play audio',
  className = '',
}: {
  text: string;
  rate?: number;
  voiceURI?: string | null;
  label?: string;
  className?: string;
}) {
  if (!ttsAvailable()) return null;
  return (
    <button
      aria-label={label}
      onClick={() => void speakJa(text, { rate, voiceURI })}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-zinc-100 text-lg active:bg-zinc-200 dark:bg-zinc-800 ${className}`}
    >
      <span aria-hidden="true">🔊</span>
    </button>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      {children}
    </div>
  );
}
