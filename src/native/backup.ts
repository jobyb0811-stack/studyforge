import { storage } from '../db/storage';
import { Alarm, isNative } from './alarm';
import { rescheduleAll } from './alarmSync';
import { todayStr } from '../lib/date';
import { useData, useToast } from '../state/store';
import { useUI } from '../state/appSettings';

export async function saveBackupFile(prefix = 'studyforge-backup'): Promise<string> {
  const data = await storage.exportJSON(); const name = `${prefix}-${todayStr()}.json`;
  if (isNative) return (await Alarm.saveBackup({ name, data })).path;
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' })); a.download = name; a.click(); URL.revokeObjectURL(a.href); return name;
}
export const copyBackup = async () => navigator.clipboard.writeText(await storage.exportJSON());
/** Weekly auto-backup: runs on app open (native only), at most once per 7 days. */
export async function autoBackupIfDue() {
  const { ui, save } = useUI.getState(); if (!isNative || !ui.autoBackup || Date.now() - ui.lastBackup < 7 * 864e5) return;
  try { await saveBackupFile('studyforge-auto'); await save({ lastBackup: Date.now() }); } catch (e) { console.error('auto-backup failed', e); }
}
const reloadAll = async () => { await useUI.getState().load(); await useData.getState().load(); await rescheduleAll(); };
export async function importBackup(file: File) {
  const text = await file.text(); const snapshot = await storage.exportJSON();
  await storage.importJSON(text); await reloadAll();
  useToast.getState().show('Backup restored', async () => { await storage.importJSON(snapshot); await reloadAll(); });
}
