import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SessionShell from '../session/SessionShell';
import { useSession } from '../session/useSession';

export default function Session() {
  const startedAt = useSession((s) => s.startedAt);
  const navigate = useNavigate();

  // Deep-linking straight to /session without starting goes home instead.
  useEffect(() => {
    if (startedAt === null) navigate('/', { replace: true });
  }, [startedAt, navigate]);

  return <SessionShell />;
}
