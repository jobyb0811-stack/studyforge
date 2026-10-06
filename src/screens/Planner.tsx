import { useMemo, useRef, useState } from 'react';
import type { Topic } from '../db/types';
import { useData, useToast } from '../state/store';
import { addDays, dayOfWeek, fmtDur, fromMin, range, shortDate, todayStr, toMin } from '../lib/date';
import { distribute, topicMinutes } from '../plan/distribute';
import { applyPlan, endOfDay, loadOf, makeBlocks, moveMissed, offToday, planAllUnplanned, savePlan, setDailyHours, uid } from '../state/actions';
import { ExamDate, StatusIcon } from '../components/ui';

const WD = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
function Meter({ min, cap }: { min: number; cap: number }) {
  const over = min > cap;
  return (<div><div className="h-2 rounded-full" style={{ background: 'var(--bg)' }}><div className="h-2 rounded-full" style={{ width: `${Math.min(100, (min / cap) * 100)}%`, background: over ? 'var(--warn)' : 'var(--accent)' }} /></div>
    <div className="text-xs mono mt-1" style={{ color: over ? 'var(--warn)' : 'var(--muted)' }}>{over ? '⚠ ' : ''}{fmtDur(min)} / {fmtDur(cap)}{over ? ' overloaded' : ''}</div></div>);
}
function Check({ state, onChange, label }: { state: 'all' | 'some' | 'none'; onChange: () => void; label: string }) {
  return <input type="checkbox" aria-label={label} className="w-6 h-6 shrink-0" style={{ accentColor: 'var(--accent)' }} checked={state === 'all'} ref={el => { if (el) el.indeterminate = state === 'some'; }} onChange={onChange} />;
}

