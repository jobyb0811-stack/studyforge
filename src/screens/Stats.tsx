import { useEffect, useMemo, useState } from 'react';
import { db } from '../db/db';
import type { FocusSession } from '../db/types';
import { useData } from '../state/store';
import { useUI } from '../state/appSettings';
import { addDays, fmtDur, range, shortDate, todayStr, dayOfWeek } from '../lib/date';
import { bestStreak, weekSeries, weekStartOf } from '../lib/stats';
import { computeStreak } from '../plan/streak';
import { pct, rollup } from '../lib/progress';

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MARK = { ok: ['✓', 'var(--ok)', 'Done'], fail: ['✗', 'var(--warn)', 'Missed'], frozen: ['❄', 'var(--accent)', 'Freeze used'], none: ['–', 'var(--muted)', 'No plan / day off'], today: ['●', 'var(--accent)', 'Today'] } as const;

export default function Stats() {
  const d = useData(); const { ui } = useUI(); const [off, setOff] = useState(0); const [sessions, setSessions] = useState<FocusSession[]>([]);
  useEffect(() => { db.sessions.toArray().then(setSessions); }, [off, d.blocks]);
  const today = todayStr(); const start = addDays(weekStartOf(today, ui.weekStart), off * 7); const days = range(start, addDays(start, 6));
  const series = useMemo(() => weekSeries(days, d.blocks, sessions), [start, d.blocks, sessions]); // eslint-disable-line
  const max = Math.max(60, ...series.map(s => Math.max(s.planned, s.actual)));
  const sum = (k: 'planned' | 'actual' | 'plannedTopics' | 'doneTopics') => series.reduce((a, s) => a + s[k], 0);
  const focus = sessions.filter(s => s.startedAt >= new Date(start + 'T00:00').getTime() && s.startedAt < new Date(addDays(start, 7) + 'T00:00').getTime());
  const st = useMemo(() => computeStreak(d.blocks, d.plan.offDays, today), [d.blocks, d.plan.offDays, today]);
  const hist = st.days.slice(-35);
  const cat = d.categories.map(c => { const subs = d.subjects.filter(s => s.categoryId === c.id); const ids = new Set(d.chapters.filter(ch => subs.some(s => s.id === ch.subjectId)).map(ch => ch.id));
    return { c, subs, p: rollup(d.topics.filter(t => ids.has(t.chapterId))) }; }).filter(x => x.subs.length);
  if (!d.ready) return <div className="p-4 space-y-3"><div className="skel h-48" /><div className="skel h-32" /></div>;
  return (<main className="p-4 space-y-4">
    <h1 className="text-2xl font-semibold">Stats</h1>
    <section className="card space-y-3"><div className="flex items-center justify-between">
      <button className="btn" aria-label="Previous week" onClick={() => setOff(off - 1)}>‹</button><b>{shortDate(days[0])} – {shortDate(days[6])}{off === 0 ? ' (this week)' : ''}</b>
      <button className="btn" aria-label="Next week" disabled={off >= 0} style={{ opacity: off >= 0 ? .4 : 1 }} onClick={() => setOff(off + 1)}>›</button></div>
      <div className="flex items-end gap-2" style={{ height: 140 }} role="img" aria-label="Hours per day, planned versus actual">{series.map(s => (
        <div key={s.date} className="flex-1 flex flex-col items-center justify-end h-full gap-1" aria-label={`${WD[dayOfWeek(s.date)]}: planned ${fmtDur(s.planned)}, actual ${fmtDur(s.actual)}`}>
          <div className="flex items-end gap-1 w-full flex-1 justify-center">
            <div style={{ height: `${(s.planned / max) * 100}%`, width: '40%', border: '2px solid var(--muted)', borderRadius: 6, minHeight: s.planned ? 4 : 0 }} />
            <div style={{ height: `${(s.actual / max) * 100}%`, width: '40%', background: 'var(--accent)', borderRadius: 6, minHeight: s.actual ? 4 : 0, transition: 'height .2s' }} /></div>
          <span className="text-xs" style={{ color: s.date === today ? 'var(--accent)' : 'var(--muted)', fontWeight: s.date === today ? 700 : 400 }}>{WD[dayOfWeek(s.date)][0]}</span></div>))}</div>
      <div className="flex gap-4 text-xs" style={{ color: 'var(--muted)' }}><span><span style={{ border: '2px solid var(--muted)', display: 'inline-block', width: 12, height: 12, borderRadius: 3 }} /> Planned</span><span><span style={{ background: 'var(--accent)', display: 'inline-block', width: 12, height: 12, borderRadius: 3 }} /> Actual</span></div>
      <div className="grid grid-cols-2 gap-3"><div><div className="text-xs" style={{ color: 'var(--muted)' }}>Hours done / planned</div><div className="mono text-lg">{fmtDur(sum('actual'))} / {fmtDur(sum('planned'))}</div></div>
        <div><div className="text-xs" style={{ color: 'var(--muted)' }}>Topics done / planned</div><div className="mono text-lg">{sum('doneTopics')} / {sum('plannedTopics')}</div></div>
        <div><div className="text-xs" style={{ color: 'var(--muted)' }}>Focus sessions</div><div className="mono text-lg">{focus.length} · {fmtDur(focus.reduce((a, s) => a + s.minutes, 0))}</div></div></div></section>

    <section className="card space-y-3"><div className="flex justify-between"><b>Streak</b><span className="mono">🔥 {st.streak} · best {bestStreak(st.days)}</span></div>
      {!hist.length ? <p className="text-sm" style={{ color: 'var(--muted)' }}>Plan and complete blocks to build a streak.</p> :
        <div className="grid grid-cols-7 gap-1" role="list" aria-label="Last 5 weeks">{hist.map(h => { const [i, c, l] = MARK[h.status as keyof typeof MARK]; return (
          <div key={h.date} role="listitem" aria-label={`${shortDate(h.date)}: ${l}`} className="text-center py-2 rounded-lg" style={{ background: 'var(--bg)', color: c }}><div className="text-sm font-semibold">{i}</div><div className="text-[10px]" style={{ color: 'var(--muted)' }}>{h.date.slice(8)}</div></div>); })}</div>}
      <p className="text-xs" style={{ color: 'var(--muted)' }}>✓ ≥70% done · ❄ freeze (1/week) · – no plan or day off</p></section>

    <section className="space-y-2"><b>Progress</b>{!cat.length && <div className="card text-center py-6">Add subjects in Syllabus to see progress.</div>}
      {cat.map(({ c, subs, p }) => (<div key={c.id} className="card border-l-4 space-y-2" style={{ borderColor: c.color }}>
        <div className="flex justify-between"><b>{c.name}</b><span className="mono">{pct(p)}</span></div>
        {subs.map(s => { const ids = new Set(d.chapters.filter(ch => ch.subjectId === s.id).map(ch => ch.id)); const v = rollup(d.topics.filter(t => ids.has(t.chapterId)));
          return (<div key={s.id}><div className="flex justify-between text-sm"><span>{s.name}</span><span className="mono">{pct(v)}</span></div>
            <div className="h-2 rounded-full" style={{ background: 'var(--bg)' }} role="progressbar" aria-valuenow={Math.round(v * 100)}><div className="h-2 rounded-full" style={{ width: pct(v), background: 'var(--accent)' }} /></div></div>); })}</div>))}</section>
  </main>);
}
