import { ShieldCheck, AlertTriangle, Info } from 'lucide-react';
import { DETERMINATION_DISCLAIMER } from '@/lib/cmmcDetermination';

const LEVEL_STYLE = {
  'Level 1': { icon: ShieldCheck, cls: 'bg-blue-50 border-blue-200 text-blue-700' },
  'Level 2': { icon: ShieldCheck, cls: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  'Needs Review': { icon: AlertTriangle, cls: 'bg-amber-50 border-amber-200 text-amber-700' },
  'Unknown': { icon: Info, cls: 'bg-slate-50 border-slate-200 text-slate-600' },
};

export default function StepRecommendation({ recommendation }) {
  const { recommended_level, recommended_assessment_path, rationale } = recommendation;
  const style = LEVEL_STYLE[recommended_level] || LEVEL_STYLE['Unknown'];
  const Icon = style.icon;

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900">Step 3 — Recommended CMMC path</h2>
      <p className="text-sm text-slate-500 mt-1 mb-5">Based on your answers, here is a preliminary recommendation.</p>

      <div className={`rounded-xl border p-5 ${style.cls}`}>
        <div className="flex items-center gap-2.5">
          <Icon className="w-6 h-6" />
          <div>
            <div className="text-xs uppercase tracking-wide font-semibold opacity-70">Recommended Level</div>
            <div className="text-xl font-bold">{recommended_level}</div>
          </div>
        </div>
        <div className="mt-3 text-sm">
          <span className="font-semibold">Suggested assessment path:</span> {recommended_assessment_path}
        </div>
        {rationale && <p className="mt-2 text-sm opacity-90 leading-relaxed">{rationale}</p>}
      </div>

      <div className="mt-4 flex items-start gap-2 text-xs text-slate-600 bg-amber-50/60 border border-amber-200/60 rounded-lg px-3 py-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <span>{DETERMINATION_DISCLAIMER}</span>
      </div>
    </div>
  );
}