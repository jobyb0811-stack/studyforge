import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useUI, ACCENTS, type UISettings } from '../state/appSettings';
import { useData, useToast } from '../state/store';
import { savePlan, setDailyHours } from '../state/actions';
import { getAlarmSettings, saveAlarmSettings, type AlarmSettings, type DailyKey } from '../native/settings';
import { rescheduleAll } from '../native/alarmSync';
import { copyBackup, importBackup, saveBackupFile } from '../native/backup';
import AlarmHealth from './AlarmHealth';
import { Sheet } from '../components/ui';

function Seg<T extends string | number>({ v, opts, set, label }: { v: T; opts: [T, string][]; set: (v: T) => void; label: string }) {
  return <div role="group" aria-label={label} className="flex gap-2">{opts.map(([k, l]) => <button key={String(k)} aria-pressed={v === k} className={`btn flex-1 ${v === k ? 'btn-accent' : ''}`} style={{ padding: 0 }} onClick={() => set(k)}>{l}</button>)}</div>;
}
const Row = ({ label, children }: { label: string; children: ReactNode }) => <div className="space-y-2"><div className="text-sm font-medium">{label}</div>{children}</div>;
const DAILY: [DailyKey, string][] = [['morning', 'Morning start'], ['review', 'Nightly review'], ['winddown', 'Wind-down']];

