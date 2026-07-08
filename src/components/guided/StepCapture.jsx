import { useState } from 'react';
import { Camera, Copy, Check } from 'lucide-react';
import { resolveVariant } from '@/lib/implementationStacks';

// Step 3 CAPTURE — screenshot instructions + exact expected filename with copy button.
export default function StepCapture({ libEntry, projectStackKey, selectedStack }) {
  const activeKey = selectedStack || projectStackKey;
  const { variant } = resolveVariant(libEntry, activeKey);
  const [copied, setCopied] = useState(false);

  // Build the concrete expected filename from the naming pattern, filling today's date.
  const today = new Date().toISOString().slice(0, 10);
  const pattern = variant?.screenshot_naming || `${libEntry.control_id}_ToolName_Description_YYYY-MM-DD`;
  const filename = pattern.replace('YYYY-MM-DD', today);

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
        <p className="text-sm text-slate-700 leading-relaxed">
          {variant?.screenshot_instructions || `Capture evidence showing ${libEntry.control_id} is implemented.`}
        </p>
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
        <p className="text-[11px] text-slate-400 mt-2">Format: CONTROLID_ToolName_Description_YYYY-MM-DD</p>
      </div>
    </div>
  );
}