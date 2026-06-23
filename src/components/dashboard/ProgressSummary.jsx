import { ShieldCheck, Layers, ListChecks, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import ProgressBar from '@/components/ProgressBar';

export default function ProgressSummary({ l1Controls, l2Controls, tasks }) {
  const l1Complete = l1Controls.filter(c => c.status === 'Complete' || c.ready_for_assessment).length;
  const l2Complete = l2Controls.filter(c => c.status === 'Complete' || c.ready_for_assessment).length;
  const tasksComplete = tasks.filter(t => t.status === 'Complete').length;
  const tasksRemaining = tasks.length - tasksComplete;

  const today = new Date().toISOString().split('T')[0];
  const overdue = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'Complete');
  const blockers = tasks.filter(t => t.status === 'Blocker');
  const fallingBehind = overdue.length > 0 || blockers.length > 0;

  const overallPct = tasks.length ? (tasksComplete / tasks.length) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-[#0F1E3C]" />
          <h3 className="text-sm font-semibold text-slate-800">Progress Summary</h3>
        </div>
        {fallingBehind && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded-full">
            <AlertTriangle className="w-3.5 h-3.5" /> Falling Behind
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Metric icon={ShieldCheck} label="L1 Controls" complete={l1Complete} total={l1Controls.length} color="green" />
        <Metric icon={Layers} label="Level 2 Controls" complete={l2Complete} total={l2Controls.length} color="amber" />
        <Metric icon={ListChecks} label="Tasks Done" complete={tasksComplete} total={tasks.length} color="blue" />
        <Metric icon={Clock} label="Remaining" complete={tasksRemaining} total={tasks.length} color="navy" raw />
      </div>

      <div className="space-y-3">
        <div>
          <ProgressBar value={overallPct} color="navy" size="md" label="Overall Task Completion" />
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <ProgressBar value={l1Controls.length ? (l1Complete / l1Controls.length) * 100 : 0} color="green" size="sm" label="Level 1 Controls" />
          <ProgressBar value={l2Controls.length ? (l2Complete / l2Controls.length) * 100 : 0} color="amber" size="sm" label="Level 2 Controls" />
        </div>
      </div>

      {(overdue.length > 0 || blockers.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {overdue.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-red-700 bg-red-50 px-2.5 py-1 rounded-lg">
              <Clock className="w-3.5 h-3.5" /> {overdue.length} overdue task{overdue.length !== 1 ? 's' : ''}
            </span>
          )}
          {blockers.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-red-700 bg-red-50 px-2.5 py-1 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5" /> {blockers.length} blocker{blockers.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, complete, total, color, raw }) {
  const colorMap = {
    green: 'text-green-600 bg-green-50',
    amber: 'text-amber-600 bg-amber-50',
    blue: 'text-blue-600 bg-blue-50',
    navy: 'text-[#0F1E3C] bg-slate-100',
  };
  const pct = total ? Math.round((complete / total) * 100) : 0;
  return (
    <div className="border border-slate-200 rounded-lg p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-lg font-bold text-slate-900">
        {raw ? `${complete}` : `${complete}/${total}`}
      </div>
      {!raw && <div className="text-[10px] text-slate-400">{pct}% complete</div>}
    </div>
  );
}