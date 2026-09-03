import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { POLICY_NAME_FORMAT } from '@/lib/policyNaming';

function useCopy() {
  const [copied, setCopied] = useState('');
  const copy = (value) => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(value);
      window.setTimeout(() => setCopied(''), 1600);
    });
  };
  return [copied, copy];
}

function NameChip({ name, copied, onCopy }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2">
      <code className="min-w-0 flex-1 break-all font-mono text-xs text-green-400">{name.value}</code>
      <button onClick={() => onCopy(name.value)} className="inline-flex flex-shrink-0 items-center gap-1 text-[11px] font-semibold text-white/80 hover:text-white">
        {copied === name.value ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        {copied === name.value ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export function InlineRequiredNames({ names }) {
  const [copied, copy] = useCopy();
  return (
    <div className="mt-3 rounded-lg border border-violet-300 bg-violet-50 p-3">
      <div className="text-[11px] font-bold uppercase tracking-wide text-violet-800 mb-1.5">Required name for this step</div>
      <div className="space-y-1.5">
        {names.map((name) => (
          <div key={name.value}>
            {names.length > 1 && <div className="text-[11px] font-semibold text-violet-700 mb-1">{name.label}</div>}
            <NameChip name={name} copied={copied} onCopy={copy} />
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-violet-800">For a new item, copy this exact value. If this step tells you to edit an existing approved item, keep its current name and record that name in the evidence.</p>
    </div>
  );
}

export function PolicyNameChips({ names, showFormat = true }) {
  const [copied, copy] = useCopy();
  return (
    <div>
      <div className="space-y-3">
        {names.map((name) => (
          <div key={name.value}>
            <div className="text-[11px] font-semibold text-violet-700 mb-1">{name.label}</div>
            <NameChip name={name} copied={copied} onCopy={copy} />
          </div>
        ))}
      </div>
      {showFormat && <p className="text-[11px] text-violet-800 mt-3">Format: {POLICY_NAME_FORMAT}</p>}
    </div>
  );
}