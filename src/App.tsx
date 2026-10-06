import { useEffect } from 'react';
import AlarmScreen from './screens/AlarmScreen';
import Today from './screens/Today';
import Focus from './screens/Focus';
import Planner from './screens/Planner';
import Syllabus from './screens/Syllabus';
import Stats from './screens/Stats';
import Settings from './screens/Settings';
import Onboarding from './screens/Onboarding';
import { useUI } from './state/appSettings';
import { autoBackupIfDue } from './native/backup';
import { Shell } from './components/ui';
import { usePath } from './nav';
import { Alarm } from './native/alarm';
import { applyPending, detectMissed, rescheduleAll } from './native/alarmSync';
import { useData } from './state/store';


function Main({ path }: { path: string }) {
  useEffect(() => {
    const load = useData.getState().load;
    (async () => { await useUI.getState().load(); await load(); await applyPending(); await detectMissed(); await load(); await rescheduleAll(); await autoBackupIfDue(); })().catch(console.error);
    const l = Alarm.addListener('alarmAction', () => { applyPending().then(load).catch(console.error); });
    const vis = () => { if (!document.hidden) applyPending().then(load).catch(console.error); }; document.addEventListener('visibilitychange', vis);
    return () => { l.then(h => h.remove()); document.removeEventListener('visibilitychange', vis); };
  }, []);
  const { ready, ui } = useUI(); const dataReady = useData(x => x.ready);
  if (!ready || !dataReady) return <div className="p-4 space-y-3"><div className="skel h-28" /><div className="skel h-40" /></div>;
  if (!ui.onboarded) return <Onboarding />;
  if (path.startsWith('/focus/')) return <Focus blockId={decodeURIComponent(path.slice(7))} />;
  return (<Shell path={path}>
    {path === '/plan' ? <Planner /> : path.startsWith('/syllabus') ? <Syllabus /> : path.startsWith('/stats') ? <Stats />
      : path.startsWith('/settings') ? <Settings /> : <Today />}
  </Shell>);
}
export default function App() {
  const path = usePath();
  return path.startsWith('/alarm/') ? <AlarmScreen blockId={decodeURIComponent(path.slice(7))} /> : <Main path={path} />;
}
