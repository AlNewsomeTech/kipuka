import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { loadProgressMap } from '@/lib/controlProgress';

// Compact per-client Level 1 / Level 2 status pills for the Clients overview cards.
// Derives a status from ControlProgress completion:
//   0% -> Not Started, 100% -> Complete, otherwise In Progress.
function deriveStatus(complete, total) {
  if (!total || complete === 0) return { label: 'Not Started', cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
  if (complete >= total) return { label: 'Complete', cls: 'bg-green-50 text-green-700', dot: 'bg-green-500' };
  return { label: 'In Progress', cls: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' };
}

export default function ClientLevelStatus({ clientId }) {
  const [levels, setLevels] = useState(null);

  useEffect(() => {
    if (!clientId) return;
    let active = true;
    Promise.all([
      base44.entities.CMMCControl.filter({ level: 'Level 1' }).catch(() => []),
      base44.entities.CMMCControl.filter({ level: 'Level 2' }).catch(() => []),
      loadProgressMap(clientId),
    ]).then(([l1, l2, progress]) => {
      if (!active) return;
      const done = (list) => list.filter((c) => {
        const p = progress[c.control_id];
        return p && (p.status === 'Complete' || p.ready_for_assessment);
      }).length;
      setLevels({
        l1: { complete: done(l1), total: l1.length },
        l2: { complete: done(l2), total: l2.length },
      });
    });
    return () => { active = false; };
  }, [clientId]);

  if (!levels) {
    return <div className="flex flex-col gap-1 items-end"><div className="w-20 h-4 bg-slate-100 rounded animate-pulse" /><div className="w-20 h-4 bg-slate-100 rounded animate-pulse" /></div>;
  }

  const l1 = deriveStatus(levels.l1.complete, levels.l1.total);
  const l2 = deriveStatus(levels.l2.complete, levels.l2.total);

  return (
    <div className="flex flex-col gap-1 items-end">
      <Pill prefix="L1" status={l1} />
      <Pill prefix="L2" status={l2} />
    </div>
  );
}

function Pill({ prefix, status }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold text-[11px] px-2 py-0.5 ${status.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
      <span className="font-bold opacity-70">{prefix}</span>
      {status.label}
    </span>
  );
}