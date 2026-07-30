import { CheckSquare, Square, ShieldCheck, Loader2 } from 'lucide-react';
import { resolveVariant } from '@/lib/implementationStacks';
import { toSimpleStatus } from '@/lib/simpleStatus';

// Step 5 VERIFY — validation_steps as a checklist. When all are checked and the
// user confirms, the ControlAssessment status is written to the "done" status.
export default function StepVerify({ libEntry, projectStackKey, selectedStack, checks, onToggleCheck, onMarkDone, saving, currentStatus }) {
  const activeKey = selectedStack || projectStackKey;
  const { variant } = resolveVariant(libEntry, activeKey);
  const steps = Array.isArray(variant?.validation_steps) ? variant.validation_steps : [];
  const allChecked = steps.length > 0 && steps.every((_, i) => checks[i]);
  const notApplicable = currentStatus === 'Not Applicable';
  const alreadyDone = toSimpleStatus(currentStatus) === 'Done';

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-[#0F1E3C]" />
          <h3 className="text-sm font-bold text-slate-800">Confirm it's working</h3>
        </div>
        {steps.length === 0 ? (
          <p className="text-sm text-slate-500">No specific validation steps are listed for this control. Confirm your configuration is in place, then mark it done below.</p>
        ) : (
          <ul className="space-y-2">
            {steps.map((s, i) => (
              <li key={i}>
                <button onClick={() => onToggleCheck(i)} className="flex items-start gap-2.5 text-left w-full group">
                  {checks[i]
                    ? <CheckSquare className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    : <Square className="w-4 h-4 text-slate-300 mt-0.5 flex-shrink-0 group-hover:text-slate-400" />}
                  <span className={`text-sm leading-relaxed ${checks[i] ? 'text-slate-500 line-through' : 'text-slate-700'}`}>{s}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="text-sm text-green-900">
          {notApplicable
            ? 'This control is documented as Not Applicable. Use the applicability panel above if the scope changes.'
            : alreadyDone
              ? 'This control is marked done. You can move to the next control.'
              : allChecked || steps.length === 0
              ? 'All checks complete — mark this control done.'
              : 'Complete the checklist above to mark this control done.'}
        </div>
        <button
          onClick={onMarkDone}
          disabled={saving || (steps.length > 0 && !allChecked) || alreadyDone || notApplicable}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {notApplicable ? 'Marked Not Applicable' : alreadyDone ? 'Marked Done' : 'Mark Control Done'}
        </button>
      </div>
    </div>
  );
}