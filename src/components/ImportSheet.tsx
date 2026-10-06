import { useMemo, useState } from 'react';
import { useData } from '../state/store';
import { uid } from '../state/actions';
import { findDuplicates, parseSyllabus } from '../parser/syllabusParser';
import { deleteChapter, deleteTopic, editTopic, mergeWithPrev, moveTopic, renameChapter, setAction, splitAt, type DChapter } from '../parser/editOps';
import { saveImport, saveSubject } from '../state/syllabusActions';
import { Sheet } from './ui';

export default function ImportSheet({ subjectId, onClose }: { subjectId?: string; onClose: () => void }) {
  const d = useData(); const [raw, setRaw] = useState(''); const [cs, setCs] = useState<DChapter[] | null>(null);
  const [sid, setSid] = useState(subjectId ?? d.subjects[0]?.id ?? '__new'); const [newName, setNewName] = useState('');
  const existing = useMemo(() => d.chapters.filter(c => c.subjectId === sid).map(c => c.title), [d.chapters, sid]);
  const dups = useMemo(() => (cs ? findDuplicates(existing, cs) : []), [cs, existing]);
  const topicsN = cs?.reduce((a, c) => a + c.topics.length, 0) ?? 0; const susp = cs?.reduce((a, c) => a + c.topics.filter(t => t.suspicious).length, 0) ?? 0;
  const canSave = !!cs && topicsN + (cs?.length ?? 0) > 0 && (sid !== '__new' || newName.trim());
  const save = async () => {
    let target = sid;
    if (sid === '__new') { target = uid(); await saveSubject({ id: target, examId: d.exams[0]?.id ?? '', categoryId: d.categories[0]?.id ?? '', name: newName.trim(), kind: 'both', difficulty: 3, marks: 100 }); }
    await saveImport(target, cs!.map(c => ({ ...c, action: dups.includes(c.title) ? c.action ?? 'merge' : undefined }))); onClose();
  };
  if (!cs) return (<Sheet title="Import syllabus" onClose={onClose}>
    <p className="text-sm" style={{ color: 'var(--muted)' }}>Paste raw text from your PDF. You review everything before it is saved.</p>
    <select className="input" aria-label="Target subject" value={sid} onChange={e => setSid(e.target.value)}>{d.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}<option value="__new">+ New subject…</option></select>
    {sid === '__new' && <input className="input" placeholder="New subject name" value={newName} onChange={e => setNewName(e.target.value)} />}
    <textarea className="input py-3 mono text-sm" rows={10} placeholder={'Unit I\nIntroduction, scope; history\n• Dosage forms\n1.1 Excipients\nDiluents, binders'} value={raw} onChange={e => setRaw(e.target.value)} />
    <button className="btn btn-accent w-full" disabled={!raw.trim()} style={{ opacity: raw.trim() ? 1 : .5 }} onClick={() => setCs(parseSyllabus(raw))}>Parse & preview</button></Sheet>);
  return (<Sheet title="Review before saving" onClose={onClose}>
    <p className="mono text-sm">{cs.length} chapters · {topicsN} topics · <span style={{ color: susp ? 'var(--warn)' : 'var(--ok)' }}>{susp ? `⚠ ${susp} suspicious` : '✓ none suspicious'}</span>{dups.length ? ` · ${dups.length} already exist` : ''}</p>
    {cs.length === 0 && <p>Nothing detected. Go back and check the text.</p>}
    {cs.map((c, i) => (<div key={i} className="card space-y-2">
      <div className="flex gap-2"><input className="input font-semibold" aria-label="Chapter title" value={c.title} onChange={e => setCs(renameChapter(cs, i, e.target.value))} />
        {i > 0 && <button className="btn" aria-label="Merge into previous chapter" style={{ padding: '0 12px' }} onClick={() => setCs(mergeWithPrev(cs, i))}>⇡</button>}
        <button className="btn" aria-label="Delete chapter" style={{ padding: '0 12px', color: 'var(--warn)' }} onClick={() => setCs(deleteChapter(cs, i))}>✕</button></div>
      {dups.includes(c.title) && <div className="flex items-center gap-2 text-sm"><span style={{ color: 'var(--warn)' }}>⚠ Already in subject</span>
        {(['merge', 'skip'] as const).map(a => <button key={a} className={`btn ${(c.action ?? 'merge') === a ? 'btn-accent' : ''}`} style={{ minHeight: 40, padding: '0 12px' }} onClick={() => setCs(setAction(cs, i, a))}>{a === 'merge' ? 'Merge new topics' : 'Skip'}</button>)}</div>}
      {c.topics.map((t, j) => (<div key={j} className="flex items-center gap-1">
        <span aria-label={t.suspicious ? `Suspicious: ${t.suspicious}` : 'ok'} title={t.suspicious} className="w-6 text-center" style={{ color: 'var(--warn)' }}>{t.suspicious ? '⚠' : ''}</span>
        <input className="input" style={t.suspicious ? { outline: '2px solid var(--warn)' } : undefined} value={t.title} aria-label="Topic" onChange={e => setCs(editTopic(cs, i, j, e.target.value))} />
        {j > 0 && <button className="btn" aria-label="Split chapter here" style={{ padding: '0 10px' }} onClick={() => setCs(splitAt(cs, i, j))}>✂</button>}
        <select aria-label="Move to chapter" className="input" style={{ width: 56, padding: '0 4px' }} value="" onChange={e => setCs(moveTopic(cs, i, j, +e.target.value))}>
          <option value="">→</option>{cs.map((x, k) => k !== i && <option key={k} value={k}>{x.title.slice(0, 30)}</option>)}</select>
        <button className="btn" aria-label="Delete topic" style={{ padding: '0 10px', color: 'var(--warn)' }} onClick={() => setCs(deleteTopic(cs, i, j))}>✕</button></div>))}
    </div>))}
    <div className="flex gap-3"><button className="btn flex-1" onClick={() => setCs(null)}>Back</button>
      <button className="btn btn-accent flex-1" disabled={!canSave} style={{ opacity: canSave ? 1 : .5 }} onClick={save}>Save {topicsN} topics</button></div>
  </Sheet>);
}
