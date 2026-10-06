import type { Block } from '../db/types';
import { fromMin, toMin } from '../lib/date';
import type { Item } from './distribute';
/** Group items into blocks: one study block per chapter per day, one Revision block per day, stacked after existing blocks. */
export function buildBlocks(items: Item[], o: { startTime: string; chapterTitle: (id: string) => string; endOfDay: (date: string) => number | null; uid: () => string }): Block[] {
  const out: Block[] = [];
  for (const d of [...new Set(items.map(i => i.date))].sort()) {
    const e = o.endOfDay(d); let cur = e === null ? toMin(o.startTime) : e + 10;
    const day = items.filter(i => i.date === d); const groups = new Map<string, Item[]>();
    day.filter(i => !i.revision).forEach(i => groups.set(i.chapterId, [...(groups.get(i.chapterId) ?? []), i]));
    const push = (title: string, its: Item[], kind: Block['kind']) => { const dur = its.reduce((a, i) => a + i.minutes, 0);
      out.push({ id: o.uid(), date: d, start: fromMin(cur), durationMin: dur, topicIds: its.map(i => i.topicId), title, status: 'planned', snoozes: 0, kind }); cur += dur + 10; };
    groups.forEach((its, ch) => push(o.chapterTitle(ch), its, 'study'));
    const rv = day.filter(i => i.revision); if (rv.length) push('Revision', rv, 'revision');
  }
  return out;
}
