import { CheckSquare, Square, ShieldCheck, Loader2 } from 'lucide-react';
import { resolveVariant } from '@/lib/implementationStacks';
import { toSimpleStatus } from '@/lib/simpleStatus';
import { validNotApplicable } from '@/lib/canonicalReadiness';

// Step 5 VERIFY checks implementation progress. Finishing this step does not
// accept evidence or create an assessor objective finding.
export default function StepVerify({ libEntry, projectStackKey, selectedStack, checks, onToggleCheck, onMarkDone, saving, savingChecks, readOnly, assessment, currentStatus, error }) {
  const activeKey = selectedStack || projectStackKey;
  const { variant } = resolveVariant(libEntry, activeKey);
  const steps = Array.isArray(variant?.validation_steps) ? variant.validation_steps : [];
  const allChecked = steps.length > 0 && steps.every((_, i) => checks[i]);
  const notApplicable = currentStatus === 'Not Applicable';
  const approvedNotApplicable = validNotApplicable(assessment);
  const alreadyDone = toSimpleStatus(assessment || currentStatus) === 'Done';

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
                <button
                  onClick={() => onToggleCheck(i)}
                  disabled={readOnly || savingChecks}
                  aria-pressed={!!checks[i]}
                  className="flex items-start gap-2.5 text-left w-full group disabled:cursor-not-allowed disabled:opacity-60"
                >
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

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm font-semibold text-red-800">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="text-sm text-green-900">
          {readOnly
            ? 'Your access is read-only. You can review these checks, but an authorized project member must save them and finish implementation.'
            : notApplicable
            ? approvedNotApplicable
              ? 'This control has an independently approved Not Applicable decision. Use the applicability panel above if the scope changes.'
              : 'This legacy Not Applicable label is not approved and does not count as complete. Use the applicability panel above.'
            : alreadyDone
              ? 'The implementation step is finished. Evidence acceptance and objective assessment remain separate.'
              : allChecked || steps.length === 0
              ? 'All checks complete. Finish the implementation step; evidence and objective review remain separate.'
              : 'Complete the checklist above before finishing the implementation step.'}
        </div>
        <button
          onClick={onMarkDone}
          disabled={readOnly || saving || savingChecks || (steps.length > 0 && !allChecked) || alreadyDone || notApplicable}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          {readOnly ? 'Read-only access' : notApplicable ? approvedNotApplicable ? 'Approved Not Applicable' : 'N/A Review Required' : alreadyDone ? 'Implementation Finished' : savingChecks ? 'Saving checklist…' : 'Finish Implementation Step'}
        </button>
      </div>
    </div>
  );
}