import { db } from '../db/db';
export type DailyKey = 'morning' | 'review' | 'winddown';
export interface AlarmSettings { leadMin: number; sound: string; daily: Record<DailyKey, { on: boolean; time: string }> }
export const ALARM_DEFAULTS: AlarmSettings = { leadMin: 10, sound: 'soft',
  daily: { morning: { on: false, time: '06:30' }, review: { on: false, time: '21:30' }, winddown: { on: false, time: '22:30' } } };
export async function getAlarmSettings(): Promise<AlarmSettings> {
  const r = await db.kv.get('alarmSettings'); return { ...ALARM_DEFAULTS, ...((r?.value as Partial<AlarmSettings>) ?? {}) };
}
export const saveAlarmSettings = (v: AlarmSettings) => db.kv.put({ key: 'alarmSettings', value: v });
