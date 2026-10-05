import { useEffect, useState } from 'react';
import { Alarm } from '../native/alarm';
import { useAlarmHealth } from '../native/useAlarmHealth';
import { OEM_GUIDES } from '../native/oem';
import { detectMissed, readTestLogs, resolveTestLogs, runTestAlarm, type Missed, type TestLog } from '../native/alarmSync';

export function AlarmScoreBanner({ onOpen }: { onOpen?: () => void }) {
  const { score, total, allGreen, perms } = useAlarmHealth();
  if (!perms || allGreen) return null;
  return (<button onClick={onOpen} className="w-full text-left p-4 rounded-[18px] min-h-[48px]" style={{ background: 'var(--card)', color: 'var(--warn)' }}>
    <span aria-hidden>⚠ </span><b>Alarm Health {score}/{total}</b> — alarms may not ring. Tap to fix.</button>);
}

export default function AlarmHealth() {
  const { perms, refresh, score, total } = useAlarmHealth();
  const [logs, setLogs] = useState<TestLog[]>([]); const [missed, setMissed] = useState<Missed[]>([]); const [sound, setSound] = useState('soft');
  const loadLogs = async () => setLogs(await resolveTestLogs());
  useEffect(() => { readTestLogs().then(setLogs); loadLogs(); detectMissed().then(setMissed); Alarm.getSound().then(r => setSound(r.sound));
    const t = setInterval(loadLogs, 5000); return () => clearInterval(t); }, []);
  if (!perms) return <div className="p-4 opacity-60">Checking…</div>;
  const fixNotif = async () => { const r = await Alarm.requestNotifications(); if (!r.notifications) await Alarm.openNotificationSettings(); refresh(); };
  const rows = [
    { label: 'Notifications', ok: perms.notifications, fix: fixNotif },
    { label: 'Exact alarms', ok: perms.exactAlarm, fix: () => Alarm.openExactAlarmSettings() },
    { label: 'Full-screen alerts (lock screen)', ok: perms.fullScreen, fix: () => Alarm.openFullScreenSettings() },
    { label: 'Battery exemption', ok: perms.batteryExempt, fix: () => Alarm.requestBatteryExemption() },
  ];
  const pick = async (s: string) => { const r = s === 'device' ? await Alarm.pickRingtone() : await Alarm.setSound({ sound: s }); setSound(r.sound); };
  return (
    <section className="p-4 space-y-4">
      <h2 className="text-xl font-semibold">Alarm Health <span className="mono" style={{ color: score === total ? 'var(--ok)' : 'var(--warn)' }}>{score}/{total}</span></h2>
      {missed.map(m => (<div key={m.blockId + m.at} className="p-4 rounded-[18px]" style={{ background: 'var(--card)', color: 'var(--warn)' }}>
        <span aria-hidden>⚠ </span>Missed alarm: <b>{m.title}</b> at {new Date(m.at).toLocaleString()}. {m.cause}</div>))}
      <ul className="space-y-2">{rows.map(r => (
        <li key={r.label} className="flex items-center justify-between gap-3 p-4 rounded-[18px]" style={{ background: 'var(--card)' }}>
          <span style={{ color: r.ok ? 'var(--ok)' : 'var(--warn)' }}><span aria-hidden>{r.ok ? '✓' : '⚠'}</span> {r.label}<span className="sr-only">{r.ok ? ' ready' : ' needs fixing'}</span></span>
          {!r.ok && <button className="btn btn-accent" onClick={async () => { await r.fix(); refresh(); }}>Fix</button>}
        </li>))}</ul>
      <div className="p-4 rounded-[18px] space-y-3" style={{ background: 'var(--card)' }}>
        <b>Alarm sound</b>
        <div className="flex flex-wrap gap-2">{['soft', 'beep', 'rise'].map(s => (
          <button key={s} className={`btn ${sound === s ? 'btn-accent' : ''}`} onClick={() => pick(s)}>{s}</button>))}
          <button className={`btn ${sound.startsWith('uri:') ? 'btn-accent' : ''}`} onClick={() => pick('device')}>Device tone…</button></div>
      </div>
      <div className="p-4 rounded-[18px] space-y-3" style={{ background: 'var(--card)' }}>
        <b>Test alarm</b>
        <button className="btn btn-accent w-full" onClick={async () => { await runTestAlarm(); loadLogs(); }}>Test alarm in 1 minute</button>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Lock your phone after tapping. It should ring and light the screen.</p>
        {logs.slice().reverse().map(l => (<div key={l.scheduledAt} className="text-sm mono">
          {new Date(l.triggerAt).toLocaleTimeString()} — {l.result === 'fired' ? `✓ fired (+${Math.round((l.delayMs ?? 0) / 1000)}s)` : l.result === 'pending' ? '… waiting' : `⚠ did not fire. ${l.cause ?? ''}`}</div>))}
      </div>
      <details className="p-4 rounded-[18px]" style={{ background: 'var(--card)' }} open={OEM_GUIDES.some(g => g.match.includes(perms.manufacturer))}>
        <summary className="font-semibold min-h-[48px] flex items-center">Phone-maker autostart guide</summary>
        {OEM_GUIDES.map(g => (<div key={g.id} className="mt-3"><b>{g.name}{g.match.includes(perms.manufacturer) ? ' (your phone)' : ''}</b>
          <ol className="list-decimal pl-5 text-sm space-y-1 mt-1">{g.steps.map(s => <li key={s}>{s}</li>)}</ol></div>))}
      </details>
    </section>);
}
