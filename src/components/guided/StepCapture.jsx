import { useState } from 'react';
import { Camera, Copy, Check, ExternalLink, Maximize2, MapPin, Monitor, Tags, SlidersHorizontal, FileCheck2 } from 'lucide-react';
import { resolveVariant, stackLabel } from '@/lib/implementationStacks';
import { EVIDENCE_FILENAME_FORMAT } from '@/lib/evidenceFilename';
import { buildCaptureItems, CAPTURE_SAFETY_NOTE } from '@/lib/captureInstructions';
import { buildPolicyNames, shouldShowPolicyNames } from '@/lib/policyNaming';
import GuideSection from '@/components/guided/GuideSection';
import GuideList from '@/components/guided/GuideList';
import { PolicyNameChips } from '@/components/guided/PolicyNameList';
import Reveal from '@/components/landing/Reveal';
import StepUpload from '@/components/guided/StepUpload';

const FULL_PAGE_ITEMS = [
  'Tenant, system, or organization name',
  'Complete policy or configuration name',
  'Enabled or enforcement status',
  'Configured values and settings',
  'Assignments, scope, and exclusions',
  'Date or other current-page context when available',
];

// Step 3 CAPTURE & UPLOAD. Repeats the relevant context from Do, gives explicit
// full-page capture guidance, and keeps upload on the same page.
export default function StepCapture({
  project, organization, libEntry, projectStackKey, selectedStack,
  suggestedFilename, filenamePlan, controlId, readOnly, onChanged,
}) {
  const activeKey = selectedStack || projectStackKey;
  const { variant, usedKey } = resolveVariant(libEntry, activeKey);
  const [copied, setCopied] = useState('');

  const filename = suggestedFilename;
  const captureItems = buildCaptureItems(variant, libEntry);
  const policyNames = shouldShowPolicyNames(libEntry, variant)
    ? buildPolicyNames({ organization, project, libEntry, variant })
    : [];

  const copy = (value) => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(value);
      window.setTimeout(() => setCopied(''), 1800);
    });
  };

  let i = 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F1E3C] bg-slate-100 px-2.5 py-1 rounded-full w-fit">
        <Monitor className="w-3.5 h-3.5" /> Capture from: {stackLabel(usedKey)}
      </div>

      <GuideSection
        index={i++}
        tone="brand"
        icon={Camera}
        kicker="Capture and upload evidence"
        lead="Return to the policy or configuration page you used in Do. Confirm you are looking at the correct environment and record before taking the screenshot."
      />

      {(variant?.where_to_go?.name || variant?.setting_to_change) && (
        <div className="grid gap-5 md:grid-cols-2">
          {variant?.where_to_go?.name && (
            <GuideSection index={i++} icon={MapPin} kicker="Evidence source to reopen" title={variant.where_to_go.name}>
              {variant.where_to_go.url && (
                <a href={variant.where_to_go.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:underline">
                  Open <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </GuideSection>
          )}
          {variant?.setting_to_change && (
            <GuideSection index={i++} icon={SlidersHorizontal} kicker="Setting or decision from Do" lead={variant.setting_to_change} />
          )}
        </div>
      )}

      {policyNames.length > 0 && (
        <GuideSection index={i++} tone="accent" icon={Tags} kicker="New item name or existing item to open">
          <PolicyNameChips names={policyNames} showFormat={false} />
          <p className="mt-3 text-sm leading-relaxed text-violet-800">
            Use the generated name only for a new item created today. If an approved item already existed, open it under its current name and record that exact existing name in the evidence.
          </p>
        </GuideSection>
      )}

      <GuideSection
        index={i++}
        tone="info"
        icon={Maximize2}
        kicker="Full-page screenshot"
        title="Take a full-page screenshot of the policy"
        lead="Show the full browser page, not a tightly cropped setting. Expand the policy or configuration details so a reviewer can identify the record and understand how it is applied."
      >
        <GuideList items={FULL_PAGE_ITEMS} textClass="text-blue-950" markerClass="bg-blue-100 text-blue-800" className="sm:grid sm:grid-cols-2 sm:gap-x-6 sm:space-y-0 sm:gap-y-2.5" />
        <p className="mt-5 text-sm font-semibold text-blue-900">
          If the complete policy will not fit on one page, take multiple full-page screenshots with enough overlap to show they belong to the same record.
        </p>
      </GuideSection>

      <GuideSection index={i++} icon={FileCheck2} kicker="Required proof">
        <ol className="grid gap-3 md:grid-cols-2">
          {captureItems.map((item, index) => (
            <li key={`${index}-${item.title}`} className="flex gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <span className="w-9 flex-shrink-0 text-3xl font-black tabular-nums leading-none text-slate-300 select-none">{String(index + 1).padStart(2, '0')}</span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-800 leading-snug">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-1.5">{item.instructions}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900" role="note">
          <span className="font-semibold">Before upload:</span> {CAPTURE_SAFETY_NOTE}
        </div>
      </GuideSection>

      <GuideSection index={i++} tone="dark" kicker="Name your file exactly like this">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-green-400 font-mono text-sm sm:text-base break-all flex-1">{filename}</code>
          <button onClick={() => copy(filename)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 text-white hover:bg-white/20">
            {copied === filename ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied === filename ? 'Copied' : 'Copy filename'}
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-3">Format: {EVIDENCE_FILENAME_FORMAT}</p>
      </GuideSection>

      <Reveal delay={Math.min(i * 0.06, 0.36)}>
        <StepUpload
          project={project}
          libEntry={libEntry}
          variant={variant}
          controlId={controlId}
          suggestedFilename={suggestedFilename}
          filenamePlan={filenamePlan}
          readOnly={readOnly}
          onChanged={onChanged}
        />
      </Reveal>
    </div>
  );
}