export default function Settings() {
  const { ui, save } = useUI(); const d = useData(); const [as, setAs] = useState<AlarmSettings | null>(null); const file = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState<File | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { getAlarmSettings().then(setAs); }, []);
  const upA = async (p: Partial<AlarmSettings>) => { if (!as) return; const n = { ...as, ...p }; setAs(n); await saveAlarmSettings(n); rescheduleAll().catch(console.error); };
  const toast = useToast.getState().show; const hours = d.exams[0]?.dailyHours ?? 4;
  const u = (p: Partial<UISettings>) => save(p);
  return (<main className="p-4 space-y-4">
    <h1 className="text-2xl font-semibold">Settings</h1>
    <section className="card space-y-4"><h2 className="font-semibold">Appearance</h2>
      <Row label="Theme"><Seg v={ui.theme} set={theme => u({ theme })} label="Theme" opts={[['system', 'System'], ['dark', 'Dark'], ['amoled', 'AMOLED'], ['light', 'Light']]} /></Row>
      <Row label="Accent"><div className="flex gap-2" role="group" aria-label="Accent colour">{ACCENTS.map((a, i) => (
        <button key={a.name} aria-label={a.name} aria-pressed={ui.accent === i} onClick={() => u({ accent: i })} className="w-12 h-12 rounded-full text-on font-bold" style={{ background: a.l, outline: ui.accent === i ? '3px solid var(--fg)' : 'none', outlineOffset: 2, color: '#fff' }}>{ui.accent === i ? '✓' : ''}</button>))}</div></Row>
      <Row label="Font size"><Seg v={ui.font} set={font => u({ font })} label="Font size" opts={[['S', 'Small'], ['M', 'Medium'], ['L', 'Large']]} /></Row>
      <Row label="Clock"><Seg v={d.plan.hour12 ? 12 : 24} set={h => savePlan({ hour12: h === 12 })} label="Clock format" opts={[[12, '12-hour'], [24, '24-hour']]} /></Row></section>

    <section className="card space-y-4"><h2 className="font-semibold">Planning</h2>
      <Row label="Week starts on"><Seg v={ui.weekStart} set={weekStart => u({ weekStart })} label="Week start" opts={[[1, 'Mon'], [0, 'Sun'], [6, 'Sat']]} /></Row>
      <Row label="Default block length (min)"><input type="number" min={5} step={5} className="input mono" value={ui.defaultBlockMin} onChange={e => u({ defaultBlockMin: Math.max(5, +e.target.value || 5) })} /></Row>
      <Row label="Default minutes per topic"><input type="number" min={10} step={5} className="input mono" value={d.plan.topicMin} onChange={e => savePlan({ topicMin: Math.max(10, +e.target.value || 10) })} /></Row>
      <Row label="Daily study hours"><input type="number" min={1} max={16} step={0.5} className="input mono" value={hours} onChange={e => setDailyHours(Math.max(1, +e.target.value || 1))} /></Row></section>

    {as && <section className="card space-y-4"><h2 className="font-semibold">Alarms</h2>
      <Row label="Calm reminder before each block"><Seg v={as.leadMin} set={leadMin => upA({ leadMin })} label="Lead time" opts={[[0, 'Off'], [5, '5m'], [10, '10m'], [15, '15m'], [30, '30m']]} /></Row>
      <Row label="Quiet hours (silences calm reminders; block alarms still ring)"><div className="flex gap-2 items-center">
        <button aria-pressed={as.quiet.on} className={`btn ${as.quiet.on ? 'btn-accent' : ''}`} onClick={() => upA({ quiet: { ...as.quiet, on: !as.quiet.on } })}>{as.quiet.on ? 'On' : 'Off'}</button>
        <input type="time" aria-label="Quiet from" className="input" value={as.quiet.start} onChange={e => upA({ quiet: { ...as.quiet, start: e.target.value } })} /><span>–</span>
        <input type="time" aria-label="Quiet until" className="input" value={as.quiet.end} onChange={e => upA({ quiet: { ...as.quiet, end: e.target.value } })} /></div></Row>
      <Row label="Daily alarms">{DAILY.map(([k, l]) => (<div key={k} className="flex items-center gap-2"><button aria-pressed={as.daily[k].on} className={`btn flex-1 ${as.daily[k].on ? 'btn-accent' : ''}`} onClick={() => upA({ daily: { ...as.daily, [k]: { ...as.daily[k], on: !as.daily[k].on } } })}>{as.daily[k].on ? '✓ ' : ''}{l}</button>
        <input type="time" aria-label={`${l} time`} className="input" style={{ width: 120 }} value={as.daily[k].time} onChange={e => upA({ daily: { ...as.daily, [k]: { ...as.daily[k], time: e.target.value } } })} /></div>))}</Row></section>}

    <AlarmHealth />

    <section className="card space-y-3"><h2 className="font-semibold">Backup</h2>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>Everything stays on this phone. Back up before changing phones.</p>
      <button className="btn btn-accent w-full" disabled={busy} onClick={async () => { setBusy(true); try { const p = await saveBackupFile(); await save({ lastBackup: Date.now() }); toast(`Saved: ${p}`); } catch (e) { toast('Backup failed'); } setBusy(false); }}>Export backup (JSON)</button>
      <button className="btn w-full" onClick={async () => { try { await copyBackup(); toast('Backup copied to clipboard'); } catch { toast('Copy failed'); } }}>Copy backup to clipboard</button>
      <button className="btn w-full" onClick={() => file.current?.click()}>Import backup…</button>
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) setConfirm(f); e.target.value = ''; }} />
      <button aria-pressed={ui.autoBackup} className={`btn w-full ${ui.autoBackup ? 'btn-accent' : ''}`} onClick={() => u({ autoBackup: !ui.autoBackup })}>{ui.autoBackup ? '✓ ' : ''}Weekly auto-backup to Downloads/StudyForge</button>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>Last backup: {ui.lastBackup ? new Date(ui.lastBackup).toLocaleString() : 'never'}</p></section>
    {confirm && <Sheet title="Replace all data?" onClose={() => setConfirm(null)}>
      <p>This replaces everything with “{confirm.name}”. You get 5 seconds to undo afterwards.</p>
      <div className="flex gap-3"><button className="btn flex-1" onClick={() => setConfirm(null)}>Cancel</button>
        <button className="btn btn-accent flex-1" onClick={async () => { const f = confirm; setConfirm(null); try { await importBackup(f); setAs(await getAlarmSettings()); } catch { toast('Not a valid StudyForge backup'); } }}>Replace</button></div></Sheet>}
  </main>);
}
