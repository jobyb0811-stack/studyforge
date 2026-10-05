import { useEffect } from 'react';
import AlarmScreen from './screens/AlarmScreen';
import AlarmHealth, { AlarmScoreBanner } from './screens/AlarmHealth';
import { usePath } from './nav';
import { Alarm } from './native/alarm';
import { applyPending, detectMissed, rescheduleAll } from './native/alarmSync';

function Main({ path }: { path: string }) {
  useEffect(() => {
    (async () => { await applyPending(); await detectMissed(); await rescheduleAll(); })().catch(console.error);
    const l = Alarm.addListener('alarmAction', () => { applyPending().catch(console.error); });
    return () => { l.then(h => h.remove()); };
  }, []);
  return (<main className="pb-24">
    <header className="p-5"><h1 className="text-2xl font-semibold">StudyForge</h1>
      <p className="opacity-70 mt-1">Phase 2: alarm engine. Today, Planner and Focus arrive in Phase 3.</p>
      {path.startsWith('/focus/') && <p className="mono mt-2">Focus for block {path.slice(7)} (Phase 3)</p>}</header>
    <div className="px-4"><AlarmScoreBanner /></div>
    <AlarmHealth />
  </main>);
}
export default function App() {
  const path = usePath();
  return path.startsWith('/alarm/') ? <AlarmScreen blockId={decodeURIComponent(path.slice(7))} /> : <Main path={path} />;
}
