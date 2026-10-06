import { useEffect, useRef, useState } from 'react';
import { db } from '../db/db';
import { useData } from '../state/store';
import { Alarm, isNative } from '../native/alarm';
import { buzz, completeBlock, uid } from '../state/actions';
import { fmtClock } from '../lib/date';
import { infoOf } from '../lib/info';
import { navigate } from '../nav';
import { beep, unlockAudio } from '../lib/beep';
import { StatusSheet } from '../components/ui';

const PRESETS: [number, number][] = [[25, 5], [50, 10]];
export default function Focus({ blockId }: { blockId: string }) {
  const d = useData(); const block = d.blocks.find(b => b.id === blockId);
  const [cfg, setCfg] = useState({ f: 25, b: 5 }); const [phase, setPhase] = useState<'idle' | 'focus' | 'break'>('idle');
  const [endAt, setEndAt] = useState(0); const [paused, setPaused] = useState<number | null>(null); const [now, setNow] = useState(Date.now());
  const [cycles, setCycles] = useState(0); const [total, setTotal] = useState(0); const [finish, setFinish] = useState(false);
  const startedAt = useRef(0);
  const remaining = phase === 'idle' ? cfg.f * 60000 : paused !== null ? paused : Math.max(0, endAt - now);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  useEffect(() => { // keep screen awake (native flag, web wake lock as fallback)
    let lock: { release: () => Promise<void> } | null = null;
    const get = async () => { try { lock = await (navigator as any).wakeLock?.request('screen'); } catch { /* ignore */ } };
    Alarm.keepAwake({ on: true }).catch(() => {}); if (!isNative) get();
    const vis = () => { if (!document.hidden && !isNative) get(); }; document.addEventListener('visibilitychange', vis);
    return () => { document.removeEventListener('visibilitychange', vis); lock?.release().catch(() => {}); Alarm.keepAwake({ on: false }).catch(() => {}); };
  }, []);
  const log = async (min: number) => { if (min < 1) return; setTotal(t => t + min);
    await db.sessions.put({ id: uid(), blockId: block ? blockId : undefined, startedAt: Date.now() - min * 60000, minutes: min }); };
  const begin = (p: 'focus' | 'break') => { setPhase(p); setPaused(null); setEndAt(Date.now() + (p === 'focus' ? cfg.f : cfg.b) * 60000); if (p === 'focus') startedAt.current = Date.now(); };
  useEffect(() => { if (phase === 'idle' || paused !== null || remaining > 0) return;
    buzz([200, 100, 200, 100, 400]); beep(3);
    if (phase === 'focus') { log(cfg.f); setCycles(c => c + 1); begin('break'); } else begin('focus');
  }); // eslint-disable-line
  const partial = () => phase === 'focus' ? Math.round((cfg.f * 60000 - remaining) / 60000) : 0;
  const exit = async () => { await log(partial()); navigate('/'); };
  const info = block ? infoOf(block, d) : null;
  return (<main className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6" style={{ background: 'var(--bg)', paddingTop: 'calc(24px + env(safe-area-inset-top))' }}>
    <div className="text-center space-y-1"><div className="text-sm font-semibold" style={{ color: phase === 'break' ? 'var(--ok)' : 'var(--accent)' }}>{phase === 'idle' ? 'READY' : phase === 'focus' ? '● FOCUS' : '☕ BREAK'}</div>
      <h1 className="text-xl font-semibold">{block?.title ?? 'Free focus'}</h1>
      {info && <p className="text-sm" style={{ color: 'var(--muted)' }}>{info.subject}</p>}</div>
    <div className="text-center"><div className="mono font-medium" style={{ fontSize: 'clamp(72px,24vw,120px)', lineHeight: 1 }} role="timer">{fmtClock(remaining)}</div>
      <p className="mono mt-4 text-sm" style={{ color: 'var(--muted)' }}>{cycles} cycles · {total} min logged</p></div>
    <div className="w-full space-y-3">
      {phase === 'idle' && (<><div className="flex gap-2">{PRESETS.map(([f, b]) => <button key={f} className={`btn flex-1 mono ${cfg.f === f ? 'btn-accent' : ''}`} onClick={() => setCfg({ f, b })}>{f}/{b}</button>)}</div>
        <div className="flex gap-2 items-center text-sm"><span>Custom</span><input aria-label="Focus minutes" type="number" min={1} className="input mono" value={cfg.f} onChange={e => setCfg(c => ({ ...c, f: Math.max(1, +e.target.value || 1) }))} />
          <input aria-label="Break minutes" type="number" min={1} className="input mono" value={cfg.b} onChange={e => setCfg(c => ({ ...c, b: Math.max(1, +e.target.value || 1) }))} /></div>
        <button className="btn btn-accent w-full" onClick={() => { unlockAudio(); begin('focus'); }}>Start focus</button></>)}
      {phase !== 'idle' && (<div className="flex gap-3">
        <button className="btn flex-1" onClick={() => paused === null ? setPaused(Math.max(0, endAt - Date.now())) : (setEndAt(Date.now() + paused), setPaused(null))}>{paused === null ? 'Pause' : 'Resume'}</button>
        {phase === 'break' && <button className="btn flex-1" onClick={() => begin('focus')}>Skip break</button>}</div>)}
      <div className="flex gap-3"><button className="btn flex-1" onClick={exit}>Exit</button>
        {block && block.status !== 'done' && <button className="btn flex-1" onClick={() => setFinish(true)}>✓ Block done</button>}</div>
    </div>
    {finish && block && <StatusSheet block={block} topics={info!.topics} onCancel={async () => { await log(partial()); await completeBlock(block, block.topicIds); navigate('/'); }}
      onSave={async (s, c) => { await log(partial()); await completeBlock(block, block.topicIds, s, c); navigate('/'); }} />}
  </main>);
}
