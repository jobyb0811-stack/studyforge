import { db, StudyDB } from './db';
import type * as T from './types';
const uid = () => crypto.randomUUID();
type TableName = 'exams'|'categories'|'subjects'|'chapters'|'topics'|'subtopics'|'blocks'|'sessions';
export const DEFAULT_CATEGORIES = [
  ['Basic Medical Sciences', '#0ea5e9'], ['Pharmaceutical Sciences', '#10b981'],
  ['Clinical & Pharmacology', '#f43f5e'], ['Practice & Skills', '#f59e0b'],
] as const;

export function createStorage(d: StudyDB = db) {
  const tbl = (n: TableName) => d.table(n);
  const roll = (ts: T.Topic[]) => {
    const w = { not_started: 0, learning: 0.4, revised: 0.75, mastered: 1 } as const;
    return ts.length ? ts.reduce((s, t) => s + w[t.status], 0) / ts.length : 0;
  };
  return {
    uid,
    count: (n: TableName) => tbl(n).count(),
    all: <R,>(n: TableName) => tbl(n).toArray() as Promise<R[]>,
    get: <R,>(n: TableName, id: string) => tbl(n).get(id) as Promise<R | undefined>,
    put: (n: TableName, row: { id: string }) => tbl(n).put(row),
    bulkPut: (n: TableName, rows: { id: string }[]) => tbl(n).bulkPut(rows),
    remove: (n: TableName, id: string) => tbl(n).delete(id),
    async removeChapter(id: string) { // cascades topics + subtopics
      const tids = (await d.topics.where('chapterId').equals(id).primaryKeys()) as string[];
      await d.transaction('rw', d.chapters, d.topics, d.subtopics, async () => {
        await d.subtopics.where('topicId').anyOf(tids).delete();
        await d.topics.bulkDelete(tids); await d.chapters.delete(id);
      });
    },
    async topicsOfSubject(subjectId: string) {
      const chs = await d.chapters.where('subjectId').equals(subjectId).primaryKeys();
      return d.topics.where('chapterId').anyOf(chs as string[]).toArray();
    },
    /** Progress 0..1 rolled up topic → chapter → subject → category → exam. */
    async progress() {
      const [cats, subs, chs, tps] = await Promise.all([d.categories.toArray(), d.subjects.toArray(), d.chapters.toArray(), d.topics.toArray()]);
      const chap: Record<string, number> = {}, subj: Record<string, number> = {}, cat: Record<string, number> = {};
      for (const c of chs) chap[c.id] = roll(tps.filter(t => t.chapterId === c.id));
      for (const s of subs) subj[s.id] = roll(tps.filter(t => chs.find(c => c.id === t.chapterId)?.subjectId === s.id));
      for (const c of cats) { const ids = new Set(subs.filter(s => s.categoryId === c.id).map(s => s.id));
        cat[c.id] = roll(tps.filter(t => ids.has(chs.find(x => x.id === t.chapterId)?.subjectId ?? ''))); }
      return { chapters: chap, subjects: subj, categories: cat, exam: roll(tps) };
    },
    async exportJSON() {
      const out: Record<string, unknown[]> = {};
      for (const t of d.tables) out[t.name] = await t.toArray();
      return JSON.stringify({ app: 'studyforge', version: 1, data: out });
    },
    async importJSON(json: string) {
      const p = JSON.parse(json); if (p.app !== 'studyforge') throw new Error('Not a StudyForge backup');
      await d.transaction('rw', d.tables, async () => {
        for (const t of d.tables) { await t.clear(); await t.bulkPut(p.data[t.name] ?? []); }
      });
    },
    async seedIfEmpty() {
      if (await d.categories.count()) return;
      const cats: T.Category[] = DEFAULT_CATEGORIES.map(([name, color], order) => ({ id: uid(), name, color, order }));
      const exam: T.Exam = { id: uid(), name: 'Sample: B.Pharm/Pharm D Year 1', dailyHours: 4, createdAt: Date.now() };
      const sub: T.Subject = { id: uid(), examId: exam.id, categoryId: cats[1].id, name: 'Pharmaceutics (sample)', kind: 'both', difficulty: 3, marks: 100 };
      const chap: T.Chapter = { id: uid(), subjectId: sub.id, title: 'Unit I: Dosage Forms', marks: 15, priority: 2, order: 0 };
      const topics: T.Topic[] = ['Tablets', 'Capsules', 'Solutions and syrups'].map((title, order) => ({
        id: uid(), chapterId: chap.id, title, status: 'not_started', confidence: 3, revisions: 0, notes: '', important: false, order }));
      await d.transaction('rw', d.tables, async () => {
        await d.categories.bulkPut(cats); await d.exams.put(exam); await d.subjects.put(sub);
        await d.chapters.put(chap); await d.topics.bulkPut(topics);
      });
    },
  };
}
export const storage = createStorage();
export const seedIfEmpty = () => storage.seedIfEmpty();
