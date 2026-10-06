import { useState } from 'react';
import type { Block } from '../db/types';
import { mutateBlocks, removeBlock } from '../state/actions';
import { Sheet } from './ui';
export default function BlockSheet({ block, onClose }: { block: Block; onClose: () => void }) {
  const [b, setB] = useState(block);
  return (<Sheet title="Edit block" onClose={onClose}>
    <input className="input" aria-label="Title" value={b.title} onChange={e => setB({ ...b, title: e.target.value })} />
    <input type="date" className="input" aria-label="Date" value={b.date} onChange={e => setB({ ...b, date: e.target.value })} />
    <div className="flex gap-3"><input type="time" className="input" aria-label="Start" value={b.start} onChange={e => setB({ ...b, start: e.target.value })} />
      <input type="number" min={5} step={5} className="input mono" aria-label="Minutes" value={b.durationMin} onChange={e => setB({ ...b, durationMin: Math.max(5, +e.target.value || 5) })} /></div>
    {b.status !== 'planned' && <button className="btn w-full" onClick={() => setB({ ...b, status: 'planned', snoozes: 0 })}>{b.status === 'planned' ? '' : `Status: ${b.status}. Tap to set back to planned`}</button>}
    <div className="flex gap-3"><button className="btn flex-1" style={{ color: 'var(--warn)' }} onClick={() => { removeBlock(block); onClose(); }}>Delete</button>
      <button className="btn btn-accent flex-1" disabled={!b.title.trim()} onClick={async () => { await mutateBlocks({ put: [{ ...b, title: b.title.trim() }] }, 'Block updated'); onClose(); }}>Save</button></div>
  </Sheet>);
}
