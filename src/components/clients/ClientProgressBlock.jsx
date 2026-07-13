import { useState, useEffect } from 'react';
import { Eye, ShieldCheck, Layers, Image, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { loadCompletedControlIds } from '@/lib/clientControlCompletion';
import ProgressBar from '@/components/ProgressBar';

export default function ClientProgressBlock({ clientId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!clientId) return;
    setData(null);
    Promise.all([
      base44.entities.CMMCControl.filter({ level: 'Level 1' }).catch(() => []),
      base44.entities.CMMCControl.filter({ level: 'Level 2' }).catch(() => []),
      base44.entities.DeploymentTask.filter({ client_id: clientId }).catch(() => []),
      base44.entities.Screenshot.filter({ client_id: clientId }).catch(() => []),
      base44.entities.EvidenceItem.filter({ client_id: clientId }).catch(() => []),
      loadCompletedControlIds(clientId),
    ]).then(([l1, l2, tasks, screenshots, evidence, doneIds]) => {
      setData({
        l1, l2, doneIds,
        tasks, evidenceCount: screenshots.length + evidence.length,
      });
    });
  }, [clientId]);

  if (!data) {
    return <div className="bg-white rounded-xl border border-slate-200 p-8 flex justify-center"><div className="w-6 h-6 border-4 border-slate-200 border-t-[#0F1E3C] rounded-full animate-spin" /></div>;
  }

  const l1Complete = data.l1.filter((c) => data.doneIds.has(c.control_id)).length;
  const l1Pct = data.l1.length ? (l1Complete / data.l1.length) * 100 : 0;
  const l2Complete = data.l2.filter((c) => data.doneIds.has(c.control_id)).length;
  const l2Pct = data.l2.length ? (l2Complete / data.l2.length) * 100 : 0;
  const currentPhase = data.tasks.find((t) => t.status === 'In Progress')?.phase || 'Not Started';
  const openTasks = data.tasks.filter((t) => t.status !== 'Complete' && t.status !== 'Reviewed').length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-[#0F1E3C]" />
          <h3 className="text-sm font-semibold text-slate-800">Deployment Progress</h3>
        </div>
        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">Read-only view</span>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg border border-slate-200 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0"><Clock className="w-4 h-4 text-slate-500" /></div>
          <div className="min-w-0"><p className="text-[10px] text-slate-500">Current Phase</p><p className="text-xs font-semibold text-slate-800 truncate">{currentPhase}</p></div>
        </div>
        <div className="rounded-lg border border-slate-200 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0"><Image className="w-4 h-4 text-blue-600" /></div>
          <div className="min-w-0"><p className="text-[10px] text-slate-500">Evidence Items</p><p className="text-xs font-semibold text-slate-800">{data.evidenceCount}</p></div>
        </div>
        <div className="rounded-lg border border-slate-200 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0"><Clock className="w-4 h-4 text-amber-600" /></div>
          <div className="min-w-0"><p className="text-[10px] text-slate-500">Open Tasks</p><p className="text-xs font-semibold text-slate-800">{openTasks}</p></div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2"><ShieldCheck className="w-4 h-4 text-green-600" /><span className="text-xs font-semibold text-slate-700">CMMC Level 1</span><span className="text-[10px] text-slate-400">{l1Complete}/{data.l1.length} controls</span></div>
          <ProgressBar value={l1Pct} color="green" size="md" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2"><Layers className="w-4 h-4 text-amber-600" /><span className="text-xs font-semibold text-slate-700">CMMC Level 2</span><span className="text-[10px] text-slate-400">{l2Complete}/{data.l2.length} controls</span></div>
          <ProgressBar value={l2Pct} color="amber" size="md" />
        </div>
      </div>
    </div>
  );
}