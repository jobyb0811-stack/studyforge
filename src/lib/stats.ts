import type { Block, FocusSession } from '../db/types';
import { addDays, dayOfWeek, ymd } from './date';
import type { DayResult } from '../plan/streak';
export const weekStartOf = (date: string, ws: number) => addDays(date, -((dayOfWeek(date) - ws + 7) % 7));
export interface DayStat { date: string; planned: number; actual: number; plannedTopics: number; doneTopics: number }
/** actual = minutes of done blocks + focus minutes not already covered by a done block. */
export function weekSeries(days: string[], blocks: Block[], sessions: Pick<FocusSession, 'startedAt' | 'minutes' | 'blockId'>[]): DayStat[] {
  const doneIds = new Set(blocks.filter(b => b.status === 'done').map(b => b.id));
  return days.map(date => {
    const bs = blocks.filter(b => b.date === date && b.status !== 'skipped'); const done = bs.filter(b => b.status === 'done');
    const extra = sessions.filter(s => ymd(new Date(s.startedAt)) === date && (!s.blockId || !doneIds.has(s.blockId))).reduce((a, s) => a + s.minutes, 0);
    return { date, planned: bs.reduce((a, b) => a + b.durationMin, 0), actual: done.reduce((a, b) => a + b.durationMin, 0) + extra,
      plannedTopics: new Set(bs.flatMap(b => b.topicIds)).size, doneTopics: new Set(done.flatMap(b => b.topicIds)).size };
  });
}
export function bestStreak(days: DayResult[]) { let best = 0, cur = 0; for (const d of days) { if (d.status === 'ok') best = Math.max(best, ++cur); else if (d.status === 'fail') cur = 0; } return best; }
