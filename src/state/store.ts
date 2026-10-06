import { create } from 'zustand';
import { db } from '../db/db';
import type { Block, Category, Chapter, Exam, Subject, Topic } from '../db/types';
export interface PlanSettings { startTime: string; restDays: number[]; bufferDays: number; topicMin: number; revisionMin: number; hour12: boolean; offDays: string[] }
export const PLAN_DEFAULTS: PlanSettings = { startTime: '18:00', restDays: [0], bufferDays: 2, topicMin: 30, revisionMin: 15, hour12: false, offDays: [] };
interface Data { ready: boolean; exams: Exam[]; categories: Category[]; subjects: Subject[]; chapters: Chapter[]; topics: Topic[]; blocks: Block[]; plan: PlanSettings; load: () => Promise<void> }
export const useData = create<Data>(set => ({
  ready: false, exams: [], categories: [], subjects: [], chapters: [], topics: [], blocks: [], plan: PLAN_DEFAULTS,
  load: async () => {
    const [exams, categories, subjects, chapters, topics, blocks, p] = await Promise.all([db.exams.toArray(), db.categories.orderBy('order').toArray(), db.subjects.toArray(), db.chapters.toArray(), db.topics.toArray(), db.blocks.toArray(), db.kv.get('plan')]);
    set({ exams, categories, subjects, chapters, topics, blocks, plan: { ...PLAN_DEFAULTS, ...((p?.value as Partial<PlanSettings>) ?? {}) }, ready: true });
  },
}));
interface Toast { id: number; msg: string; undo?: () => void }
export const useToast = create<{ t: Toast | null; show: (msg: string, undo?: () => void) => void; hide: () => void }>((set, get) => ({
  t: null, hide: () => set({ t: null }),
  show: (msg, undo) => { const id = Date.now(); set({ t: { id, msg, undo } }); setTimeout(() => { if (get().t?.id === id) set({ t: null }); }, 5000); },
}));
