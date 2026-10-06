import { db } from '../db/db';
import type { Block, Status, Topic } from '../db/types';
import { rescheduleAll } from '../native/alarmSync';
import { addDays, dayOfWeek, fromMin, nowMin, todayStr, toMin } from '../lib/date';
import { distribute } from '../plan/distribute';
import { buildBlocks } from '../plan/build';
import { PLAN_DEFAULTS, useData, useToast, type PlanSettings } from './store';

export const uid = () => crypto.randomUUID();
export const buzz = (p: number | number[] = 30) => { try { navigator.vibrate?.(p); } catch { /* ignore */ } };
const refresh = async () => { await useData.getState().load(); rescheduleAll().catch(console.error); };

export async function mutateBlocks(o: { put?: Block[]; del?: string[] }, undoMsg?: string, extraUndo?: () => Promise<void>) {
  const byId = new Map(useData.getState().blocks.map(b => [b.id, b])); const put = o.put ?? [], del = o.del ?? [];
  const restore = [...put, ...del.map(id => ({ id }))].map(x => byId.get(x.id)).filter((b): b is Block => !!b);
  const created = put.filter(b => !byId.has(b.id)).map(b => b.id);
  await db.transaction('rw', db.blocks, async () => { if (put.length) await db.blocks.bulkPut(put); if (del.length) await db.blocks.bulkDelete(del); });
  await refresh();
  if (undoMsg) useToast.getState().show(undoMsg, async () => {
    await db.transaction('rw', db.blocks, async () => { await db.blocks.bulkDelete(created); await db.blocks.bulkPut(restore); });
    await extraUndo?.(); await refresh(); });
}
export async function savePlan(p: Partial<PlanSettings>) {
  await db.kv.put({ key: 'plan', value: { ...useData.getState().plan, ...p } }); await useData.getState().load();
}
export async function setExamDate(date: string) {
  const e = useData.getState().exams[0]; if (e) { await db.exams.put({ ...e, date: date || undefined }); await useData.getState().load(); }
}
export async function setDailyHours(h: number) {
  const e = useData.getState().exams[0]; if (e) { await db.exams.put({ ...e, dailyHours: h }); await useData.getState().load(); }
}
export const examDate = () => { const s = useData.getState(); return [s.exams[0]?.date, ...s.subjects.map(x => x.examDate)].filter(Boolean).sort()[0] as string | undefined; };
export const endOfDay = (date: string): number | null => {
  const bs = useData.getState().blocks.filter(b => b.date === date && b.status !== 'skipped'); return bs.length ? Math.max(...bs.map(b => toMin(b.start) + b.durationMin)) : null; };
export const loadOf = (date: string) => useData.getState().blocks.filter(b => b.date === date && b.status !== 'skipped').reduce((a, b) => a + b.durationMin, 0);

