import { describe, it, expect } from 'vitest';
import { parseSyllabus, splitList, findDuplicates, mergeTopics } from './syllabusParser';

const MESSY = `
PHARMACEUTICS-I  Theory
Unit I
Introduction to Pharmaceutics
• History of profession; scope, Pharmacopoeia
- Dosage forms (solid, liquid), routes of administration
Page 2 of 40
PHARMACEUTICS-I  Theory
2. Unit II: Powders
Types of powders, Granules ; Effervescent granules
 3
PHARMACEUTICS-I  Theory
III. Tablets
Formulation of tablets, coating-
1.1 Excipients
Diluents, binders
`;
describe('parser', () => {
  const r = parseSyllabus(MESSY);
  it('detects chapters in mixed styles', () => {
    expect(r.length).toBe(4);
    expect(r.some(c => c.title === 'Tablets')).toBe(true);
    expect(r.some(c => c.title === 'Excipients')).toBe(true);
  });
  it('strips page numbers, repeated headers and bullets', () => {
    const all = r.flatMap(c => c.topics.map(t => t.title));
    expect(all.some(t => /page|PHARMACEUTICS-I/i.test(t))).toBe(false);
    expect(all).toContain('History of profession');
    expect(all).toContain('Dosage forms (solid, liquid)');
  });
  it('splits comma/semicolon lists but not inside brackets', () => {
    expect(splitList('A (x, y); B, C.')).toEqual(['A (x, y)', 'B', 'C']);
    expect(r.find(c => c.title.includes('Powders'))!.topics.map(t => t.title)).toEqual(['Types of powders', 'Granules', 'Effervescent granules']);
  });
  it('flags suspicious lines', () => {
    expect(r.find(c => c.title === 'Tablets')!.topics.find(t => t.title === 'coating-')?.suspicious).toBeTruthy();
  });
  it('puts orphan lines under General', () => {
    expect(parseSyllabus('Alpha, Beta')[0]).toEqual({ title: 'General', topics: [{ title: 'Alpha', suspicious: undefined }, { title: 'Beta', suspicious: undefined }] });
  });
  it('detects duplicates on re-import', () => {
    expect(findDuplicates(['tablets'], r)).toEqual(['Tablets']);
    expect(mergeTopics(['Granules'], [{ title: 'granules' }, { title: 'New' }])).toEqual([{ title: 'New' }]);
  });
});
