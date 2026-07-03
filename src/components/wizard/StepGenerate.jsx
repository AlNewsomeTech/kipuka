import { PROJECT_MODULES } from '@/lib/projectModules';
import { CheckCircle2 } from 'lucide-react';

export default function StepGenerate({ data, selectedPath }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900">Step 5 — Generate project workspace</h2>
      <p className="text-sm text-slate-500 mt-1 mb-5">
        This creates a new project workspace with the modules below. No data is overwritten and nothing runs automatically.
      </p>

      <div className="rounded-xl border border-slate-200 p-4 mb-4">
        <div className="grid sm:grid-cols-2 gap-y-2 gap-x-6 text-sm">
          <div><span className="text-slate-500">Project name:</span> <span className="font-semibold text-slate-800">{data.project_name || data.legal_name || 'New Project'}</span></div>
          <div><span className="text-slate-500">Selected path:</span> <span className="font-semibold text-slate-800">{selectedPath || '—'}</span></div>
          <div><span className="text-slate-500">UEI:</span> <span className="font-medium text-slate-700">{data.uei || '—'}</span></div>
          <div><span className="text-slate-500">CAGE:</span> <span className="font-medium text-slate-700">{data.primary_cage_code || '—'}</span></div>
        </div>
      </div>

      <div className="text-xs font-semibold text-slate-600 mb-2">Workspace modules</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {PROJECT_MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.key} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
              {m.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}