import { useEffect, useState } from 'react';
import { db } from '../db/db';
import type { Category, Chapter, Subject, Subtopic, Topic, Status } from '../db/types';
import { useData } from '../state/store';
import { uid } from '../state/actions';
import { addTopics, deleteTree, moveChapter, saveCategory, saveChapter, saveSubject, saveTopic } from '../state/syllabusActions';
import { splitList } from '../parser/syllabusParser';
import { Sheet, STATUS } from './ui';

const Num = ({ v, set, label, min = 0, max = 999 }: { v: number; set: (n: number) => void; label: string; min?: number; max?: number }) => (
  <label className="block text-sm">{label}<input type="number" className="input mono mt-1" min={min} max={max} value={v} onChange={e => set(Math.max(min, Math.min(max, +e.target.value || 0)))} /></label>);
const Pick = ({ n, v, set, label }: { n: number; v: number; set: (n: any) => void; label: string }) => (
  <div className="text-sm">{label}<div className="flex gap-2 mt-1">{Array.from({ length: n }, (_, i) => i + 1).map(i => (
    <button key={i} className={`btn flex-1 mono ${v === i ? 'btn-accent' : ''}`} style={{ padding: 0 }} onClick={() => set(i)}>{i}</button>))}</div></div>);

function Subtopics({ topicId }: { topicId: string }) {
  const [rows, setRows] = useState<Subtopic[]>([]); const [txt, setTxt] = useState('');
  const load = () => db.subtopics.where('topicId').equals(topicId).toArray().then(r => setRows(r.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))));
  useEffect(() => { load(); }, [topicId]); // eslint-disable-line
  const add = async () => { const l = txt.split('\n').flatMap(splitList); if (!l.length) return; let o = Math.max(-1, ...rows.map(r => r.order ?? 0)) + 1;
    await db.subtopics.bulkPut(l.map((title): Subtopic => ({ id: uid(), topicId, title, done: false, order: o++ }))); setTxt(''); load(); };
  return (<div className="space-y-2"><div className="text-sm font-medium">Checklist {rows.length ? `(${rows.filter(r => r.done).length}/${rows.length})` : ''}</div>
    {rows.map(r => (<div key={r.id} className="flex items-center gap-2 min-h-[48px]">
      <input type="checkbox" className="w-6 h-6" style={{ accentColor: 'var(--accent)' }} aria-label={r.title} checked={r.done} onChange={async () => { await db.subtopics.put({ ...r, done: !r.done }); load(); }} />
      <span className="flex-1" style={{ textDecoration: r.done ? 'line-through' : 'none', color: r.done ? 'var(--muted)' : 'var(--fg)' }}>{r.title}</span>
      <button className="btn" aria-label={`Delete ${r.title}`} style={{ minHeight: 40, padding: '0 12px', color: 'var(--warn)' }} onClick={async () => { await db.subtopics.delete(r.id); load(); }}>✕</button></div>))}
    <div className="flex gap-2"><input className="input" placeholder="Add checklist item(s), comma separated" value={txt} onChange={e => setTxt(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} /><button className="btn" onClick={add}>Add</button></div></div>);
}

export function TopicSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const t0 = useData(s => s.topics.find(t => t.id === id)); const [t, setT] = useState<Topic | undefined>(t0);
  if (!t) return null;
  const up = (p: Partial<Topic>) => { const n = { ...t, ...p }; setT(n); saveTopic(n); };
  return (<Sheet title="Topic" onClose={onClose}>
    <input className="input" aria-label="Title" value={t.title} onChange={e => setT({ ...t, title: e.target.value })} onBlur={() => t.title.trim() && saveTopic(t)} />
    <div className="grid grid-cols-2 gap-2">{(Object.keys(STATUS) as Status[]).map(k => (
      <button key={k} className={`btn ${t.status === k ? 'btn-accent' : ''}`} onClick={() => up({ status: k })}><span aria-hidden>{STATUS[k].icon}</span> {STATUS[k].label}</button>))}</div>
    <Pick n={5} v={t.confidence} set={c => up({ confidence: c })} label="Confidence" />
    <button aria-pressed={t.important} className={`btn w-full ${t.important ? 'btn-accent' : ''}`} onClick={() => up({ important: !t.important })}>{t.important ? '★ Important' : '☆ Mark important'}</button>
    <Subtopics topicId={t.id} />
    <label className="block text-sm">Quick note<textarea className="input mt-1 py-3" rows={4} value={t.notes} onChange={e => setT({ ...t, notes: e.target.value })} onBlur={() => saveTopic(t)} placeholder="Why is this hard? Mnemonic? Page ref?" /></label>
    <p className="text-xs mono" style={{ color: 'var(--muted)' }}>Revised {t.revisions}× {t.lastStudied ? `· last ${new Date(t.lastStudied).toLocaleDateString()}` : ''} {t.plannedDate ? `· planned ${t.plannedDate}` : ''}</p>
    <div className="flex gap-3"><button className="btn flex-1" style={{ color: 'var(--warn)' }} onClick={() => { deleteTree('topic', t.id); onClose(); }}>Delete</button><button className="btn btn-accent flex-1" onClick={onClose}>Done</button></div>
  </Sheet>);
}

