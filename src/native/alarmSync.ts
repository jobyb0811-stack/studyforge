import { db } from '../db/db';
import type { Block } from '../db/types';
import { Alarm, isNative, type NativeAlarm, type Perms } from './alarm';
import { getAlarmSettings, type DailyKey } from './settings';
import { navigate } from '../nav';

const at = (date: string, time: string) => new Date(`${date}T${time}:00`).getTime();
const nextDaily = (time: string) => { const [h, m] = time.split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1); return d.getTime(); };
const DAILY_TITLE: Record<DailyKey, string> = { morning: 'Morning start', review: 'Nightly review', winddown: 'Wind-down' };

/** Call on app open and after EVERY schedule edit. Rebuilds all future alarms from Dexie. */
export async function rescheduleAll() {
  if (!isNative) return;
  const s = await getAlarmSettings(); const now = Date.now();
  const [blocks, topics, chapters, subjects, cats] = await Promise.all([db.blocks.toArray(), db.topics.toArray(), db.chapters.toArray(), db.subjects.toArray(), db.categories.toArray()]);
  const out: NativeAlarm[] = [];
  for (const b of blocks) {
    if (b.status !== 'planned' || b.kind === 'daily') continue; // snoozed blocks keep their native snooze entry
    const t = at(b.date, b.start); if (t <= now) continue;
    const tps = b.topicIds.map(id => topics.find(x => x.id === id)).filter(Boolean) as typeof topics;
    const subj = subjects.find(x => x.id === chapters.find(c => c.id === tps[0]?.chapterId)?.subjectId);
    const cat = cats.find(c => c.id === subj?.categoryId);
    const base = { blockId: b.id, startAt: t, title: b.title, subject: subj?.name ?? '', color: cat?.color ?? '#4f46e5',
      topics: tps.slice(0, 3).map(x => x.title), more: Math.max(0, tps.length - 3) };
    out.push({ ...base, id: `${b.id}:alarm`, kind: 'alarm', triggerAt: t });
    if (s.leadMin > 0 && t - s.leadMin * 60000 > now) out.push({ ...base, id: `${b.id}:lead`, kind: 'lead', triggerAt: t - s.leadMin * 60000 });
  }
  (Object.keys(s.daily) as DailyKey[]).forEach(k => { if (!s.daily[k].on) return; const t = nextDaily(s.daily[k].time);
    out.push({ id: `daily-${k}:alarm`, blockId: `daily-${k}`, kind: 'alarm', triggerAt: t, baseAt: t, startAt: t, repeat: true, title: DAILY_TITLE[k], subject: 'Daily alarm', topics: [] }); });
  await Alarm.cancelAll({ keepPast: true });
  await Alarm.schedule({ alarms: out });
  await Alarm.setSound({ sound: s.sound });
}

/** Apply start/snooze/skip/missed actions recorded natively (alarm screen, notification, timeout). */
export async function applyPending() {
  const { actions } = await Alarm.consumePendingActions();
  for (const a of actions) {
    if (a.blockId === 'test') { await logTestAction(a.action); continue; }
    const b = await db.blocks.get(a.blockId);
    if (b) {
      const patch: Partial<Block> = a.action === 'snooze' ? { status: 'snoozed', snoozes: a.snoozes }
        : a.action === 'skip' ? { status: 'skipped', skipReason: a.reason } : a.action === 'missed' ? { status: 'missed' } : {};
      await db.blocks.put({ ...b, ...patch });
    }
    if (a.action === 'start') navigate(a.blockId.startsWith('daily-') ? '/' : `/focus/${a.blockId}`);
  }
  return actions.length;
}

// ---- Test alarm + missed-alarm detector ----
export interface TestLog { scheduledAt: number; triggerAt: number; result: 'pending' | 'fired' | 'not_fired'; delayMs?: number; cause?: string }
const getLogs = async () => ((await db.kv.get('testLog'))?.value as TestLog[]) ?? [];
const setLogs = (l: TestLog[]) => db.kv.put({ key: 'testLog', value: l.slice(-10) });
export function likelyCause(p: Perms): string {
  if (!p.notifications) return 'Notifications are turned off for StudyForge.';
  if (!p.exactAlarm) return 'Exact alarm permission is off.';
  if (!p.fullScreen) return 'Full-screen alerts are blocked.';
  if (!p.batteryExempt) return 'Battery optimisation or your phone maker\'s autostart manager likely stopped the app.';
  return 'The phone was switched off, the app was force-stopped, or a vendor power manager (autostart) blocked it.';
}
export async function runTestAlarm() {
  const t = Date.now() + 60_000;
  await Alarm.schedule({ alarms: [{ id: 'test:alarm', blockId: 'test', kind: 'alarm', triggerAt: t, startAt: t, title: 'Test alarm', subject: 'Alarm Health check', topics: ['If you can read this, alarms work.'] }] });
  await setLogs([...(await getLogs()), { scheduledAt: Date.now(), triggerAt: t, result: 'pending' }]);
}
async function logTestAction(_a: string) { await resolveTestLogs(); }
export async function resolveTestLogs(): Promise<TestLog[]> {
  const logs = await getLogs(); const last = logs[logs.length - 1];
  if (!last || last.result !== 'pending') return logs;
  const { alarms, now } = await Alarm.getScheduled(); const e = alarms.find(x => x.id === 'test:alarm');
  if (e?.fired && e.fired >= last.triggerAt - 5000) { last.result = 'fired'; last.delayMs = e.fired - last.triggerAt; }
  else if (now > last.triggerAt + 90_000) { last.result = 'not_fired'; last.cause = likelyCause(await Alarm.checkPermissions()); }
  await setLogs(logs); return logs;
}
export const readTestLogs = getLogs;
export interface Missed { blockId: string; title: string; at: number; cause: string }
/** Call BEFORE rescheduleAll on open. Reports real alarms (not tests) that were due but never fired. */
export async function detectMissed(): Promise<Missed[]> {
  const { alarms, now } = await Alarm.getScheduled(); const seen = new Set(((await db.kv.get('missedSeen'))?.value as string[]) ?? []);
  const p = await Alarm.checkPermissions(); const res: Missed[] = [];
  for (const e of alarms) {
    if (e.kind !== 'alarm' || e.blockId === 'test' || e.fired || e.triggerAt > now - 120_000 || seen.has(`${e.id}@${e.triggerAt}`)) continue;
    seen.add(`${e.id}@${e.triggerAt}`); res.push({ blockId: e.blockId, title: e.title, at: e.triggerAt, cause: likelyCause(p) });
    const b = await db.blocks.get(e.blockId); if (b && b.status === 'planned') await db.blocks.put({ ...b, status: 'missed' });
  }
  await db.kv.put({ key: 'missedSeen', value: [...seen].slice(-200) }); return res;
}
