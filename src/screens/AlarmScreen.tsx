import { useEffect, useRef, useState } from 'react';
import { Alarm, type NativeAlarm } from '../native/alarm';
declare global { interface Window { __alarmBack?: () => void } }
const REASONS = ['Sick / tired', 'Emergency', 'Class or lab ran over', 'Moved to later'];

function SlideToStart({ onDone, disabled }: { onDone: () => void; disabled: boolean }) {
  const track = useRef<HTMLDivElement>(null); const [x, setX] = useState(0); const drag = useRef(false);
  const max = () => (track.current?.clientWidth ?? 300) - 64;
  return (<div ref={track} className="relative h-16 rounded-full select-none" style={{ background: 'var(--card)', touchAction: 'none' }}>
    <span className="absolute inset-0 flex items-center justify-center font-semibold opacity-70">Slide to start →</span>
    <div role="slider" aria-label="Slide to start" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((x / max()) * 100)}
      className="absolute top-1 left-1 h-14 w-14 rounded-full flex items-center justify-center text-white text-2xl" style={{ background: 'var(--accent)', transform: `translateX(${x}px)` }}
      onPointerDown={e => { if (disabled) return; drag.current = true; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={e => { if (drag.current && track.current) setX(Math.max(0, Math.min(max(), e.clientX - track.current.getBoundingClientRect().left - 32))); }}
      onPointerUp={() => { drag.current = false; if (x > max() * 0.85) onDone(); else setX(0); }}>▶</div>
  </div>);
}

export default function AlarmScreen({ blockId }: { blockId: string }) {
  const [info, setInfo] = useState<NativeAlarm | null>(null); const [now, setNow] = useState(new Date());
  const [skip, setSkip] = useState(false); const [reason, setReason] = useState(''); const busy = useRef(false);
  useEffect(() => { Alarm.getAlarmInfo({ blockId }).then(r => setInfo(r.info)); const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, [blockId]);
  const left = Math.max(0, 3 - (info?.snoozes ?? 0));
  const act = async (action: 'start' | 'snooze' | 'skip', minutes = 5, why = '') => {
    if (busy.current) return; busy.current = true;
    try { const r = await Alarm.alarmAction({ blockId, action, minutes, reason: why }); if (r.snoozesLeft >= 0) setInfo(i => i && { ...i, snoozes: r.snoozes }); }
    finally { busy.current = false; }
  };
  window.__alarmBack = () => { act('snooze', 5); }; // Back = snooze (auto-Missed after 3)
  const t = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return (<main className="min-h-screen flex flex-col justify-between p-6 gap-6" style={{ background: 'var(--bg)' }}>
    <div className="text-center pt-8">
      <div className="mono font-medium" style={{ fontSize: 'clamp(72px,26vw,128px)', lineHeight: 1 }}>{t}</div>
      <h1 className="text-2xl font-semibold mt-6">{info?.title ?? 'Study alarm'}</h1>
      {info?.subject && <p className="mt-2 flex items-center justify-center gap-2" style={{ color: 'var(--muted)' }}>
        <span className="inline-block w-3 h-3 rounded-full" style={{ background: info.color ?? 'var(--accent)' }} aria-hidden />{info.subject}</p>}
      <ul className="mt-4 space-y-1">{(info?.topics ?? []).slice(0, 3).map(x => <li key={x}>{x}</li>)}
        {!!info?.more && <li style={{ color: 'var(--muted)' }}>+{info.more} more</li>}</ul>
    </div>
    <div className="space-y-4">
      {skip ? (<div className="space-y-3">
        <p className="font-semibold">Why skip? (required)</p>
        <div className="flex flex-wrap gap-2">{REASONS.map(r => <button key={r} className={`btn ${reason === r ? 'btn-accent' : ''}`} onClick={() => setReason(r)}>{r}</button>)}</div>
        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Or type a reason" className="w-full min-h-[48px] px-4 rounded-[18px]" style={{ background: 'var(--card)', color: 'var(--fg)' }} />
        <div className="flex gap-3"><button className="btn flex-1" onClick={() => setSkip(false)}>Back</button>
          <button className="btn btn-accent flex-1" disabled={!reason.trim()} style={{ opacity: reason.trim() ? 1 : .5 }} onClick={() => act('skip', 0, reason.trim())}>Skip block</button></div>
      </div>) : (<>
        <div className="flex gap-2">{[5, 10, 15].map(m => (<button key={m} className="btn flex-1" disabled={left === 0} style={{ opacity: left ? 1 : .5 }} onClick={() => act('snooze', m)}>Snooze {m}</button>))}</div>
        <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>{left} snooze{left === 1 ? '' : 's'} left</p>
        <button className="btn w-full" onClick={() => setSkip(true)}>Skip…</button>
        <SlideToStart disabled={false} onDone={() => act('start')} />
      </>)}
    </div>
  </main>);
}
