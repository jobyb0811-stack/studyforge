/** Offline rule-based syllabus parser. Swappable: implement SyllabusParser and replace `parser` export. */
export interface ParsedTopic { title: string; suspicious?: string }
export interface ParsedChapter { title: string; topics: ParsedTopic[] }
export interface SyllabusParser { parse(raw: string): ParsedChapter[] }

const BULLET = /^[\s•▪●◦·○■□✓➢➤►>*–—-]+(?=\S)/;
const PAGE = [/^\s*(page\s*)?\d{1,3}(\s*(of|\/)\s*\d{1,3})?\s*$/i, /^\s*[-–—]+\s*\d{1,3}\s*[-–—]+\s*$/, /^\s*page\s+\d+/i];
const CHAPTER: RegExp[] = [
  /^(?:unit|chapter|module)\s*[-–:.]?\s*(?:[ivxlcdm]+|\d+)\b\s*[:.\-–—)]*\s*(.*)$/i,
  /^\d+\.\d+\.?\s+(\S.*)$/,
  /^(?:[ivxlcdm]+)[.)]\s+(\S.*)$/i,
  /^\d+[.)]\s+(\S.*)$/,
];
const isChapterLine = (l: string): string | null => {
  for (const [i, re] of CHAPTER.entries()) { const m = l.match(re);
    if (m) return (i === 0 ? l.replace(/\s*[:.\-–—]+\s*$/, '') : m[1]).trim() || l; }
  return null;
};
export function splitList(line: string): string[] {
  const out: string[] = []; let depth = 0, cur = '';
  for (const ch of line) {
    if ('([{'.includes(ch)) depth++; else if (')]}'.includes(ch)) depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === ';') && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map(s => s.trim().replace(/[.]+$/, '')).filter(Boolean);
}
const flag = (t: string): string | undefined =>
  t.length > 120 ? 'very long' : t.length < 3 ? 'very short' : !/[a-z]/i.test(t) ? 'no letters' :
  /[-–]$/.test(t) ? 'ends with hyphen (broken line?)' : /^[a-z]/.test(t) && t.length < 12 ? 'starts lowercase (fragment?)' : undefined;

export const parser: SyllabusParser = {
  parse(raw) {
    const lines = raw.replace(/\r/g, '').split('\n').map(l => l.replace(/\u00ad|\u200b/g, '').trim());
    const freq = new Map<string, number>();
    for (const l of lines) if (l) freq.set(l.toLowerCase(), (freq.get(l.toLowerCase()) ?? 0) + 1);
    const chapters: ParsedChapter[] = []; let cur: ParsedChapter | null = null;
    const ensure = () => cur ?? (cur = (chapters.push({ title: 'General', topics: [] }), chapters[chapters.length - 1]));
    for (let l of lines) {
      if (!l || PAGE.some(r => r.test(l))) continue;
      if ((freq.get(l.toLowerCase()) ?? 0) >= 3 && l.length < 80) continue; // repeated running header
      const title = isChapterLine(l);
      if (title) { cur = { title, topics: [] }; chapters.push(cur); continue; }
      l = l.replace(BULLET, '');
      for (const t of splitList(l)) ensure().topics.push({ title: t, suspicious: flag(t) });
    }
    return chapters.filter(c => c.topics.length || c.title !== 'General');
  },
};
export const parseSyllabus = (raw: string) => parser.parse(raw);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
/** Re-import: returns titles of parsed chapters that already exist, so UI can ask merge/skip. */
export function findDuplicates(existing: string[], parsed: ParsedChapter[]) {
  const set = new Set(existing.map(norm));
  return parsed.filter(c => set.has(norm(c.title))).map(c => c.title);
}
export function mergeTopics(existing: string[], incoming: ParsedTopic[]) {
  const set = new Set(existing.map(norm)); return incoming.filter(t => !set.has(norm(t.title)));
}
