import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Block, Status, Topic } from '../db/types';
import { navigate } from '../nav';
import { useToast } from '../state/store';
import { useUI } from '../state/appSettings';
import { addDays, shortDate, todayStr } from '../lib/date';
import { examDate, setExamDate, uid, mutateBlocks } from '../state/actions';
import { fromMin, nowMin } from '../lib/date';

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (<div className="sheet-back" onClick={onClose}><div className="sheet space-y-4" role="dialog" aria-label={title} onClick={e => e.stopPropagation()}>
    <h2 className="text-lg font-semibold">{title}</h2>{children}</div></div>);
}
export const STATUS: Record<Status, { icon: string; label: string; color: string }> = {
  not_started: { icon: '○', label: 'Not started', color: 'var(--muted)' }, learning: { icon: '◔', label: 'Learning', color: 'var(--warn)' },
  revised: { icon: '◑', label: 'Revised', color: 'var(--accent)' }, mastered: { icon: '●', label: 'Mastered', color: 'var(--ok)' } };
export const StatusIcon = ({ s }: { s: Status }) => <span aria-label={STATUS[s].label} style={{ color: STATUS[s].color }}>{STATUS[s].icon}</span>;

export function StatusSheet({ block, topics, onSave, onCancel }: { block: Block; topics: Topic[]; onSave: (s?: Status, c?: 1 | 2 | 3 | 4 | 5) => void; onCancel: () => void }) {
  const [s, setS] = useState<Status>('learning'); const [c, setC] = useState<1 | 2 | 3 | 4 | 5>(3);
  return (<Sheet title={`Done: ${block.title}`} onClose={onCancel}>
    <p style={{ color: 'var(--muted)' }}>How did it go? Applies to {topics.length || 'all'} topic{topics.length === 1 ? '' : 's'}.</p>
    <div className="grid grid-cols-3 gap-2">{(['learning', 'revised', 'mastered'] as Status[]).map(k => (
      <button key={k} className={`btn ${s === k ? 'btn-accent' : ''}`} onClick={() => setS(k)}><span aria-hidden>{STATUS[k].icon}</span> {STATUS[k].label}</button>))}</div>
    <div><p className="text-sm mb-2">Confidence</p><div className="flex gap-2">{([1, 2, 3, 4, 5] as const).map(n => (
      <button key={n} className={`btn flex-1 mono ${c === n ? 'btn-accent' : ''}`} style={{ padding: 0 }} onClick={() => setC(n)}>{n}</button>))}</div></div>
    <div className="flex gap-3"><button className="btn flex-1" onClick={() => onSave()}>Just done</button><button className="btn btn-accent flex-1" onClick={() => onSave(s, c)}>Save</button></div>
  </Sheet>);
}

export function Toaster() {
  const { t, hide } = useToast(); if (!t) return null;
  return (<div role="status" className="fixed left-4 right-4 z-50 flex items-center justify-between gap-3 px-4 min-h-[52px] rounded-[18px]"
    style={{ bottom: 'calc(88px + env(safe-area-inset-bottom))', background: 'var(--fg)', color: 'var(--bg)' }}>
    <span>{t.msg}</span>{t.undo && <button className="font-semibold min-h-[48px] px-2" onClick={() => { t.undo!(); hide(); }}>Undo</button>}</div>);
}

export function ExamDate() {
  const d = examDate(); const left = d ? Math.ceil((new Date(d + 'T00:00').getTime() - new Date(todayStr() + 'T00:00').getTime()) / 864e5) : null;
  return (<label className="card flex items-center justify-between gap-3 min-h-[48px]">
    <span><span className="text-sm" style={{ color: 'var(--muted)' }}>Exam</span><br /><b className="mono text-lg">{left === null ? 'Set date' : left < 0 ? 'Passed' : `${left} days`}</b></span>
    <span className="text-sm">{d ? shortDate(d) : ''}<input type="date" aria-label="Exam date" className="input ml-2" style={{ width: 'auto' }} value={d ?? ''} min={addDays(todayStr(), 0)} onChange={e => setExamDate(e.target.value)} /></span></label>);
}

const TABS = [['/', '◉', 'Today'], ['/syllabus', '☰', 'Syllabus'], ['/plan', '▦', 'Plan'], ['/stats', '▲', 'Stats'], ['/settings', '⚙', 'Settings']];
export function Shell({ path, children }: { path: string; children: ReactNode }) {
  const [add, setAdd] = useState(false); const [title, setTitle] = useState(''); const [dur, setDur] = useState(30);
  const [start, setStart] = useState(() => fromMin(Math.ceil((nowMin() + 5) / 15) * 15));
  const ref = useRef<HTMLInputElement>(null); useEffect(() => { if (add) { ref.current?.focus(); setDur(useUI.getState().ui.defaultBlockMin); } }, [add]);
  return (<>
    <div style={{ paddingBottom: 'calc(88px + env(safe-area-inset-bottom))' }}>{children}</div>
    <button aria-label="Quick add block" className="fixed z-30 right-4 w-14 h-14 rounded-full text-3xl text-on shadow-lg" style={{ bottom: 'calc(80px + env(safe-area-inset-bottom))', background: 'var(--accent)' }} onClick={() => setAdd(true)}>+</button>
    <nav className="fixed bottom-0 inset-x-0 z-30 flex" style={{ background: 'var(--card)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {TABS.map(([p, i, l]) => { const on = p === '/' ? path === '/' : path.startsWith(p); return (
        <button key={p} aria-current={on ? 'page' : undefined} onClick={() => navigate(p)} className="flex-1 min-h-[64px] flex flex-col items-center justify-center text-xs gap-1" style={{ color: on ? 'var(--accent)' : 'var(--muted)', fontWeight: on ? 700 : 500 }}>
          <span aria-hidden className="text-lg">{i}</span>{l}</button>); })}
    </nav>
    {add && <Sheet title="Quick add block (today)" onClose={() => setAdd(false)}>
      <input ref={ref} className="input" placeholder="What are you studying?" value={title} onChange={e => setTitle(e.target.value)} />
      <div className="flex gap-3"><input type="time" className="input" value={start} onChange={e => setStart(e.target.value)} aria-label="Start" />
        <input type="number" className="input mono" min={5} step={5} value={dur} onChange={e => setDur(Math.max(5, +e.target.value || 5))} aria-label="Minutes" /></div>
      <button className="btn btn-accent w-full" disabled={!title.trim()} style={{ opacity: title.trim() ? 1 : .5 }} onClick={async () => {
        await mutateBlocks({ put: [{ id: uid(), date: todayStr(), start, durationMin: dur, topicIds: [], title: title.trim(), status: 'planned', snoozes: 0, kind: 'study' }] }, 'Block added');
        setTitle(''); setAdd(false); }}>Add</button></Sheet>}
    <Toaster />
  </>);
}
