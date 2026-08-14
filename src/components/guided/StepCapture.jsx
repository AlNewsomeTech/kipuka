import { useState } from 'react';
import {
  Camera, Copy, Check, ExternalLink, Maximize2, MapPin, Monitor, Tags,
} from 'lucide-react';
import { resolveVariant, stackLabel } from '@/lib/implementationStacks';
import { EVIDENCE_FILENAME_FORMAT } from '@/lib/evidenceFilename';
import { buildCaptureItems, CAPTURE_SAFETY_NOTE } from '@/lib/captureInstructions';
import { buildPolicyNames, shouldShowPolicyNames } from '@/lib/policyNaming';
import StepUpload from '@/components/guided/StepUpload';

// Step 3 CAPTURE & UPLOAD. Repeats the relevant context from Do, gives explicit
// full-page capture guidance, and keeps upload on the same page.
export default function StepCapture({
  project,
  organization,
  libEntry,
  projectStackKey,
  selectedStack,
  suggestedFilename,
  filenamePlan,
  controlId,
  readOnly,
  onChanged,
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F1E3C] bg-slate-100 px-2.5 py-1 rounded-full w-fit">
        <Monitor className="w-3.5 h-3.5" /> Capture from: {stackLabel(usedKey)}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Camera className="w-4 h-4 text-[#0F1E3C]" />
            <h3 className="text-sm font-bold text-slate-800">Capture and upload evidence</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Return to the policy or configuration page you used in Do. Confirm you are looking at the correct environment and record before taking the screenshot.
          </p>
        </div>

        {variant?.where_to_go?.name && (
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Where to go
            </div>
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

        {policyNames.length > 0 && (
          <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
            <div className="text-xs font-semibold text-violet-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Tags className="w-3.5 h-3.5" /> Policy or configuration to open
            </div>
            <div className="space-y-2">
              {policyNames.map((name) => (
                <div key={name.value}>
                  <div className="text-[11px] font-semibold text-violet-700 mb-1">{name.label}</div>
                  <div className="flex items-center gap-2 bg-slate-950 rounded-lg px-3 py-2">
                    <code className="text-green-400 font-mono text-xs break-all flex-1">{name.value}</code>
                    <button onClick={() => copy(name.value)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/80 hover:text-white flex-shrink-0">
                      {copied === name.value ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied === name.value ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {variant?.setting_to_change && (
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Setting or decision from Do</div>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{variant.setting_to_change}</p>
          </div>
        )}

        <div className="rounded-xl border-2 border-blue-300 bg-blue-50 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-blue-950">
            <Maximize2 className="w-4 h-4" /> Take a full-page screenshot of the policy
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-blue-950">
            Show the full browser page, not a tightly cropped setting. Expand the policy or configuration details so a reviewer can identify the record and understand how it is applied.
          </p>
          <ul className="mt-3 grid gap-1.5 text-[13px] text-blue-950 sm:grid-cols-2">
            <li>• Tenant, system, or organization name</li>
            <li>• Complete policy or configuration name</li>
            <li>• Enabled or enforcement status</li>
            <li>• Configured values and settings</li>
            <li>• Assignments, scope, and exclusions</li>
            <li>• Date or other current-page context when available</li>
          </ul>
          <p className="mt-3 text-xs font-semibold text-blue-900">
            If the complete policy will not fit on one page, take multiple full-page screenshots with enough overlap to show they belong to the same record.
          </p>
        </div>

        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Required proof</div>
          <ol className="space-y-3">
            {captureItems.map((item, index) => (
              <li key={`${index}-${item.title}`} className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="w-6 h-6 rounded-full bg-[#0F1E3C] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{index + 1}</span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800">{item.title}</div>
                  <p className="text-[13px] text-slate-600 leading-relaxed mt-1">{item.instructions}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900" role="note">
          <span className="font-semibold">Before upload:</span> {CAPTURE_SAFETY_NOTE}
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl p-5">
        <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Name your file exactly like this</div>
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-green-400 font-mono text-sm break-all flex-1">{filename}</code>
          <button onClick={() => copy(filename)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 text-white hover:bg-white/20">
            {copied === filename ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied === filename ? 'Copied' : 'Copy filename'}
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">Format: {EVIDENCE_FILENAME_FORMAT}</p>
      </div>

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
    </div>
  );
}
