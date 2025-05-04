// src/components/auth/RequireAuth.tsx
import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

export function RequireAuth({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'ok' | 'not-auth'>('loading');
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/auth/me', {
      credentials: 'include',    // send session cookie
    })
      .then(res => {
        if (res.ok) return setStatus('ok');
        throw new Error();
      })
      .catch(() => setStatus('not-auth'));
  }, []);

  if (status === 'loading') {
    return <div>Checking authentication…</div>;
  }

  if (status === 'not-auth') {
    // Redirect user back to login page
    navigate('/');
    return null;
  }

  // status === 'ok'
  return <>{children}</>;
}

