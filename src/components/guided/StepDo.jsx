import { Wrench, ExternalLink, AlertTriangle, UserRound, ClipboardCheck, ListChecks, Tags, MapPin, Target, SlidersHorizontal, ListOrdered, ShieldAlert } from 'lucide-react';
import { STACK_VARIANTS, resolveVariant, stackLabel } from '@/lib/implementationStacks';
import { buildPolicyNames, shouldShowPolicyNames } from '@/lib/policyNaming';
import { cleanRunbookText as cleanWorkspaceCopy, splitInstructions } from '@/lib/steInstructions';
import GuideSection from '@/components/guided/GuideSection';
import GuideList from '@/components/guided/GuideList';
import StepInstruction from '@/components/guided/StepInstruction';
import { InlineRequiredNames, PolicyNameChips } from '@/components/guided/PolicyNameList';
import AutomatedImplementationBanner from '@/components/guided/AutomatedImplementationBanner';

// Step 2 DO — the how_to_implement variant matching the project stack, with a
// stack label + selector to view another stack's instructions.
// Wording is normalized to ASD-STE100 at display time by @/lib/steInstructions.

export default function StepDo({ libEntry, project, organization, projectStackKey, selectedStack, onSelectStack }) {
  const activeKey = selectedStack || projectStackKey;
  const { variant, usedKey, fellBack } = resolveVariant(libEntry, activeKey);
  const availableVariants = STACK_VARIANTS.filter((v) => libEntry?.how_to_implement?.[v.key]);
  const selectorValue = availableVariants.some((v) => v.key === activeKey) ? activeKey : usedKey;
  const policyNames = shouldShowPolicyNames(libEntry, variant)
    ? buildPolicyNames({ organization, project, libEntry, variant })
    : [];

  if (!variant) {
    return <div className="bg-white rounded-xl border border-slate-200 p-5 text-sm text-slate-500">No implementation instructions are available for this control yet.</div>;
  }

  let i = 0;

  return (
    <div className="space-y-5">
      <AutomatedImplementationBanner organization={organization} project={project} controlId={libEntry?.control_id} />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F1E3C] bg-slate-100 px-2.5 py-1 rounded-full">
          <Wrench className="w-3.5 h-3.5" /> Instructions for: {stackLabel(usedKey)}
        </span>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          View another environment:
          <select className="form-input text-xs py-1 w-auto" value={selectorValue || ''} onChange={(e) => onSelectStack(e.target.value)}>
            {availableVariants.map((v) => <option key={v.key} value={v.key}>{v.label}</option>)}
          </select>
        </label>
      </div>

      {fellBack && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-[13px] text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          Specific instructions for that Microsoft environment are not available yet. These steps use the Microsoft 365 Commercial recommended baseline.
        </div>
      )}

      {variant.outcome && (
        <GuideSection index={i++} tone="brand" icon={Target} kicker="What you will finish" lead={cleanWorkspaceCopy(variant.outcome)} center />
      )}

      {(variant.responsible_role || variant.where_to_go?.name) && (
        <div className="grid gap-5 md:grid-cols-2">
          {variant.responsible_role && (
            <GuideSection index={i++} icon={UserRound} kicker="Who should do this" lead={cleanWorkspaceCopy(variant.responsible_role)} />
          )}
          {variant.where_to_go?.name && (
            <GuideSection index={i++} icon={MapPin} kicker="Where to go" title={cleanWorkspaceCopy(variant.where_to_go.name)}>
              {variant.where_to_go.url && (
                <a href={variant.where_to_go.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline">
                  Open <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </GuideSection>
          )}
        </div>
      )}

      {Array.isArray(variant.before_you_start) && variant.before_you_start.length > 0 && (
        <GuideSection index={i++} icon={ListChecks} kicker="Before you start">
          <GuideList items={variant.before_you_start.map(cleanWorkspaceCopy)} />
        </GuideSection>
      )}

      {policyNames.length > 0 && (
        <GuideSection
          index={i++}
          tone="accent"
          icon={Tags}
          kicker="Policy and configuration names"
          lead="When a step tells you to create a new policy, rule, profile, query, group, account, or written procedure, use the exact suggested name below. Do not rename an existing approved item solely for this runbook. Record its current name in the evidence instead."
        >
          <PolicyNameChips names={policyNames} />
        </GuideSection>
      )}

      {Array.isArray(variant.steps) && variant.steps.length > 0 && (
        <GuideSection index={i++} icon={ListOrdered} kicker="Step-by-step">
          <ol className="space-y-3">
            {variant.steps.map((s, idx) => {
              const requiredNames = policyNames.filter((name) => name.stepIndexes?.includes(idx));
              return (
                <StepInstruction key={idx} number={idx + 1} instructions={splitInstructions(s)}>
                  {requiredNames.length > 0 && <InlineRequiredNames names={requiredNames} />}
                </StepInstruction>
              );
            })}
          </ol>
        </GuideSection>
      )}

      {variant.setting_to_change && (
        <GuideSection index={i++} icon={SlidersHorizontal} kicker="Setting or decision to record" lead={cleanWorkspaceCopy(variant.setting_to_change)} />
      )}

      {Array.isArray(variant.kipuka_actions) && variant.kipuka_actions.length > 0 && (
        <GuideSection index={i++} tone="success" icon={ClipboardCheck} kicker="Finish on Capture & Upload">
          <GuideList ordered items={variant.kipuka_actions.map(cleanWorkspaceCopy)} textClass="text-emerald-950" markerClass="bg-emerald-100 text-emerald-800" />
        </GuideSection>
      )}

      {Array.isArray(variant.common_mistakes) && variant.common_mistakes.length > 0 && (
        <GuideSection index={i++} tone="danger" icon={ShieldAlert} kicker="Common mistakes to avoid">
          <GuideList items={variant.common_mistakes.map(cleanWorkspaceCopy)} textClass="text-red-800" markerClass="bg-red-100 text-red-700" />
        </GuideSection>
      )}
    </div>
  );
}