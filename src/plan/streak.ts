import { addDays, dayOfWeek } from '../lib/date';
export interface DayResult { date: string; status: 'ok' | 'fail' | 'frozen' | 'none' | 'today'; done: number; total: number }
const week = (d: string) => addDays(d, -((dayOfWeek(d) + 6) % 7)); // Monday key
/** A day is OK when >=70% of its non-skipped blocks are done. Off days/empty days are neutral. 1 freeze per week forgives one failed day. */
export function computeStreak(blocks: { date: string; status: string }[], offDays: string[], today: string) {
  const by = new Map<string, { date: string; status: string }[]>(); blocks.forEach(b => by.set(b.date, [...(by.get(b.date) ?? []), b]));
  const dates = [...by.keys()].filter(d => d <= today).sort(); const days: DayResult[] = [];
  if (!dates.length) return { streak: 0, days, freezeAvailable: true };
  let streak = 0; const frozen = new Set<string>();
  for (let d = dates[0]; d <= today; d = addDays(d, 1)) {
    const bs = (by.get(d) ?? []).filter(b => b.status !== 'skipped'); const done = bs.filter(b => b.status === 'done').length;
    if (offDays.includes(d) || !bs.length) { days.push({ date: d, status: 'none', done, total: bs.length }); continue; }
    const ok = done / bs.length >= 0.7;
    if (ok) { streak++; days.push({ date: d, status: 'ok', done, total: bs.length }); }
    else if (d === today) days.push({ date: d, status: 'today', done, total: bs.length });
    else if (!frozen.has(week(d))) { frozen.add(week(d)); days.push({ date: d, status: 'frozen', done, total: bs.length }); }
    else { streak = 0; days.push({ date: d, status: 'fail', done, total: bs.length }); }
  }
  return { streak, days, freezeAvailable: !frozen.has(week(today)) };
}
