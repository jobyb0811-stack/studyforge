import { useMemo, useState } from 'react';
import { useData } from '../state/store';
import { pct, rollup } from '../lib/progress';
import { searchAll } from '../lib/search';
import { shortDate } from '../lib/date';
import { StatusIcon } from '../components/ui';
import { CategorySheet, ChapterSheet, SubjectSheet, TopicSheet } from '../components/EditSheets';
import ImportSheet from '../components/ImportSheet';

type Sh = { k: 'topic' | 'chapter' | 'subject' | 'newSubject' | 'import' | 'cats'; id?: string } | null;
export default function Syllabus() {
  const d = useData(); const [q, setQ] = useState(''); const [view, setView] = useState<'tree' | 'weak'>('tree'); const [sh, setSh] = useState<Sh>(null);
  const hits = useMemo(() => searchAll(q, d), [q, d.topics, d.chapters, d.subjects]); // eslint-disable-line
  const weak = useMemo(() => d.topics.filter(t => t.status !== 'mastered' && (t.confidence <= 2 || t.notes.trim())).sort((a, b) => a.confidence - b.confidence), [d.topics]);
  const sName = (chId: string) => { const c = d.chapters.find(x => x.id === chId); return `${d.subjects.find(s => s.id === c?.subjectId)?.name ?? ''} › ${c?.title ?? ''}`; };
  const open = (h: { kind: string; id: string }) => setSh({ k: h.kind === 'subject' ? 'subject' : h.kind === 'chapter' ? 'chapter' : 'topic', id: h.id });
  if (!d.ready) return <div className="p-4 space-y-3"><div className="skel h-12" /><div className="skel h-48" /></div>;
  return (<main className="p-4 space-y-4">
    <header className="flex items-center justify-between"><h1 className="text-2xl font-semibold">Syllabus</h1><button className="btn" onClick={() => setSh({ k: 'cats' })}>Categories</button></header>
    <input className="input" type="search" autoFocus={location.search.includes('search')} placeholder="Search subjects, chapters, topics, notes" aria-label="Search" value={q} onChange={e => setQ(e.target.value)} />
    {q.trim().length >= 2 ? (<section aria-label="Search results" className="space-y-2">
      {!hits.length && <div className="card text-center py-6">No matches for “{q}”.</div>}
      {hits.map(h => (<button key={h.kind + h.id} className="card w-full text-left min-h-[56px]" onClick={() => open(h)}>
        <div className="font-medium">{h.kind === 'note' ? '📝 ' : ''}{h.title}</div><div className="text-xs" style={{ color: 'var(--muted)' }}>{h.sub}</div>{h.snippet && <div className="text-sm mt-1">{h.snippet}</div>}</button>))}</section>) : (<>
      <div className="flex gap-2"><button className={`btn flex-1 ${view === 'tree' ? 'btn-accent' : ''}`} onClick={() => setView('tree')}>Tree</button>
        <button className={`btn flex-1 ${view === 'weak' ? 'btn-accent' : ''}`} onClick={() => setView('weak')}>Weak topics{weak.length ? ` (${weak.length})` : ''}</button></div>
      {view === 'weak' ? (<section className="space-y-2">{!weak.length && <div className="card text-center py-8">No weak topics. Low confidence (1–2) or noted topics show up here.</div>}
        {weak.map(t => (<button key={t.id} className="card w-full text-left min-h-[56px]" onClick={() => setSh({ k: 'topic', id: t.id })}>
          <div className="flex items-center gap-2"><StatusIcon s={t.status} /><span className="font-medium flex-1">{t.title}</span><span className="mono text-sm" style={{ color: 'var(--warn)' }}>conf {t.confidence}</span></div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>{sName(t.chapterId)}</div>{t.notes && <div className="text-sm mt-1">📝 {t.notes.slice(0, 120)}</div>}</button>))}</section>) : (<>
        <div className="flex gap-2"><button className="btn btn-accent flex-1" onClick={() => setSh({ k: 'import' })}>Import syllabus</button><button className="btn flex-1" onClick={() => setSh({ k: 'newSubject' })}>+ Subject</button></div>
        {!d.subjects.length && <div className="card text-center py-8 space-y-2"><div className="text-3xl" aria-hidden>📚</div><p className="font-semibold">No subjects yet</p><p className="text-sm">Import from pasted text or add one by hand.</p></div>}
        {d.categories.map(cat => { const subs = d.subjects.filter(s => s.categoryId === cat.id); if (!subs.length) return null;
          const ctp = d.topics.filter(t => subs.some(s => d.chapters.some(c => c.subjectId === s.id && c.id === t.chapterId)));
          return (<details key={cat.id} open className="space-y-2"><summary className="flex items-center gap-2 min-h-[48px] cursor-pointer"><span className="w-3 h-3 rounded-full" style={{ background: cat.color }} aria-hidden /><b className="flex-1">{cat.name}</b><span className="mono text-sm">{pct(rollup(ctp))}</span></summary>
            {subs.map(s => { const chs = d.chapters.filter(c => c.subjectId === s.id).sort((a, b) => a.order - b.order); const sts = d.topics.filter(t => chs.some(c => c.id === t.chapterId));
              return (<details key={s.id} className="card border-l-4" style={{ borderColor: cat.color }}><summary className="flex items-center gap-2 min-h-[48px] cursor-pointer"><span className="font-semibold flex-1">{s.name}{s.examDate ? <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>{shortDate(s.examDate)}</span> : null}</span>
                <span className="mono text-sm">{pct(rollup(sts))}</span><button className="btn" aria-label={`Edit ${s.name}`} style={{ minHeight: 40, padding: '0 12px' }} onClick={e => { e.preventDefault(); setSh({ k: 'subject', id: s.id }); }}>✎</button></summary>
                {!chs.length && <p className="text-sm py-2" style={{ color: 'var(--muted)' }}>No chapters. Use Import syllabus.</p>}
                {chs.map(c => { const ts = d.topics.filter(t => t.chapterId === c.id).sort((a, b) => a.order - b.order); return (
                  <details key={c.id} className="ml-2"><summary className="flex items-center gap-2 min-h-[48px] cursor-pointer"><span className="flex-1">{c.title}{c.marks ? <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>{c.marks}m</span> : null}</span>
                    <span className="mono text-sm">{pct(rollup(ts))}</span><button className="btn" aria-label={`Edit ${c.title}`} style={{ minHeight: 40, padding: '0 12px' }} onClick={e => { e.preventDefault(); setSh({ k: 'chapter', id: c.id }); }}>✎</button></summary>
                    {ts.map(t => (<button key={t.id} className="flex items-center gap-2 w-full min-h-[48px] pl-4 text-left" onClick={() => setSh({ k: 'topic', id: t.id })}>
                      <StatusIcon s={t.status} /><span className="flex-1 min-w-0 truncate">{t.important ? '★ ' : ''}{t.title}</span>{t.notes && <span aria-label="has note">📝</span>}<span className="mono text-xs" style={{ color: 'var(--muted)' }}>{t.confidence}/5</span></button>))}</details>); })}</details>); })}</details>); })}</>)}</>)}
    {sh?.k === 'topic' && <TopicSheet id={sh.id!} onClose={() => setSh(null)} />}
    {sh?.k === 'chapter' && <ChapterSheet id={sh.id!} onClose={() => setSh(null)} />}
    {sh?.k === 'subject' && <SubjectSheet id={sh.id} onClose={() => setSh(null)} />}
    {sh?.k === 'newSubject' && <SubjectSheet onClose={() => setSh(null)} />}
    {sh?.k === 'import' && <ImportSheet onClose={() => setSh(null)} />}
    {sh?.k === 'cats' && <CategorySheet onClose={() => setSh(null)} />}
  </main>);
}
