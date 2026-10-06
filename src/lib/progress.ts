import type { Topic } from '../db/types';
const W = { not_started: 0, learning: 0.4, revised: 0.75, mastered: 1 } as const;
export const rollup = (ts: Topic[]) => (ts.length ? ts.reduce((s, t) => s + W[t.status], 0) / ts.length : 0);
export const pct = (n: number) => `${Math.round(n * 100)}%`;
