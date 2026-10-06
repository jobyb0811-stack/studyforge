import type { Chapter, Subject, Topic } from '../db/types';
export interface Hit { kind: 'subject' | 'chapter' | 'topic' | 'note'; id: string; title: string; sub: string; snippet?: string }
export function searchAll(q: string, d: { subjects: Subject[]; chapters: Chapter[]; topics: Topic[] }, limit = 40): Hit[] {
  const s = q.trim().toLowerCase(); if (s.length < 2) return [];
  const subj = (id: string) => d.subjects.find(x => x.id === id)?.name ?? ''; const chap = (id: string) => d.chapters.find(c => c.id === id);
  const out: Hit[] = [];
  d.subjects.forEach(x => x.name.toLowerCase().includes(s) && out.push({ kind: 'subject', id: x.id, title: x.name, sub: 'Subject' }));
  d.chapters.forEach(c => c.title.toLowerCase().includes(s) && out.push({ kind: 'chapter', id: c.id, title: c.title, sub: subj(c.subjectId) }));
  d.topics.forEach(t => { const c = chap(t.chapterId); const sub = `${subj(c?.subjectId ?? '')} › ${c?.title ?? ''}`;
    if (t.title.toLowerCase().includes(s)) out.push({ kind: 'topic', id: t.id, title: t.title, sub });
    else if (t.notes.toLowerCase().includes(s)) { const i = t.notes.toLowerCase().indexOf(s); out.push({ kind: 'note', id: t.id, title: t.title, sub, snippet: '…' + t.notes.slice(Math.max(0, i - 30), i + 60) + '…' }); } });
  return out.slice(0, limit);
}
