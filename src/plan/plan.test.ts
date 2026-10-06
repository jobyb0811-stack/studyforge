import { describe, it, expect } from 'vitest';
import { distribute, topicMinutes } from './distribute';
import { computeStreak } from './streak';
const mk = (n: number, conf = 3) => Array.from({ length: n }, (_, i) => ({ id: `t${i}`, chapterId: 'c', confidence: conf, important: false, order: i }));
const O = { start: '2026-10-05', end: '2026-10-18', dailyMin: 240, restDays: [0], bufferDays: 2, topicMin: 30, revisionMin: 15 };
describe('distribute', () => {
  it('places every topic once, none on rest days, none in buffer, respects capacity', () => {
    const r = distribute(mk(20), O);
    expect(new Set(r.items.filter(i => !i.revision).map(i => i.topicId)).size).toBe(20);
    expect(r.items.some(i => new Date(i.date + 'T00:00').getDay() === 0)).toBe(false);
    expect(r.items.filter(i => !i.revision).every(i => i.date <= '2026-10-16')).toBe(true);
    expect(r.overloadDays).toEqual([]);
  });
  it('weak topics get more time', () => { expect(topicMinutes({ confidence: 1, important: false }, 30)).toBeGreaterThan(topicMinutes({ confidence: 5, important: false }, 30)); });
  it('adds spaced revisions', () => { const r = distribute(mk(3), O); expect(r.items.filter(i => i.revision).length).toBeGreaterThan(3); });
  it('flags overload when too much content', () => { expect(distribute(mk(80), { ...O, dailyMin: 60 }).overloadDays.length).toBeGreaterThan(0); });
});
describe('streak', () => {
  const b = (date: string, status: string) => ({ date, status });
  it('counts ok days and forgives one failure per week', () => {
    const r = computeStreak([b('2026-10-05', 'done'), b('2026-10-06', 'missed'), b('2026-10-07', 'done')], [], '2026-10-07');
    expect(r.streak).toBe(2); expect(r.days[1].status).toBe('frozen');
  });
  it('second failure in a week breaks the streak; off days are neutral', () => {
    const r = computeStreak([b('2026-10-05', 'done'), b('2026-10-06', 'missed'), b('2026-10-07', 'missed'), b('2026-10-08', 'done')], [], '2026-10-08');
    expect(r.streak).toBe(1);
    expect(computeStreak([b('2026-10-05', 'done'), b('2026-10-06', 'missed')], ['2026-10-06'], '2026-10-07').streak).toBe(1);
  });
});
