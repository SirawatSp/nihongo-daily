import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearActiveSession, getActiveSession, getAllSessions, getSession, type ActiveSession } from '../lib/db';
import { currentStreak, dateKey } from '../lib/streak';
import { BLOCKS, useSession } from '../session/useSession';
import { Button } from '../components/ui';

export default function Home() {
  const navigate = useNavigate();
  const start = useSession((s) => s.start);
  const resume = useSession((s) => s.resume);
  const [streak, setStreak] = useState(0);
  const [doneToday, setDoneToday] = useState(false);
  const [unfinished, setUnfinished] = useState<ActiveSession | null>(null);

  useEffect(() => {
    const today = dateKey(new Date());
    void getAllSessions().then((all) => {
      setStreak(currentStreak(all.map((s) => s.date), today));
    });
    void getSession(today).then((s) => setDoneToday(Boolean(s)));
    void getActiveSession().then((s) => {
      // Only today's session is worth resuming; yesterday's is stale.
      if (s && s.date === today) setUnfinished(s);
      else if (s) void clearActiveSession();
    });
  }, []);

  const beginFresh = () => {
    start();
    navigate('/session');
  };

  const continueSession = () => {
    if (!unfinished) return;
    resume(unfinished);
    navigate('/session');
  };

  const nextBlock = unfinished ? BLOCKS[unfinished.blockIndex] : undefined;

  return (
    <div className="flex min-h-[70dvh] flex-col">
      <header className="pt-10 text-center">
        <h1 className="text-2xl font-semibold">
          Nihongo <span className="text-accent dark:text-accent-dark">Daily</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          {streak > 0 ? `${streak}-day streak` : 'A little every day'}
        </p>
      </header>

      <div className="flex flex-1 items-end pb-10">
        <div className="w-full space-y-3">
          {unfinished && nextBlock ? (
            <>
              <p className="text-center text-sm text-zinc-500">
                You stopped part-way through — {unfinished.blockIndex} of {BLOCKS.length} blocks
                done.
              </p>
              <Button variant="primary" className="w-full py-5 text-lg" onClick={continueSession}>
                Continue — {nextBlock.label}
              </Button>
              <Button className="w-full" onClick={beginFresh}>
                Start over instead
              </Button>
            </>
          ) : (
            <>
              {doneToday && (
                <p className="text-center text-sm text-zinc-500">
                  Today's session is done — another round is always fine.
                </p>
              )}
              <Button variant="primary" className="w-full py-5 text-lg" onClick={beginFresh}>
                Start today's session
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
