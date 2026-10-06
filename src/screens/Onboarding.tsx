import { useState } from 'react';
import { db } from '../db/db';
import { useData } from '../state/store';
import { useUI } from '../state/appSettings';
import { savePlan, setDailyHours } from '../state/actions';
import { deleteTree } from '../state/syllabusActions';
import { rescheduleAll } from '../native/alarmSync';
import { navigate } from '../nav';
import ImportSheet from '../components/ImportSheet';
import AlarmHealth from './AlarmHealth';
import { Toaster } from '../components/ui';
import { todayStr } from '../lib/date';

export default function Onboarding() {
  const d = useData(); const { save } = useUI(); const exam = d.exams[0]; const [step, setStep] = useState(0); const [imp, setImp] = useState(false);
  const [name, setName] = useState(exam && !exam.name.startsWith('Sample') ? exam.name : ''); const [date, setDate] = useState(exam?.date ?? '');
  const [hours, setHours] = useState(exam?.dailyHours ?? 4); const [start, setStart] = useState(d.plan.startTime);
  const sample = d.subjects.find(s => s.name.includes('(sample)'));
  const next = async () => {
    if (step === 0 && exam) { await db.exams.put({ ...exam, name: name.trim() || 'My exam', date: date || undefined }); await useData.getState().load(); }
    if (step === 2) { await setDailyHours(hours); await savePlan({ startTime: start }); }
    setStep(step + 1);
  };
  const finish = async () => { await save({ onboarded: true }); rescheduleAll().catch(console.error); navigate('/'); };
  const ok = step !== 0 || name.trim().length > 0;
  return (<main className="min-h-screen p-6 flex flex-col gap-5" style={{ paddingTop: 'calc(24px + env(safe-area-inset-top))' }}>
    <p className="mono text-sm" style={{ color: 'var(--muted)' }}>Step {step + 1} of 4</p>
    {step === 0 && <section className="space-y-4"><h1 className="text-3xl font-semibold">Welcome to StudyForge</h1><p style={{ color: 'var(--muted)' }}>Let's set up your exam. Everything stays on this phone.</p>
      <input className="input" placeholder="Exam name (e.g. Pharm D Year 2)" aria-label="Exam name" value={name} onChange={e => setName(e.target.value)} />
      <label className="block text-sm">Exam date (optional)<input type="date" className="input mt-1" min={todayStr()} value={date} onChange={e => setDate(e.target.value)} /></label></section>}
    {step === 1 && <section className="space-y-4"><h1 className="text-2xl font-semibold">Add your syllabus</h1><p style={{ color: 'var(--muted)' }}>Paste text from the PCI syllabus PDF. You review it before saving.</p>
      <button className="btn btn-accent w-full" onClick={() => setImp(true)}>Paste & import syllabus</button>
      <p className="text-sm mono">{d.subjects.length} subject{d.subjects.length === 1 ? '' : 's'}, {d.topics.length} topics so far</p>
      {sample && d.subjects.length > 1 && <button className="btn w-full" onClick={() => deleteTree('subject', sample.id)}>Remove the sample subject</button>}
      <p className="text-sm" style={{ color: 'var(--muted)' }}>You can skip this and import later from the Syllabus tab.</p>
      {imp && <ImportSheet onClose={() => setImp(false)} />}</section>}
    {step === 2 && <section className="space-y-4"><h1 className="text-2xl font-semibold">Daily study time</h1>
      <label className="block text-sm">Hours per day<input type="number" min={1} max={16} step={0.5} className="input mono mt-1" value={hours} onChange={e => setHours(Math.max(1, +e.target.value || 1))} /></label>
      <label className="block text-sm">Usual start time<input type="time" className="input mt-1" value={start} onChange={e => setStart(e.target.value)} /></label></section>}
    {step === 3 && <section className="space-y-2"><h1 className="text-2xl font-semibold">Make alarms reliable</h1><p style={{ color: 'var(--muted)' }}>Turn every row green so alarms ring over the lock screen.</p><div className="-mx-4"><AlarmHealth /></div></section>}
    <div className="mt-auto flex gap-3">{step > 0 && <button className="btn flex-1" onClick={() => setStep(step - 1)}>Back</button>}
      {step < 3 ? <button className="btn btn-accent flex-1" disabled={!ok} style={{ opacity: ok ? 1 : .5 }} onClick={next}>{step === 1 && d.subjects.length <= 1 ? 'Skip for now' : 'Continue'}</button>
        : <button className="btn btn-accent flex-1" onClick={finish}>Finish</button>}</div>
    <Toaster />
  </main>);
}
