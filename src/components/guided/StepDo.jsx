import { Wrench, ExternalLink, AlertTriangle, UserRound, ClipboardCheck, ListChecks } from 'lucide-react';
import { STACK_VARIANTS, resolveVariant, stackLabel } from '@/lib/implementationStacks';

// Step 2 DO — the how_to_implement variant matching the project stack, with a
// stack label + selector to view another stack's instructions.
export default function StepDo({ libEntry, projectStackKey, selectedStack, onSelectStack }) {
  const activeKey = selectedStack || projectStackKey;
  const { variant, usedKey, fellBack } = resolveVariant(libEntry, activeKey);

  if (!variant) {
    return <div className="bg-white rounded-xl border border-slate-200 p-5 text-sm text-slate-500">No implementation instructions are available for this control yet.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F1E3C] bg-slate-100 px-2.5 py-1 rounded-full">
          <Wrench className="w-3.5 h-3.5" /> Instructions for: {stackLabel(usedKey)}
        </span>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          View another environment:
          <select
            className="form-input text-xs py-1 w-auto"
            value={activeKey}
            onChange={(e) => onSelectStack(e.target.value)}
          >
            {STACK_VARIANTS.map((v) => (
              <option key={v.key} value={v.key}>{v.label}</option>
            ))}
          </select>
        </label>
      </div>

      {fellBack && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-[13px] text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          Specific instructions for that environment aren't available yet — showing the generic steps that work anywhere.
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        {variant.outcome && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-1">What you will finish</div>
            <p className="text-sm text-blue-950 leading-relaxed">{variant.outcome}</p>
          </div>
        )}

        {variant.responsible_role && (
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <UserRound className="w-3.5 h-3.5" /> Who should do this
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{variant.responsible_role}</p>
          </div>
        )}

        {Array.isArray(variant.before_you_start) && variant.before_you_start.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <ListChecks className="w-3.5 h-3.5" /> Before you start
            </div>
            <ul className="space-y-1.5">
              {variant.before_you_start.map((item, i) => (
                <li key={i} className="text-sm text-slate-700 flex gap-2">
                  <span className="text-slate-400">•</span><span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {variant.where_to_go?.name && (
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Where to go</div>
            <div className="flex items-center gap-2 text-sm text-slate-800">
              {variant.where_to_go.name}
              {variant.where_to_go.url && (
                <a href={variant.where_to_go.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline text-xs">
                  Open <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {Array.isArray(variant.steps) && variant.steps.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Step-by-step</div>
            <ol className="space-y-2">
              {variant.steps.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-700">
                  <span className="w-5 h-5 rounded-full bg-[#0F1E3C] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span className="leading-relaxed">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {variant.setting_to_change && (
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Setting or decision to record</div>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{variant.setting_to_change}</p>
          </div>
        )}

        {Array.isArray(variant.kipuka_actions) && variant.kipuka_actions.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <ClipboardCheck className="w-3.5 h-3.5" /> Finish this step in Kipuka
            </div>
            <ol className="space-y-1.5">
              {variant.kipuka_actions.map((item, i) => (
                <li key={i} className="text-[13px] text-emerald-950 flex gap-2">
                  <span className="font-bold">{i + 1}.</span><span>{item}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {Array.isArray(variant.common_mistakes) && variant.common_mistakes.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-1.5">Common mistakes to avoid</div>
            <ul className="space-y-1">
              {variant.common_mistakes.map((m, i) => (
                <li key={i} className="text-[13px] text-red-800 flex gap-2"><span>•</span>{m}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}