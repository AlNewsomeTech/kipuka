import { useNavigate } from 'react-router-dom';
import { ArrowRight, Target } from 'lucide-react';
import { nextRecommendedControls } from '@/lib/sprsScoring';

// The "Next 5 recommended actions" — highest-SPRS-point unimplemented controls.
export default function NextActionsList({ assessments, projectId }) {
  const navigate = useNavigate();
  const actions = nextRecommendedControls(assessments, 5);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Target className="w-5 h-5 text-[#0F1E3C]" />
        <h3 className="text-sm font-semibold text-slate-800">Next 5 Recommended Actions</h3>
      </div>
      <p className="text-xs text-slate-500 mb-3">Highest-impact controls to raise your SPRS score fastest.</p>

      {actions.length === 0 ? (
        <p className="text-xs text-green-700 py-6 text-center font-medium">All controls are met — great work!</p>
      ) : (
        <div className="space-y-2">
          {actions.map((a, i) => (
            <button
              key={a.short_id}
              onClick={() => projectId && navigate(`/projects/${projectId}/assessment`)}
              className="w-full flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 hover:border-slate-300 hover:bg-slate-50 text-left"
            >
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-800 truncate">
                  {a.control_id}{a.control_title ? ` — ${a.control_title}` : ''}
                </div>
                <div className="text-[11px] text-slate-500">{a.status}</div>
              </div>
              <span className="text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full flex-shrink-0">+{a.points} pts</span>
              <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}