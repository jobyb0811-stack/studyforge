import { useEffect, useState } from 'react';
export const navigate = (p: string) => { history.pushState({}, '', p); window.dispatchEvent(new PopStateEvent('popstate')); };
export function usePath() {
  const [p, setP] = useState(location.pathname);
  useEffect(() => { const f = () => setP(location.pathname); addEventListener('popstate', f); return () => removeEventListener('popstate', f); }, []);
  return p;
}
