import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, GitBranch, ShieldCheck } from 'lucide-react';
import { SCF_DATASET, scfReferencesFor } from '@/lib/scfCrossReferences';

export default function ScfCrossReferencePanel({ controlId, compact = false }) {
  const [expanded, setExpanded] = useState(!compact);
  const references = useMemo(() => scfReferencesFor(controlId), [controlId]);

  if (!references.length) return null;

  const domains = Array.from(new Set(references.map((item) => item.scf_domain).filter(Boolean)));

  return (
    <section className="rounded-xl border border-cyan-200 bg-cyan-50/70 overflow-hidden" aria-labelledby="scf-cross-reference-heading">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-cyan-50"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-800">
            <GitBranch className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 id="scf-cross-reference-heading" className="text-sm font-bold text-slate-900">
              SCF cross-reference
            </h2>
            <p className="text-xs text-slate-600">
              {references.length} mapped {references.length === 1 ? 'control' : 'controls'} across {domains.length} {domains.length === 1 ? 'domain' : 'domains'}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
      </button>

      {expanded && (
        <div className="border-t border-cyan-200 bg-white px-4 py-4">
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              This is an official source cross-reference, not an equivalence decision. Completing the CMMC runbook does not automatically mark an SCF control satisfied. Review the full SCF control scope before using the result in another platform.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {references.map((reference) => (
              <div key={reference.scf_id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-extrabold text-cyan-800">{reference.scf_id}</span>
                  <span className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">{reference.scf_domain}</span>
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-800">{reference.scf_title}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 text-[10px] leading-relaxed text-slate-500">
            {SCF_DATASET.attribution} Dataset {SCF_DATASET.version}. Used unchanged with attribution under {SCF_DATASET.license}.
            {' '}<a className="font-semibold text-cyan-800 hover:underline" href={SCF_DATASET.source_url} target="_blank" rel="noreferrer">View source dataset</a>
          </div>
        </div>
      )}
    </section>
  );
}