export function ChapterSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const c0 = useData(s => s.chapters.find(c => c.id === id)); const [c, setC] = useState<Chapter | undefined>(c0); const [add, setAdd] = useState('');
  if (!c) return null;
  const save = () => { if (c.title.trim()) saveChapter(c); };
  return (<Sheet title="Chapter" onClose={() => { save(); onClose(); }}>
    <input className="input" aria-label="Title" value={c.title} onChange={e => setC({ ...c, title: e.target.value })} />
    <Num v={c.marks} set={marks => setC({ ...c, marks })} label="Marks weightage" max={200} />
    <div className="flex gap-2"><button className="btn flex-1" onClick={() => moveChapter(c.id, -1)}>↑ Move up</button><button className="btn flex-1" onClick={() => moveChapter(c.id, 1)}>↓ Move down</button></div>
    <Pick n={3} v={c.priority} set={priority => setC({ ...c, priority })} label="Priority (1 low – 3 high)" />
    <label className="block text-sm">Add topics (comma, semicolon or new line)<textarea className="input mt-1 py-3" rows={3} value={add} onChange={e => setAdd(e.target.value)} /></label>
    <div className="flex gap-3"><button className="btn flex-1" style={{ color: 'var(--warn)' }} onClick={() => { deleteTree('chapter', c.id); onClose(); }}>Delete</button>
      <button className="btn btn-accent flex-1" onClick={async () => { save(); const l = add.split('\n').flatMap(splitList); if (l.length) await addTopics(c.id, l); onClose(); }}>Save</button></div>
  </Sheet>);
}

export function SubjectSheet({ id, onClose }: { id?: string; onClose: () => void }) {
  const d = useData(); const ex = d.subjects.find(s => s.id === id);
  const [s, setS] = useState<Subject>(ex ?? { id: uid(), examId: d.exams[0]?.id ?? '', categoryId: d.categories[0]?.id ?? '', name: '', kind: 'both', difficulty: 3, marks: 100 });
  return (<Sheet title={ex ? 'Subject' : 'New subject'} onClose={onClose}>
    <input className="input" aria-label="Name" placeholder="Subject name" value={s.name} onChange={e => setS({ ...s, name: e.target.value })} />
    <select className="input" aria-label="Category" value={s.categoryId} onChange={e => setS({ ...s, categoryId: e.target.value })}>{d.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
    <div className="flex gap-2">{(['theory', 'practical', 'both'] as const).map(k => <button key={k} className={`btn flex-1 ${s.kind === k ? 'btn-accent' : ''}`} style={{ padding: 0 }} onClick={() => setS({ ...s, kind: k })}>{k}</button>)}</div>
    <Pick n={5} v={s.difficulty} set={difficulty => setS({ ...s, difficulty })} label="Difficulty" />
    <Num v={s.marks} set={marks => setS({ ...s, marks })} label="Marks weight" max={1000} />
    <label className="block text-sm">Exam date<input type="date" className="input mt-1" value={s.examDate ?? ''} onChange={e => setS({ ...s, examDate: e.target.value || undefined })} /></label>
    <div className="flex gap-3">{ex && <button className="btn flex-1" style={{ color: 'var(--warn)' }} onClick={() => { deleteTree('subject', s.id); onClose(); }}>Delete</button>}
      <button className="btn btn-accent flex-1" disabled={!s.name.trim()} style={{ opacity: s.name.trim() ? 1 : .5 }} onClick={async () => { await saveSubject({ ...s, name: s.name.trim() }); onClose(); }}>Save</button></div>
  </Sheet>);
}

export function CategorySheet({ onClose }: { onClose: () => void }) {
  const cats = useData(s => s.categories);
  return (<Sheet title="Categories" onClose={onClose}>
    {cats.map(c => (<div key={c.id} className="flex items-center gap-2"><input type="color" aria-label={`${c.name} colour`} className="w-12 h-12 rounded-xl" value={c.color} onChange={e => saveCategory({ ...c, color: e.target.value })} />
      <input className="input" defaultValue={c.name} aria-label="Category name" onBlur={e => e.target.value.trim() && saveCategory({ ...c, name: e.target.value.trim() })} /></div>))}
    <button className="btn w-full" onClick={() => saveCategory({ id: uid(), name: 'New category', color: '#8b5cf6', order: cats.length } as Category)}>+ Add category</button>
    <button className="btn btn-accent w-full" onClick={onClose}>Done</button></Sheet>);
}
