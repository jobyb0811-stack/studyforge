import { describe, it, expect } from 'vitest';
import { bestStreak, weekSeries, weekStartOf } from './stats';
describe('stats', () => {
  it('finds week start for Monday/Sunday weeks', () => { expect(weekStartOf('2026-10-07', 1)).toBe('2026-10-05'); expect(weekStartOf('2026-10-07', 0)).toBe('2026-10-04'); expect(weekStartOf('2026-10-05', 1)).toBe('2026-10-05'); });
  it('sums planned and actual without double counting focus', () => {
    const b = [{ id: 'a', date: '2026-10-05', start: '18:00', durationMin: 60, topicIds: ['t1', 't2'], title: '', status: 'done', snoozes: 0, kind: 'study' }, { id: 'b', date: '2026-10-05', start: '19:30', durationMin: 30, topicIds: ['t3'], title: '', status: 'missed', snoozes: 0, kind: 'study' }] as any;
    const s = weekSeries(['2026-10-05'], b, [{ startedAt: new Date('2026-10-05T18:10:00').getTime(), minutes: 25, blockId: 'a' }, { startedAt: new Date('2026-10-05T21:00:00').getTime(), minutes: 20 }]);
    expect(s[0]).toMatchObject({ planned: 90, actual: 80, plannedTopics: 3, doneTopics: 2 });
  });
  it('best streak ignores neutral days', () => { expect(bestStreak([{ status: 'ok' }, { status: 'none' }, { status: 'ok' }, { status: 'fail' }, { status: 'ok' }] as any)).toBe(2); });
});
