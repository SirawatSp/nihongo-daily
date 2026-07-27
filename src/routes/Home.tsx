import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSessions, getSession } from '../lib/db';
import { currentStreak, dateKey } from '../lib/streak';
import { useSession } from '../session/useSession';
import { Button } from '../components/ui';

export default function Home() {
  const navigate = useNavigate();
  const start = useSession((s) => s.start);
  const [streak, setStreak] = useState(0);
  const [doneToday, setDoneToday] = useState(false);

  useEffect(() => {
    const today = dateKey(new Date());
    void getAllSessions().then((all) => {
      setStreak(currentStreak(all.map((s) => s.date), today));
    });
    void getSession(today).then((s) => setDoneToday(Boolean(s)));
  }, []);

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
          {doneToday && (
            <p className="text-center text-sm text-zinc-500">
              Today's session is done — another round is always fine.
            </p>
          )}
          <Button
            variant="primary"
            className="w-full py-5 text-lg"
            onClick={() => {
              start();
              navigate('/session');
            }}
          >
            Start today's session
          </Button>
        </div>
      </div>
    </div>
  );
}
