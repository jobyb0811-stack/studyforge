import { db } from '../db/db';
export type DailyKey = 'morning' | 'review' | 'winddown';
export interface AlarmSettings { leadMin: number; sound: string; quiet: { on: boolean; start: string; end: string }; daily: Record<DailyKey, { on: boolean; time: string }> }
export const ALARM_DEFAULTS: AlarmSettings = { leadMin: 10, sound: 'soft', quiet: { on: false, start: '23:00', end: '06:00' },
  daily: { morning: { on: false, time: '06:30' }, review: { on: false, time: '21:30' }, winddown: { on: false, time: '22:30' } } };
export async function getAlarmSettings(): Promise<AlarmSettings> {
  const r = await db.kv.get('alarmSettings'); const v = (r?.value as Partial<AlarmSettings>) ?? {};
  return { ...ALARM_DEFAULTS, ...v, daily: { ...ALARM_DEFAULTS.daily, ...v.daily }, quiet: { ...ALARM_DEFAULTS.quiet, ...v.quiet } };
}
export const saveAlarmSettings = (v: AlarmSettings) => db.kv.put({ key: 'alarmSettings', value: v });
