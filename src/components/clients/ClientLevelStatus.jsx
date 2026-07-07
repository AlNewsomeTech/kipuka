import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { resolveProjectIdForClient } from '@/lib/clientProject';

// Statuses that count a control as "done" for the overview pills. These are the
// ControlAssessment statuses ControlDetail writes when a control is marked
// Complete / Reviewed / Ready for Assessment (the single source of truth).
const DONE_STATUSES = ['Ready for Assessment', 'Ready for Documentation', 'Implemented', 'Evidence Accepted'];

// Compact per-client Level 1 / Level 2 status pills for the Clients overview cards.
// Derives a status from ControlAssessment completion:
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
    (async () => {
      const [l1, l2] = await Promise.all([
        base44.entities.CMMCControl.filter({ level: 'Level 1' }).catch(() => []),
        base44.entities.CMMCControl.filter({ level: 'Level 2' }).catch(() => []),
      ]);
      const projectId = await resolveProjectIdForClient(clientId);
      const assessments = projectId
        ? await base44.entities.ControlAssessment.filter({ project_id: projectId }).catch(() => [])
        : [];
      if (!active) return;
      const doneByControl = {};
      assessments.forEach((a) => { if (DONE_STATUSES.includes(a.status)) doneByControl[a.control_id] = true; });
      const done = (list) => list.filter((c) => doneByControl[c.control_id]).length;
      setLevels({
        l1: { complete: done(l1), total: l1.length },
        l2: { complete: done(l2), total: l2.length },
      });
    })();
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