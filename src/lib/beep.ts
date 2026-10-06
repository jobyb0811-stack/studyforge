let ctx: AudioContext | undefined;
const make = () => (ctx ??= new (window.AudioContext || (window as any).webkitAudioContext)());
/** Call from a tap so the browser lets later beeps play. */
export const unlockAudio = () => { try { make().resume(); } catch { /* ignore */ } };
export function beep(times = 3) {
  try { const c = make(); for (let i = 0; i < times; i++) { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = 880; o.connect(g); g.connect(c.destination);
    const t = c.currentTime + i * 0.35; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25); o.start(t); o.stop(t + 0.3); } } catch { /* ignore */ }
}