export default function Planner() {
  const d = useData(); const { topics, chapters, subjects, categories, exams, plan, blocks } = d; const today = todayStr();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [f, setF] = useState({ subject: '', category: '', status: '', low: false, unplanned: false });
  const [mode, setMode] = useState<'day' | 'range'>('day'); const [how, setHow] = useState<'auto' | 'manual'>('auto');
  const [date, setDate] = useState(today); const [end, setEnd] = useState(addDays(today, 6));
  const [ov, setOv] = useState<Record<string, { start?: string; dur?: number }>>({});
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null); const dragging = useRef(false);
  const dailyHours = exams[0]?.dailyHours ?? 4; const cap = dailyHours * 60;
  const ok = (t: Topic) => (!f.status || t.status === f.status) && (!f.low || t.confidence <= 2) && (!f.unplanned || !t.plannedDate);
  const tree = useMemo(() => subjects.filter(s => (!f.subject || s.id === f.subject) && (!f.category || s.categoryId === f.category)).map(s => ({ s,
    chs: chapters.filter(c => c.subjectId === s.id).sort((a, b) => a.order - b.order).map(c => ({ c, ts: topics.filter(t => t.chapterId === c.id && ok(t)).sort((a, b) => a.order - b.order) })).filter(x => x.ts.length) })).filter(x => x.chs.length),
    [subjects, chapters, topics, f]); // eslint-disable-line
  const stateOf = (ids: string[]): 'all' | 'some' | 'none' => { const n = ids.filter(i => sel.has(i)).length; return n === 0 ? 'none' : n === ids.length ? 'all' : 'some'; };
  const toggle = (ids: string[]) => setSel(p => { const n = new Set(p); const all = ids.every(i => n.has(i)); ids.forEach(i => (all ? n.delete(i) : n.add(i))); return n; });
  const selTopics = topics.filter(t => sel.has(t.id));
  const groups = useMemo(() => { const m = new Map<string, Topic[]>(); selTopics.forEach(t => m.set(t.chapterId, [...(m.get(t.chapterId) ?? []), t])); return [...m]; }, [selTopics.length, sel]); // eslint-disable-line
  const mins = (ts: Topic[]) => ts.reduce((a, t) => a + topicMinutes(t, plan.topicMin), 0);
  const title = (id: string) => chapters.find(c => c.id === id)?.title ?? 'Study';
  const toast = useToast.getState().show;

  let cur = endOfDay(date); cur = cur === null ? toMin(plan.startTime) : cur + 10;
  const drafts = groups.map(([ch, ts]) => { const start = ov[ch]?.start ?? fromMin(cur!); const dur = ov[ch]?.dur ?? mins(ts); cur = toMin(start) + dur + 10; return { ch, ts, start, dur }; });
  const dayLoad = loadOf(date) + drafts.reduce((a, x) => a + x.dur, 0);
  const saveDay = async () => {
    const bs = drafts.map(x => ({ id: uid(), date, start: x.start, durationMin: x.dur, topicIds: x.ts.map(t => t.id), title: title(x.ch), status: 'planned' as const, snoozes: 0, kind: 'study' as const }));
    await applyPlan(bs, `Planned ${selTopics.length} topics on ${shortDate(date)}${dayLoad > cap ? ' · ⚠ overloaded' : ''}`); setSel(new Set()); setOv({});
  };
  const base = () => { const b: Record<string, number> = {}; range(date, end).forEach(x => (b[x] = loadOf(x))); return b; };
  const auto = async () => {
    if (end < date) return toast('End date is before start');
    const r = distribute(selTopics.map((t, i) => ({ id: t.id, chapterId: t.chapterId, confidence: t.confidence, important: t.important, order: i })),
      { start: date, end, dailyMin: cap, restDays: plan.restDays, bufferDays: plan.bufferDays, topicMin: plan.topicMin, revisionMin: plan.revisionMin, baseLoad: base() });
    await applyPlan(makeBlocks(r.items), `Planned ${selTopics.length} topics${r.overloadDays.length ? ` · ⚠ ${r.overloadDays.length} overloaded days` : ''}`); setSel(new Set());
  };
  const assign = async (day: string) => {
    if (!selTopics.length) return;
    const items = selTopics.map(t => ({ date: day, topicId: t.id, chapterId: t.chapterId, minutes: topicMinutes(t, plan.topicMin), revision: false }));
    const over = loadOf(day) + items.reduce((a, i) => a + i.minutes, 0) > cap;
    await applyPlan(makeBlocks(items), `Added ${items.length} topics to ${shortDate(day)}${over ? ' · ⚠ overloaded' : ''}`); setSel(new Set());
  };
  const strip = range(date, end <= date ? date : end > addDays(date, 20) ? addDays(date, 20) : end);
  const dropAt = (x: number, y: number) => { const el = document.elementsFromPoint(x, y).find(e => (e as HTMLElement).dataset?.date) as HTMLElement | undefined; if (el?.dataset.date) assign(el.dataset.date); };

  return (<main className="p-4 space-y-4">
    <h1 className="text-2xl font-semibold">Plan</h1><ExamDate />
    <section className="card space-y-2"><b>Quick actions</b><div className="grid grid-cols-2 gap-2">
      <button className="btn" onClick={planAllUnplanned}>Plan all unplanned until exam</button><button className="btn" onClick={offToday}>I'm off today</button>
      <button className="btn" onClick={() => moveMissed('today')}>Missed → today</button><button className="btn" onClick={() => moveMissed('tomorrow')}>Missed → tomorrow</button></div></section>

    <section className="card space-y-3"><b>Planning rules</b>
      <div className="flex items-center gap-3 text-sm"><span className="w-28">Daily hours</span><input type="number" min={1} max={16} step={0.5} className="input mono" value={dailyHours} onChange={e => setDailyHours(Math.max(1, +e.target.value || 1))} /></div>
      <div className="flex items-center gap-3 text-sm"><span className="w-28">Start time</span><input type="time" className="input" value={plan.startTime} onChange={e => savePlan({ startTime: e.target.value })} /></div>
      <div className="flex items-center gap-3 text-sm"><span className="w-28">Buffer days</span><input type="number" min={0} max={14} className="input mono" value={plan.bufferDays} onChange={e => savePlan({ bufferDays: Math.max(0, +e.target.value || 0) })} /></div>
      <div className="text-sm">Rest days<div className="flex gap-1 mt-1">{WD.map((w, i) => (<button key={i} aria-pressed={plan.restDays.includes(i)} aria-label={`Rest day ${i}`} className={`btn flex-1 ${plan.restDays.includes(i) ? 'btn-accent' : ''}`} style={{ padding: 0 }}
        onClick={() => savePlan({ restDays: plan.restDays.includes(i) ? plan.restDays.filter(x => x !== i) : [...plan.restDays, i] })}>{w}</button>))}</div></div></section>

    <section className="space-y-2"><b>Syllabus</b>
      <div className="grid grid-cols-2 gap-2">
        <select aria-label="Subject" className="input" value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })}><option value="">All subjects</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <select aria-label="Category" className="input" value={f.category} onChange={e => setF({ ...f, category: e.target.value })}><option value="">All categories</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select aria-label="Status" className="input" value={f.status} onChange={e => setF({ ...f, status: e.target.value })}><option value="">Any status</option><option value="not_started">Not started</option><option value="learning">Learning</option><option value="revised">Revised</option><option value="mastered">Mastered</option></select>
        <div className="flex gap-2"><button aria-pressed={f.low} className={`btn flex-1 ${f.low ? 'btn-accent' : ''}`} style={{ padding: 0 }} onClick={() => setF({ ...f, low: !f.low })}>Low conf.</button>
          <button aria-pressed={f.unplanned} className={`btn flex-1 ${f.unplanned ? 'btn-accent' : ''}`} style={{ padding: 0 }} onClick={() => setF({ ...f, unplanned: !f.unplanned })}>Unplanned</button></div></div>
      {!tree.length && <div className="card text-center py-6">No topics match. Clear filters or import a syllabus (Phase 4).</div>}
      {tree.map(({ s, chs }) => { const ids = chs.flatMap(x => x.ts.map(t => t.id)); const cat = categories.find(c => c.id === s.categoryId); return (
        <details key={s.id} open className="card"><summary className="flex items-center gap-3 min-h-[48px] cursor-pointer">
          <Check state={stateOf(ids)} onChange={() => toggle(ids)} label={`Select ${s.name}`} /><span className="w-2.5 h-2.5 rounded-full" style={{ background: cat?.color }} aria-hidden /><b>{s.name}</b></summary>
          {chs.map(({ c, ts }) => (<details key={c.id} open className="ml-2 mt-1"><summary className="flex items-center gap-3 min-h-[48px] cursor-pointer">
            <Check state={stateOf(ts.map(t => t.id))} onChange={() => toggle(ts.map(t => t.id))} label={`Select ${c.title}`} /><span className="font-medium">{c.title}</span></summary>
            {ts.map(t => (<label key={t.id} className="flex items-center gap-3 min-h-[48px] ml-6"><Check state={sel.has(t.id) ? 'all' : 'none'} onChange={() => toggle([t.id])} label={t.title} />
              <span className="flex-1 min-w-0 truncate">{t.title}</span><StatusIcon s={t.status} />
              {t.plannedDate && <span className="text-xs mono px-2 py-1 rounded-full" style={{ background: 'var(--bg)' }}>{shortDate(t.plannedDate)}</span>}</label>))}</details>))}</details>); })}
    </section>

    {selTopics.length > 0 && <section className="card space-y-3 sticky" style={{ bottom: 'calc(84px + env(safe-area-inset-bottom))', boxShadow: '0 -8px 24px rgba(0,0,0,.18)', zIndex: 20 }}>
      <div className="flex justify-between items-center"><b>{selTopics.length} selected</b><button className="text-sm underline min-h-[48px]" onClick={() => setSel(new Set())}>Clear</button></div>
      <div className="flex gap-2"><button className={`btn flex-1 ${mode === 'day' ? 'btn-accent' : ''}`} onClick={() => setMode('day')}>One day</button><button className={`btn flex-1 ${mode === 'range' ? 'btn-accent' : ''}`} onClick={() => setMode('range')}>Date range</button></div>
      {mode === 'day' ? (<>
        <input type="date" className="input" min={today} value={date} onChange={e => { setDate(e.target.value); setOv({}); }} aria-label="Date" />
        {drafts.map(x => (<div key={x.ch} className="flex items-center gap-2"><span className="flex-1 min-w-0 truncate text-sm">{title(x.ch)} <span style={{ color: 'var(--muted)' }}>({x.ts.length})</span></span>
          <input type="time" className="input" style={{ width: 118 }} value={x.start} onChange={e => setOv(o => ({ ...o, [x.ch]: { ...o[x.ch], start: e.target.value } }))} aria-label="Start time" />
          <input type="number" min={5} step={5} className="input mono" style={{ width: 76 }} value={x.dur} onChange={e => setOv(o => ({ ...o, [x.ch]: { ...o[x.ch], dur: Math.max(5, +e.target.value || 5) } }))} aria-label="Minutes" /></div>))}
        <Meter min={dayLoad} cap={cap} /><button className="btn btn-accent w-full" onClick={saveDay}>Add to {shortDate(date)}</button></>) : (<>
        <div className="flex gap-2"><input type="date" className="input" min={today} value={date} onChange={e => setDate(e.target.value)} aria-label="From" /><input type="date" className="input" min={date} value={end} onChange={e => setEnd(e.target.value)} aria-label="To" /></div>
        <div className="flex gap-2"><button className={`btn flex-1 ${how === 'auto' ? 'btn-accent' : ''}`} onClick={() => setHow('auto')}>Distribute for me</button><button className={`btn flex-1 ${how === 'manual' ? 'btn-accent' : ''}`} onClick={() => setHow('manual')}>Manual</button></div>
        {how === 'auto' ? <button className="btn btn-accent w-full" onClick={auto}>Distribute {selTopics.length} topics</button> : (<>
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Calendar strip">{strip.map(day => (<button key={day} data-date={day} onClick={() => assign(day)} className="shrink-0 w-24 p-2 rounded-[14px] text-left min-h-[72px]"
            style={{ background: 'var(--bg)', opacity: plan.restDays.includes(dayOfWeek(day)) ? .5 : 1 }}><div className="text-xs" style={{ color: 'var(--muted)' }}>{WD[dayOfWeek(day)]}</div><div className="font-semibold">{shortDate(day)}</div><Meter min={loadOf(day)} cap={cap} /></button>))}</div>
          <div role="button" aria-label="Drag onto a day" className="btn flex items-center justify-center text-center select-none" style={{ touchAction: 'none', background: 'var(--accent)', color: 'var(--on-accent)', transform: drag ? `translate(${drag.x}px,${drag.y}px)` : undefined, position: 'relative', zIndex: 60 }}
            onPointerDown={e => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); setDrag({ x: 0, y: 0 }); (e.currentTarget as any)._o = [e.clientX, e.clientY]; }}
            onPointerMove={e => { if (!dragging.current) return; const o = (e.currentTarget as any)._o; setDrag({ x: e.clientX - o[0], y: e.clientY - o[1] }); }}
            onPointerUp={e => { dragging.current = false; setDrag(null); dropAt(e.clientX, e.clientY); }}>☝ Drag {selTopics.length} topics onto a day (or tap a day)</div></>)}</>)}
    </section>}
  </main>);
}
