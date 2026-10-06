import type { ParsedChapter } from './syllabusParser';
export interface DChapter extends ParsedChapter { action?: 'merge' | 'skip' }
const cp = (cs: DChapter[]): DChapter[] => cs.map(c => ({ ...c, topics: [...c.topics] }));
export const renameChapter = (cs: DChapter[], i: number, title: string) => cp(cs).map((c, k) => (k === i ? { ...c, title } : c));
export const editTopic = (cs: DChapter[], i: number, j: number, title: string) => { const n = cp(cs); n[i].topics[j] = { title }; return n; };
export const deleteTopic = (cs: DChapter[], i: number, j: number) => { const n = cp(cs); n[i].topics.splice(j, 1); return n; };
export const deleteChapter = (cs: DChapter[], i: number) => cs.filter((_, k) => k !== i);
export const setAction = (cs: DChapter[], i: number, action: DChapter['action']) => cp(cs).map((c, k) => (k === i ? { ...c, action } : c));
export function mergeWithPrev(cs: DChapter[], i: number) { if (i <= 0 || i >= cs.length) return cs; const n = cp(cs); n[i - 1].topics.push(...n[i].topics); n.splice(i, 1); return n; }
/** Topics from index j onward become a new chapter right after chapter i. */
export function splitAt(cs: DChapter[], i: number, j: number) {
  if (j <= 0 || j >= cs[i].topics.length) return cs; const n = cp(cs); const tail = n[i].topics.splice(j);
  n.splice(i + 1, 0, { title: `${n[i].title} (part 2)`, topics: tail }); return n;
}
export function moveTopic(cs: DChapter[], i: number, j: number, to: number) {
  if (to === i || to < 0 || to >= cs.length) return cs; const n = cp(cs); const [t] = n[i].topics.splice(j, 1); n[to].topics.push(t); return n;
}
