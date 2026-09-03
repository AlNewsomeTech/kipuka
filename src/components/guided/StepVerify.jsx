import { CheckSquare, Square, ShieldCheck, Loader2 } from 'lucide-react';
import { resolveVariant } from '@/lib/implementationStacks';
import { toSimpleStatus } from '@/lib/simpleStatus';
import { validNotApplicable } from '@/lib/canonicalReadiness';
import GuideSection from '@/components/guided/GuideSection';
import Reveal from '@/components/landing/Reveal';

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
  const doneCount = steps.filter((_, i) => checks[i]).length;

  return (
    <div className="space-y-5">
      <GuideSection index={0} icon={ShieldCheck} kicker="Confirm it's working" title={steps.length > 0 ? `${doneCount} of ${steps.length} checks complete` : undefined}>
        {steps.length === 0 ? (
          <p className="text-base text-slate-600 leading-relaxed">No specific validation steps are listed for this control. Confirm your configuration is in place, then mark it done below.</p>
        ) : (
          <ul className="grid gap-2.5 md:grid-cols-2">
            {steps.map((s, i) => (
              <li key={i}>
                <button
                  onClick={() => onToggleCheck(i)}
                  disabled={readOnly || savingChecks}
                  aria-pressed={!!checks[i]}
                  className={`flex items-start gap-3 text-left w-full group rounded-xl border p-4 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${checks[i] ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
                >
                  {checks[i]
                    ? <CheckSquare className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    : <Square className="w-5 h-5 text-slate-300 mt-0.5 flex-shrink-0 group-hover:text-slate-400" />}
                  <span className={`text-[15px] leading-relaxed ${checks[i] ? 'text-slate-500 line-through' : 'text-slate-700'}`}>{s}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </GuideSection>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm font-semibold text-red-800">
          {error}
        </div>
      )}

      <Reveal delay={0.12}>
        <div className="flex items-center justify-between flex-wrap gap-4 bg-green-50 border border-green-200 rounded-2xl p-6 sm:p-8">
          <p className="text-base text-green-900 leading-relaxed flex-1 min-w-[16rem]">
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
          </p>
          <button
            onClick={onMarkDone}
            disabled={readOnly || saving || savingChecks || (steps.length > 0 && !allChecked) || alreadyDone || notApplicable}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {readOnly ? 'Read-only access' : notApplicable ? approvedNotApplicable ? 'Approved Not Applicable' : 'N/A Review Required' : alreadyDone ? 'Implementation Finished' : savingChecks ? 'Saving checklist…' : 'Finish Implementation Step'}
          </button>
        </div>
      </Reveal>
    </div>
  );
}