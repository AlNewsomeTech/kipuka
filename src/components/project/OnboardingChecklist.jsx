import { CheckCircle2, Circle, ChevronDown, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { WORKFLOW_PHASES } from '@/lib/projectModules';
import { stepLink } from '@/lib/guidanceLinks';

// Phase-based workflow checklist. Implementation & evidence come before
// heavy inventory and final documentation, reflecting the corrected workflow order.
export default function OnboardingChecklist({ checklist = {}, hasHandoff, readOnly, onToggle, projectId }) {
  const phases = WORKFLOW_PHASES.map((p) => ({
    ...p,
    steps: p.steps.filter((s) => !s.tierGated || hasHandoff),
  }));

  const allSteps = phases.flatMap((p) => p.steps);
  const done = allSteps.filter((s) => checklist[s.key]).length;
  const pct = allSteps.length ? Math.round((done / allSteps.length) * 100) : 0;

  const [open, setOpen] = useState(() => phases[0]?.key || null);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-800">Workflow Checklist</h3>
        <span className="text-xs font-semibold text-slate-500">{done}/{allSteps.length} · {pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div className="h-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="space-y-1.5">
        {phases.map((phase) => {
          const pDone = phase.steps.filter((s) => checklist[s.key]).length;
          const isOpen = open === phase.key;
          return (
            <div key={phase.key} className="border border-slate-100 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : phase.key)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 text-left"
              >
                <span className="text-[13px] font-semibold text-slate-700">{phase.title}</span>
                <span className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-400">{pDone}/{phase.steps.length}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                </span>
              </button>
              {isOpen && (
                <div className="px-1.5 py-1 border-t border-slate-100">
                  {phase.steps.map((s) => {
                    const complete = !!checklist[s.key];
                    return (
                      <div key={s.key} className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => onToggle && onToggle(s.key, !complete)}
                          className={`flex-1 flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-[13px] transition-colors ${
                            readOnly ? 'cursor-default' : 'hover:bg-slate-50'
                          }`}
                        >
                          {complete
                            ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                            : <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />}
                          <span className={complete ? 'text-slate-400 line-through' : 'text-slate-700'}>{s.label}</span>
                        </button>
                        {projectId && (
                          <Link
                            to={stepLink(projectId, s.key)}
                            title="Go to this step"
                            className="p-1.5 rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors flex-shrink-0"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}