import { useCallback, useEffect, useState } from 'react';
import { Alarm, type Perms } from './alarm';
export function useAlarmHealth() {
  const [p, setP] = useState<Perms | null>(null);
  const refresh = useCallback(async () => setP(await Alarm.checkPermissions()), []);
  useEffect(() => { refresh(); const f = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', f); window.addEventListener('focus', f);
    return () => { document.removeEventListener('visibilitychange', f); window.removeEventListener('focus', f); }; }, [refresh]);
  const ok = p ? [p.notifications, p.exactAlarm, p.fullScreen, p.batteryExempt] : [];
  return { perms: p, refresh, score: ok.filter(Boolean).length, total: 4, allGreen: ok.length === 4 && ok.every(Boolean) };
}
