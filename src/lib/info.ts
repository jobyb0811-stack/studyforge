import type { Block, Category, Chapter, Subject, Topic } from '../db/types';
export function infoOf(b: Block, d: { topics: Topic[]; chapters: Chapter[]; subjects: Subject[]; categories: Category[] }) {
  const topics = b.topicIds.map(id => d.topics.find(t => t.id === id)).filter((t): t is Topic => !!t);
  const subj = d.subjects.find(s => s.id === d.chapters.find(c => c.id === topics[0]?.chapterId)?.subjectId);
  return { topics, subject: subj?.name ?? '', color: d.categories.find(c => c.id === subj?.categoryId)?.color ?? 'var(--accent)' };
}
