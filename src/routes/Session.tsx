import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SessionShell from '../session/SessionShell';
import { useSession } from '../session/useSession';
import { getActiveSession } from '../lib/db';
import { dateKey } from '../lib/streak';

export default function Session() {
  const active = useSession((s) => s.active);
  const resume = useSession((s) => s.resume);
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  // Opening /session directly — a reload, or reopening the installed app —
  // picks up today's unfinished session rather than dropping you home.
  useEffect(() => {
    if (active) {
      setChecked(true);
      return;
    }
    let live = true;
    void getActiveSession().then((saved) => {
      if (!live) return;
      if (saved && saved.date === dateKey(new Date())) resume(saved);
      else navigate('/', { replace: true });
      setChecked(true);
    });
    return () => {
      live = false;
    };
  }, [active, resume, navigate]);

  if (!checked) return null;
  return <SessionShell />;
}
