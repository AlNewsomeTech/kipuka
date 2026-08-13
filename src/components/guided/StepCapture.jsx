import { useState } from 'react';
import { Camera, Copy, Check } from 'lucide-react';
import { resolveVariant } from '@/lib/implementationStacks';
import { EVIDENCE_FILENAME_FORMAT } from '@/lib/evidenceFilename';
import { buildCaptureItems, CAPTURE_SAFETY_NOTE } from '@/lib/captureInstructions';

// Step 3 CAPTURE — screenshot instructions + exact expected filename with copy button.
export default function StepCapture({ libEntry, projectStackKey, selectedStack, suggestedFilename }) {
  const activeKey = selectedStack || projectStackKey;
  const { variant } = resolveVariant(libEntry, activeKey);
  const [copied, setCopied] = useState(false);

  const filename = suggestedFilename;
  const captureItems = buildCaptureItems(variant, libEntry);

  const copy = () => {
    navigator.clipboard?.writeText(filename).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Camera className="w-4 h-4 text-[#0F1E3C]" />
          <h3 className="text-sm font-bold text-slate-800">What to capture</h3>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          Collect every proof item below. Use a separate screenshot, export, document, diagram, or test record unless one artifact clearly proves multiple items.
        </p>
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
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900" role="note">
          <span className="font-semibold">Before upload:</span> {CAPTURE_SAFETY_NOTE}
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl p-5">
        <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">Name your file exactly like this</div>
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-green-400 font-mono text-sm break-all flex-1">{filename}</code>
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 text-white hover:bg-white/20"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy filename'}
          </button>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">Format: {EVIDENCE_FILENAME_FORMAT}</p>
      </div>
    </div>
  );
}