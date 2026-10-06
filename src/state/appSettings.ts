import { create } from 'zustand';
import { db } from '../db/db';
export type Theme = 'system' | 'dark' | 'amoled' | 'light';
export interface UISettings { theme: Theme; accent: number; font: 'S' | 'M' | 'L'; weekStart: 0 | 1 | 6; defaultBlockMin: number; onboarded: boolean; autoBackup: boolean; lastBackup: number }
export const UI_DEFAULTS: UISettings = { theme: 'system', accent: 0, font: 'M', weekStart: 1, defaultBlockMin: 45, onboarded: false, autoBackup: true, lastBackup: 0 };
/** l = used in light themes (white text on top, AA); d = used in dark themes (dark text on top, AA). */
export const ACCENTS = [{ name: 'Indigo', l: '#4f46e5', d: '#a5b4fc' }, { name: 'Teal', l: '#0f766e', d: '#5eead4' }, { name: 'Rose', l: '#be123c', d: '#fda4af' },
  { name: 'Amber', l: '#b45309', d: '#fcd34d' }, { name: 'Green', l: '#15803d', d: '#86efac' }, { name: 'Violet', l: '#7e22ce', d: '#d8b4fe' }];
const CACHE = 'sf-ui';
export const cachedUI = (): UISettings => { try { return { ...UI_DEFAULTS, ...JSON.parse(localStorage.getItem(CACHE) || '{}') }; } catch { return UI_DEFAULTS; } };
export function applyTheme(u: UISettings) {
  const r = document.documentElement;
  const dark = u.theme === 'dark' || u.theme === 'amoled' || (u.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  if (u.theme === 'system') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', u.theme);
  const a = ACCENTS[u.accent] ?? ACCENTS[0];
  r.style.setProperty('--accent', dark ? a.d : a.l); r.style.setProperty('--on-accent', dark ? '#0b0d10' : '#ffffff');
  r.style.fontSize = { S: '14px', M: '16px', L: '18px' }[u.font];
}
const persist = (ui: UISettings) => { try { localStorage.setItem(CACHE, JSON.stringify(ui)); } catch { /* ignore */ } };
export const useUI = create<{ ui: UISettings; ready: boolean; load: () => Promise<void>; save: (p: Partial<UISettings>) => Promise<void> }>((set, get) => ({
  ui: cachedUI(), ready: false,
  load: async () => { const r = await db.kv.get('ui'); const ui = { ...UI_DEFAULTS, ...((r?.value as Partial<UISettings>) ?? {}) }; set({ ui, ready: true }); applyTheme(ui); persist(ui); },
  save: async p => { const ui = { ...get().ui, ...p }; set({ ui }); applyTheme(ui); persist(ui); await db.kv.put({ key: 'ui', value: ui }); },
}));
