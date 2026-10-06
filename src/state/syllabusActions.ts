import { db } from '../db/db';
import type { Category, Chapter, Subject, Subtopic, Topic } from '../db/types';
import type { DChapter } from '../parser/editOps';
import { mergeTopics } from '../parser/syllabusParser';
import { useData, useToast } from './store';
import { uid } from './actions';
const reload = () => useData.getState().load();
export const saveSubject = async (s: Subject) => { await db.subjects.put(s); await reload(); };
export const saveChapter = async (c: Chapter) => { await db.chapters.put(c); await reload(); };
export const saveTopic = async (t: Topic) => { await db.topics.put(t); await reload(); };
export const saveCategory = async (c: Category) => { await db.categories.put(c); await reload(); };
export async function addTopics(chapterId: string, titles: string[]) {
  const st = useData.getState(); let order = Math.max(-1, ...st.topics.filter(t => t.chapterId === chapterId).map(t => t.order)) + 1;
  await db.topics.bulkPut(titles.map((title): Topic => ({ id: uid(), chapterId, title, status: 'not_started', confidence: 3, revisions: 0, notes: '', important: false, order: order++ }))); await reload();
}
/** Cascade delete with 5-second Undo. */
export async function deleteTree(kind: 'subject' | 'chapter' | 'topic', id: string) {
  const st = useData.getState();
  const subjects = kind === 'subject' ? st.subjects.filter(s => s.id === id) : [];
  const chapters = kind === 'subject' ? st.chapters.filter(c => c.subjectId === id) : kind === 'chapter' ? st.chapters.filter(c => c.id === id) : [];
  const cids = new Set(chapters.map(c => c.id));
  const topics = kind === 'topic' ? st.topics.filter(t => t.id === id) : st.topics.filter(t => cids.has(t.chapterId));
  const subs: Subtopic[] = await db.subtopics.where('topicId').anyOf(topics.map(t => t.id)).toArray();
  await db.transaction('rw', db.subjects, db.chapters, db.topics, db.subtopics, async () => {
    await db.subtopics.bulkDelete(subs.map(s => s.id)); await db.topics.bulkDelete(topics.map(t => t.id));
    await db.chapters.bulkDelete(chapters.map(c => c.id)); await db.subjects.bulkDelete(subjects.map(s => s.id)); });
  await reload();
  useToast.getState().show(`Deleted ${kind}${topics.length > 1 ? ` + ${topics.length} topics` : ''}`, async () => {
    await db.transaction('rw', db.subjects, db.chapters, db.topics, db.subtopics, async () => {
      await db.subjects.bulkPut(subjects); await db.chapters.bulkPut(chapters); await db.topics.bulkPut(topics); await db.subtopics.bulkPut(subs); });
    await reload(); });
}
/** Save a reviewed import: new chapters, or merge only genuinely new topics into duplicates / skip them. */
export async function saveImport(subjectId: string, chapters: DChapter[]) {
  const st = useData.getState(); const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const mine = st.chapters.filter(c => c.subjectId === subjectId); let co = Math.max(-1, ...mine.map(c => c.order)) + 1;
  const newC: Chapter[] = [], newT: Topic[] = []; let added = 0;
  for (const c of chapters) {
    const ex = mine.find(m => norm(m.title) === norm(c.title));
    if (ex && c.action === 'skip') continue;
    const chapter = ex ?? { id: uid(), subjectId, title: c.title.trim(), marks: 0, priority: 2 as const, order: co++ };
    if (!ex) newC.push(chapter);
    const have = st.topics.filter(t => t.chapterId === chapter.id).map(t => t.title);
    let o = Math.max(-1, ...st.topics.filter(t => t.chapterId === chapter.id).map(t => t.order)) + 1;
    for (const t of mergeTopics(have, c.topics.filter(t => t.title.trim()))) { newT.push({ id: uid(), chapterId: chapter.id, title: t.title.trim(), status: 'not_started', confidence: 3, revisions: 0, notes: '', important: false, order: o++ }); added++; }
  }
  await db.transaction('rw', db.chapters, db.topics, async () => { await db.chapters.bulkPut(newC); await db.topics.bulkPut(newT); });
  await reload(); useToast.getState().show(`Imported ${added} topics · ${newC.length} new chapters`, async () => {
    await db.transaction('rw', db.chapters, db.topics, async () => { await db.topics.bulkDelete(newT.map(t => t.id)); await db.chapters.bulkDelete(newC.map(c => c.id)); }); await reload(); });
}

/** Move a chapter up (-1) or down (+1) within its subject. */
export async function moveChapter(id: string, dir: -1 | 1) {
  const st = useData.getState(); const c = st.chapters.find(x => x.id === id); if (!c) return;
  const sib = st.chapters.filter(x => x.subjectId === c.subjectId).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
  const i = sib.findIndex(x => x.id === id), j = i + dir; if (j < 0 || j >= sib.length) return;
  [sib[i], sib[j]] = [sib[j], sib[i]]; await db.chapters.bulkPut(sib.map((x, k) => ({ ...x, order: k }))); await reload();
}
