import { describe, it, expect } from 'vitest';
import { deleteChapter, mergeWithPrev, moveTopic, splitAt, editTopic, type DChapter } from './editOps';
const base = (): DChapter[] => [{ title: 'A', topics: [{ title: 'a1' }, { title: 'a2' }, { title: 'a3' }] }, { title: 'B', topics: [{ title: 'b1' }] }];
describe('editOps', () => {
  it('merges, splits, moves, deletes without mutating input', () => {
    const b = base();
    expect(mergeWithPrev(b, 1)).toHaveLength(1); expect(mergeWithPrev(b, 1)[0].topics).toHaveLength(4);
    const s = splitAt(b, 0, 1); expect(s.map(c => c.topics.length)).toEqual([1, 2, 1]);
    expect(moveTopic(b, 0, 0, 1)[1].topics.map(t => t.title)).toEqual(['b1', 'a1']);
    expect(deleteChapter(b, 0)).toHaveLength(1); expect(editTopic(b, 0, 0, 'x')[0].topics[0].title).toBe('x');
    expect(b[0].topics).toHaveLength(3);
  });
});
