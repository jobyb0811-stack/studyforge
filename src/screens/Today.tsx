import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { db } from '../db/db';
import type { Block } from '../db/types';
import { useData } from '../state/store';
import { atMs, fmtClock, fmtTime, nowMin, todayStr, toMin } from '../lib/date';
import { infoOf } from '../lib/info';
import { computeStreak } from '../plan/streak';
import { completeBlock, moveMissed, skipBlock, snoozeBlock } from '../state/actions';
import { ExamDate, Sheet, StatusSheet } from '../components/ui';
import BlockSheet from '../components/BlockSheet';
import { AlarmScoreBanner } from './AlarmHealth';
import { navigate } from '../nav';

const MARK: Record<string, { i: string; l: string; c: string }> = {
  planned: { i: '●', l: 'Planned', c: 'var(--accent)' }, snoozed: { i: '◔', l: 'Snoozed', c: 'var(--warn)' }, done: { i: '✓', l: 'Done', c: 'var(--ok)' },
  skipped: { i: '↷', l: 'Skipped', c: 'var(--muted)' }, missed: { i: '✗', l: 'Missed', c: 'var(--warn)' } };

function Swipe({ onRight, onLeft, children }: { onRight: () => void; onLeft: () => void; children: ReactNode }) {
  const [x, setX] = useState(0); const s = useRef<number | null>(null);
  return (<div className="relative rounded-[20px] overflow-hidden" style={{ background: 'var(--card)' }}>
    <div className="absolute inset-0 flex items-center justify-between px-6 font-semibold" aria-hidden><span style={{ color: 'var(--ok)' }}>✓ Done</span><span style={{ color: 'var(--warn)' }}>Skip / Snooze ↷</span></div>
    <div style={{ transform: `translateX(${x}px)`, transition: s.current === null ? 'transform .18s' : 'none', background: 'var(--bg)', touchAction: 'pan-y' }} className="relative rounded-[20px] border" 
      onPointerDown={e => { s.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); }}
      onPointerMove={e => { if (s.current !== null) setX(Math.max(-140, Math.min(140, e.clientX - s.current))); }}
      onPointerUp={() => { const d = x; s.current = null; setX(0); if (d > 90) onRight(); else if (d < -90) onLeft(); }}
      onPointerCancel={() => { s.current = null; setX(0); }}>{children}</div></div>);
}