/** Save new blocks, stamp topics' plannedDate (earliest study block), single undo for both. */
export async function applyPlan(blocks: Block[], msg: string) {
  const st = useData.getState(); const first = new Map<string, string>();
  blocks.filter(b => b.kind === 'study').forEach(b => b.topicIds.forEach(id => { const c = first.get(id); if (!c || b.date < c) first.set(id, b.date); }));
  const old = st.topics.filter(t => first.has(t.id));
  await db.topics.bulkPut(old.map(t => ({ ...t, plannedDate: first.get(t.id) })));
  await mutateBlocks({ put: blocks }, msg, async () => { await db.topics.bulkPut(old); });
}
export const makeBlocks = (items: Parameters<typeof buildBlocks>[0]) => {
  const st = useData.getState(); const title = (id: string) => st.chapters.find(c => c.id === id)?.title ?? 'Study';
  return buildBlocks(items, { startTime: st.plan.startTime, chapterTitle: title, endOfDay, uid });
};
export async function planAllUnplanned() {
  const st = useData.getState(); const end = examDate();
  if (!end) { useToast.getState().show('Set an exam date first'); return; }
  const start = nowMin() > toMin(st.plan.startTime) ? addDays(todayStr(), 1) : todayStr();
  if (end < start) { useToast.getState().show('Exam date is too close or past'); return; }
  const chOrder = new Map(st.chapters.map((c, i) => [c.id, i]));
  const ts = st.topics.filter(t => !t.plannedDate && t.status !== 'mastered').sort((a, b) => (chOrder.get(a.chapterId) ?? 0) - (chOrder.get(b.chapterId) ?? 0) || a.order - b.order);
  if (!ts.length) { useToast.getState().show('Everything is already planned'); return; }
  const base: Record<string, number> = {}; for (let d = start; d <= end; d = addDays(d, 1)) base[d] = loadOf(d);
  const r = distribute(ts.map((t, i) => ({ id: t.id, chapterId: t.chapterId, confidence: t.confidence, important: t.important, order: i })),
    { start, end, dailyMin: (st.exams[0]?.dailyHours ?? 4) * 60, restDays: st.plan.restDays, bufferDays: st.plan.bufferDays, topicMin: st.plan.topicMin, revisionMin: st.plan.revisionMin, baseLoad: base });
  await applyPlan(makeBlocks(r.items), `Planned ${ts.length} topics${r.overloadDays.length ? ` · ⚠ ${r.overloadDays.length} overloaded days` : ''}`);
}
export async function moveMissed(target: 'today' | 'tomorrow') {
  const today = todayStr(); const date = target === 'today' ? today : addDays(today, 1);
  const miss = useData.getState().blocks.filter(b => b.status === 'missed' || ((b.status === 'planned' || b.status === 'snoozed') && b.date < today));
  if (!miss.length) { useToast.getState().show('No missed blocks'); return; }
  let cur = endOfDay(date); cur = cur === null ? (target === 'today' ? Math.ceil((nowMin() + 5) / 15) * 15 : toMin(useData.getState().plan.startTime)) : cur + 10;
  const moved = miss.map(b => { const n = { ...b, date, start: fromMin(cur!), status: 'planned' as const, snoozes: 0 }; cur = cur! + b.durationMin + 10; return n; });
  await mutateBlocks({ put: moved }, `Moved ${moved.length} blocks to ${target}`);
}
/** "I'm off today": shift every open block from today onward by one study day; no streak penalty. */
export async function offToday() {
  const st = useData.getState(); const today = todayStr();
  const open = st.blocks.filter(b => b.date >= today && (b.status === 'planned' || b.status === 'snoozed'));
  const next = (d: string) => { let n = addDays(d, 1); while (st.plan.restDays.includes(dayOfWeek(n))) n = addDays(n, 1); return n; };
  const prev = st.plan.offDays;
  await savePlan({ offDays: [...new Set([...prev, today])] });
  await mutateBlocks({ put: open.map(b => ({ ...b, date: next(b.date), status: 'planned' as const })) }, `Day off. ${open.length} blocks shifted`, async () => { await savePlan({ offDays: prev }); });
}
export async function completeBlock(b: Block, topicIds: string[], status?: Status, conf?: 1 | 2 | 3 | 4 | 5) {
  const st = useData.getState(); const old = st.topics.filter(t => topicIds.includes(t.id));
  if (status || conf) await db.topics.bulkPut(old.map((t): Topic => ({ ...t, status: status ?? t.status, confidence: conf ?? t.confidence,
    revisions: t.revisions + (b.kind === 'revision' || status === 'revised' ? 1 : 0), lastStudied: Date.now() })));
  buzz(40);
  await mutateBlocks({ put: [{ ...b, status: 'done' }] }, 'Block done', async () => { await db.topics.bulkPut(old); });
}
export const skipBlock = (b: Block, reason: string) => mutateBlocks({ put: [{ ...b, status: 'skipped', skipReason: reason }] }, 'Block skipped');
export const snoozeBlock = (b: Block, min = 10) => mutateBlocks({ put: [{ ...b, start: fromMin(toMin(b.start) + min), snoozes: b.snoozes + 1 }] }, `Pushed ${min} min later`);
export const removeBlock = (b: Block) => mutateBlocks({ del: [b.id] }, 'Block deleted');
export { PLAN_DEFAULTS };
