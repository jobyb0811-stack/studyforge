import { addDays, dayOfWeek, range } from '../lib/date';
export interface PlanTopic { id: string; chapterId: string; confidence: number; important: boolean; order: number }
export interface DistOpts { start: string; end: string; dailyMin: number; restDays: number[]; bufferDays: number; topicMin: number; revisionMin: number; baseLoad?: Record<string, number> }
export interface Item { date: string; topicId: string; chapterId: string; minutes: number; revision: boolean }
export interface DistResult { items: Item[]; overloadDays: string[]; studyDays: number }
/** Weak topics get more time; important flag adds 20%. Rounded to 5 min, min 10. */
export const topicMinutes = (t: { confidence: number; important: boolean }, base: number) =>
  Math.max(10, Math.round((base * (t.confidence <= 2 ? 1.5 : t.confidence === 3 ? 1 : 0.8) * (t.important ? 1.2 : 1)) / 5) * 5);

/** Even spread over non-rest days, last `bufferDays` kept free of new topics, revisions at +1/3/7/14 days. */
export function distribute(topics: PlanTopic[], o: DistOpts): DistResult {
  const days = range(o.start, o.end).filter(d => !o.restDays.includes(dayOfWeek(d)));
  const items: Item[] = [];
  if (!days.length || !topics.length) return { items, overloadDays: [], studyDays: 0 };
  const nStudy = Math.max(1, days.length - Math.min(o.bufferDays, days.length - 1));
  const queue = [...topics].sort((a, b) => a.order - b.order);
  const mins = new Map(queue.map(t => [t.id, topicMinutes(t, o.topicMin)]));
  const chapterOf = new Map(topics.map(t => [t.id, t.chapterId]));
  const target = Math.ceil([...mins.values()].reduce((a, b) => a + b, 0) / nStudy);
  const load = new Map(days.map(d => [d, o.baseLoad?.[d] ?? 0]));
  const rev = new Map<string, Set<string>>();
  const add = (date: string, id: string, minutes: number, revision: boolean) => {
    items.push({ date, topicId: id, chapterId: chapterOf.get(id)!, minutes, revision }); load.set(date, (load.get(date) ?? 0) + minutes); };
  const queueRev = (date: string, id: string) => [1, 3, 7, 14].forEach(off => {
    const k = days.find(d => d >= addDays(date, off)); if (k) rev.set(k, (rev.get(k) ?? new Set<string>()).add(id)); });
  const doRev = (d: string, i: number) => {
    for (const id of rev.get(d) ?? []) {
      if ((load.get(d) ?? 0) + o.revisionMin <= o.dailyMin) add(d, id, o.revisionMin, true);
      else if (days[i + 1]) rev.set(days[i + 1], (rev.get(days[i + 1]) ?? new Set<string>()).add(id));
    }
    rev.delete(d);
  };
  let qi = 0;
  days.forEach((d, i) => {
    doRev(d, i);
    if (i >= nStudy) return;
    const budget = Math.min(o.dailyMin - (load.get(d) ?? 0), target); let placed = 0;
    while (qi < queue.length) {
      const m = mins.get(queue[qi].id)!; const room = o.dailyMin - (load.get(d) ?? 0);
      if ((placed > 0 && placed + m > budget) || room < 10) break;
      add(d, queue[qi].id, Math.min(m, room), false); placed += Math.min(m, room); queueRev(d, queue[qi].id); qi++;
    }
  });
  for (const t of queue.slice(qi)) { // overflow: first day with room, else least-loaded study day (flagged overloaded)
    const m = mins.get(t.id)!; const study = days.slice(0, nStudy);
    const d = study.find(x => (load.get(x) ?? 0) + m <= o.dailyMin) ?? study.reduce((a, b) => ((load.get(a) ?? 0) <= (load.get(b) ?? 0) ? a : b));
    add(d, t.id, m, false); queueRev(d, t.id);
  }
  days.forEach((d, i) => doRev(d, i));
  return { items, overloadDays: days.filter(d => (load.get(d) ?? 0) > o.dailyMin), studyDays: nStudy };
}