export default function Today() {
  const d = useData(); const [now, setNow] = useState(Date.now());
  const [done, setDone] = useState<Block | null>(null); const [act, setAct] = useState<Block | null>(null); const [why, setWhy] = useState(''); const [reasonFor, setReasonFor] = useState<Block | null>(null);
  const [edit, setEdit] = useState<Block | null>(null); const [checkin, setCheckin] = useState<boolean | null>(null); const [rate, setRate] = useState(0); const [note, setNote] = useState('');
  const today = todayStr(); const h12 = d.plan.hour12;
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { db.kv.get(`checkin:${today}`).then(r => setCheckin(!!r)); }, [today]);
  const mine = useMemo(() => d.blocks.filter(b => b.date === today).sort((a, b) => a.start.localeCompare(b.start)), [d.blocks, today]);
  if (!d.ready) return <div className="p-4 space-y-3"><div className="skel h-28" /><div className="skel h-40" /><div className="skel h-20" /></div>;
  const open = (b: Block) => b.status === 'planned' || b.status === 'snoozed';
  const nm = nowMin();
  const cur = mine.find(b => open(b) && toMin(b.start) <= nm && nm < toMin(b.start) + b.durationMin) ?? mine.find(b => open(b) && toMin(b.start) > nm);
  const live = !!cur && toMin(cur.start) <= nm;
  const ms = cur ? (live ? atMs(today, cur.start) + cur.durationMin * 60000 - now : atMs(today, cur.start) - now) : 0;
  const counted = mine.filter(b => b.status !== 'skipped'); const doneN = counted.filter(b => b.status === 'done').length;
  const pct = counted.length ? Math.round((doneN / counted.length) * 100) : 0;
  const overdue = mine.filter(b => open(b) && toMin(b.start) + b.durationMin < nm).length + d.blocks.filter(b => b.date < today && (b.status === 'missed' || open(b))).length;
  const st = computeStreak(d.blocks, d.plan.offDays, today);
  const ci = cur ? infoOf(cur, d) : null;
  const finish = (b: Block, s?: Parameters<typeof completeBlock>[2], c?: Parameters<typeof completeBlock>[3]) => { completeBlock(b, b.topicIds, s, c); setDone(null); };

  return (<main className="p-4 space-y-4">
    <header className="flex items-center justify-between"><div><h1 className="text-2xl font-semibold">Today</h1>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>{new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
      <button aria-label="Search" className="btn" style={{ padding: '0 14px' }} onClick={() => navigate('/syllabus?search=1')}>🔍</button>
      <div className="text-right"><div className="mono text-xl font-medium" aria-label={`${st.streak} day streak`}>🔥 {st.streak}</div>
        <div className="text-xs" style={{ color: 'var(--muted)' }}>{st.freezeAvailable ? 'freeze ready' : 'freeze used'}</div></div></header>
    <AlarmScoreBanner onOpen={() => navigate('/settings')} />
    {overdue > 0 && <button className="card w-full text-left min-h-[48px]" style={{ color: 'var(--warn)' }} onClick={() => moveMissed('today')}>
      <span aria-hidden>⚠ </span><b>Behind schedule: {overdue} block{overdue > 1 ? 's' : ''}</b> — tap to move to today</button>}
    <div className="card"><div className="flex justify-between text-sm mb-2"><span>{doneN}/{counted.length} blocks</span><span className="mono">{pct}%</span></div>
      <div className="h-2 rounded-full" style={{ background: 'var(--bg)' }} role="progressbar" aria-valuenow={pct}><div className="h-2 rounded-full" style={{ width: `${pct}%`, background: 'var(--accent)', transition: 'width .2s' }} /></div></div>

    {cur ? (<Swipe onRight={() => setDone(cur)} onLeft={() => setAct(cur)}>
      <div className="p-5 space-y-3 border-l-4" style={{ borderColor: ci!.color }}>
        <div className="text-sm font-semibold" style={{ color: live ? 'var(--ok)' : 'var(--muted)' }}>{live ? '● NOW' : 'UP NEXT'} · {fmtTime(cur.start, h12)}</div>
        <div className="mono font-medium" style={{ fontSize: 56, lineHeight: 1 }} aria-live="off">{fmtClock(ms)}</div>
        <div className="text-xl font-semibold">{cur.title}</div>
        <div className="text-sm" style={{ color: 'var(--muted)' }}>{ci!.subject}{ci!.topics.length ? ` · ${ci!.topics.slice(0, 3).map(t => t.title).join(', ')}${ci!.topics.length > 3 ? ` +${ci!.topics.length - 3}` : ''}` : ''}</div>
        <div className="flex gap-2 pt-1"><button className="btn btn-accent flex-1" onClick={() => navigate(`/focus/${cur.id}`)}>Focus</button>
          <button className="btn flex-1" onClick={() => setDone(cur)}>✓ Done</button><button className="btn" aria-label="More actions" onClick={() => setAct(cur)}>⋯</button></div>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>Swipe right = done · left = skip/snooze</p>
      </div></Swipe>
    ) : (<div className="card text-center py-8 space-y-3"><div className="text-3xl" aria-hidden>🌿</div>
      <p className="font-semibold">{mine.length ? 'All blocks handled for today' : 'Nothing planned today'}</p>
      {!mine.length && <button className="btn btn-accent" onClick={() => navigate('/plan')}>Plan my day</button>}</div>)}

    {mine.length > 0 && <section aria-label="Timeline" className="space-y-2"><h2 className="font-semibold">Timeline</h2>
      {mine.map(b => { const m = MARK[b.status]; const inf = infoOf(b, d); return (
        <button key={b.id} aria-label={`Edit ${b.title}`} onClick={() => setEdit(b)} className="flex items-center gap-3 p-3 rounded-[16px] min-h-[56px] border-l-4 w-full text-left" style={{ background: 'var(--card)', borderColor: inf.color, opacity: b.id === cur?.id ? 1 : .9 }}>
          <span className="mono text-sm w-14" style={{ color: 'var(--muted)' }}>{fmtTime(b.start, h12)}</span>
          <span className="flex-1 min-w-0"><span className="block truncate font-medium">{b.title}</span><span className="text-xs" style={{ color: 'var(--muted)' }}>{b.durationMin} min · {b.kind}</span></span>
          <span style={{ color: m.c }} className="text-sm font-semibold whitespace-nowrap"><span aria-hidden>{m.i}</span> {m.l}</span></button>); })}</section>}

    <ExamDate />
    {new Date().getHours() >= 20 && checkin === false && (<div className="card space-y-3"><b>Nightly check-in</b><p className="text-sm">How did today go?</p>
      <div className="flex gap-2">{[1, 2, 3, 4, 5].map(n => <button key={n} className={`btn flex-1 mono ${rate === n ? 'btn-accent' : ''}`} style={{ padding: 0 }} onClick={() => setRate(n)}>{n}</button>)}</div>
      <input className="input" placeholder="One line for tomorrow (optional)" value={note} onChange={e => setNote(e.target.value)} />
      <button className="btn btn-accent w-full" disabled={!rate} style={{ opacity: rate ? 1 : .5 }} onClick={async () => { await db.kv.put({ key: `checkin:${today}`, value: { rate, note } }); setCheckin(true); }}>Save check-in</button></div>)}

    {edit && <BlockSheet block={edit} onClose={() => setEdit(null)} />}
    {done && <StatusSheet block={done} topics={infoOf(done, d).topics} onSave={(s, c) => finish(done, s, c)} onCancel={() => finish(done)} />}
    {act && <Sheet title={act.title} onClose={() => setAct(null)}>
      <button className="btn btn-accent w-full" onClick={() => { snoozeBlock(act, 10); setAct(null); }}>Snooze 10 min</button>
      <button className="btn w-full" onClick={() => { setReasonFor(act); setAct(null); }}>Skip…</button></Sheet>}
    {reasonFor && <Sheet title="Why skip? (required)" onClose={() => setReasonFor(null)}>
      <div className="flex flex-wrap gap-2">{['Sick / tired', 'Emergency', 'Class ran over', 'Not needed'].map(r => <button key={r} className="btn" onClick={() => setWhy(r)}>{r}</button>)}</div>
      <input className="input" placeholder="Reason" value={why} onChange={e => setWhy(e.target.value)} />
      <button className="btn btn-accent w-full" disabled={!why.trim()} style={{ opacity: why.trim() ? 1 : .5 }} onClick={() => { skipBlock(reasonFor, why.trim()); setReasonFor(null); setWhy(''); }}>Skip block</button></Sheet>}
  </main>);
}
