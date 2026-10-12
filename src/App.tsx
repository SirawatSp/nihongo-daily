import { lazy, Suspense, useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import Home from './routes/Home';
import Phrasebook from './routes/Phrasebook';
import Quick from './routes/Quick';
import Settings from './routes/Settings';
import More from './routes/More';
import TripLesson from './routes/TripLesson';
import UpdateToast from './components/UpdateToast';
import { getSettings } from './lib/db';

// The optional handwriting data should not delay the beginner course.
const Session = lazy(() => import('./routes/Session'));
const Kanji = lazy(() => import('./routes/Kanji'));
const Progress = lazy(() => import('./routes/Progress'));
const Grammar = lazy(() => import('./routes/Grammar'));

export function applyTheme(theme: 'system' | 'light' | 'dark') {
  const dark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
  try {
    if (theme === 'system') localStorage.removeItem('nihongo-theme');
    else localStorage.setItem('nihongo-theme', theme);
  } catch {
    /* private mode — theme just won't persist */
  }
}

const tabs = [
  { to: '/', label: 'Today', icon: '☀️' },
  { to: '/quick', label: 'Practice', icon: '⚡' },
  { to: '/phrasebook', label: 'Phrases', icon: '💬' },
  { to: '/more', label: 'More', icon: '☰' },
];

export default function App() {
  const location = useLocation();
  const inSession =
    location.pathname === '/session' || location.pathname.startsWith('/trip/');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  useEffect(() => {
    getSettings()
      .then((s) => applyTheme(s.theme))
      .finally(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <main className="flex-1 px-4 pb-24 pt-4">
        <Suspense fallback={<p role="status">Loading…</p>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/session" element={<Session />} />
            <Route path="/phrasebook" element={<Phrasebook />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/grammar" element={<Grammar />} />
            <Route path="/kanji" element={<Kanji />} />
            <Route path="/quick" element={<Quick />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/more" element={<More />} />
            <Route
              path="/trip/:id"
              element={<TripLesson key={location.pathname} />}
            />
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </main>
      {!inSession && (
        <nav
          aria-label="Main navigation"
          className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="mx-auto flex max-w-md">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.to === '/'}
                className={({ isActive }) =>
                  `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs ${
                    isActive ||
                    (t.to === '/more' &&
                      ['/grammar', '/kanji', '/progress', '/settings'].includes(
                        location.pathname,
                      ))
                      ? 'font-semibold text-accent dark:text-accent-dark'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`
                }
              >
                <span aria-hidden="true" className="text-base">
                  {t.icon}
                </span>
                {t.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
      <UpdateToast />
    </div>
  );
}
