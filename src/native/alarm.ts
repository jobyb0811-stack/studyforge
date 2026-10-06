import { Capacitor, registerPlugin } from '@capacitor/core';
export interface NativeAlarm { id: string; blockId: string; kind: 'alarm' | 'lead'; triggerAt: number; startAt?: number; title: string;
  subject?: string; color?: string; topics?: string[]; more?: number; repeat?: boolean; baseAt?: number; snoozes?: number; fired?: number }
export interface Perms { notifications: boolean; exactAlarm: boolean; fullScreen: boolean; batteryExempt: boolean; sdk: number; manufacturer: string }
export interface PendingAction { id: string; blockId: string; action: 'start' | 'snooze' | 'skip' | 'missed'; minutes: number; reason: string; at: number; snoozes: number; snoozesLeft: number }
export interface AlarmPluginAPI {
  schedule(o: { alarms: NativeAlarm[] }): Promise<{ count: number }>;
  cancel(o: { ids: string[] }): Promise<void>;
  cancelAll(o?: { keepPast?: boolean }): Promise<void>;
  checkPermissions(): Promise<Perms>;
  requestNotifications(): Promise<Perms>;
  openNotificationSettings(): Promise<Perms>;
  openExactAlarmSettings(): Promise<void>;
  openFullScreenSettings(): Promise<void>;
  requestBatteryExemption(): Promise<void>;
  getScheduled(): Promise<{ alarms: NativeAlarm[]; now: number }>;
  getAlarmInfo(o: { blockId: string }): Promise<{ info: NativeAlarm | null }>;
  alarmAction(o: { blockId: string; action: PendingAction['action']; minutes?: number; reason?: string }): Promise<PendingAction>;
  consumePendingActions(): Promise<{ actions: PendingAction[] }>;
  keepAwake(o: { on: boolean }): Promise<void>;
  saveBackup(o: { name: string; data: string }): Promise<{ path: string }>;
  setSound(o: { sound: string }): Promise<{ sound: string }>;
  getSound(): Promise<{ sound: string }>;
  pickRingtone(): Promise<{ sound: string }>;
  addListener(ev: 'alarmAction', fn: (a: PendingAction) => void): Promise<{ remove: () => Promise<void> }>;
}
const okPerms: Perms = { notifications: true, exactAlarm: true, fullScreen: true, batteryExempt: true, sdk: 0, manufacturer: 'web' };
const web: AlarmPluginAPI = {
  schedule: async a => ({ count: a.alarms.length }), cancel: async () => {}, cancelAll: async () => {},
  checkPermissions: async () => okPerms, requestNotifications: async () => okPerms, openNotificationSettings: async () => okPerms,
  openExactAlarmSettings: async () => {}, openFullScreenSettings: async () => {}, requestBatteryExemption: async () => {},
  getScheduled: async () => ({ alarms: [], now: Date.now() }), getAlarmInfo: async () => ({ info: null }),
  alarmAction: async o => ({ id: String(Date.now()), blockId: o.blockId, action: o.action, minutes: o.minutes ?? 5, reason: o.reason ?? '', at: Date.now(), snoozes: 0, snoozesLeft: 3 }),
  saveBackup: async o => ({ path: o.name }), keepAwake: async () => {}, consumePendingActions: async () => ({ actions: [] }), setSound: async o => o, getSound: async () => ({ sound: 'soft' }), pickRingtone: async () => ({ sound: 'soft' }),
  addListener: async () => ({ remove: async () => {} }),
};
export const Alarm = registerPlugin<AlarmPluginAPI>('AlarmPlugin', { web: () => Promise.resolve(web) });
export const isNative = Capacitor.isNativePlatform();
