import { useState } from 'react';
import { CheckCircle2, XCircle, Link2, Plus } from 'lucide-react';

// One 800-171A assessment objective row: objective text, satisfying evidence
// types, linked evidence, and Met / Gap controls.
export default function ObjectiveRow({ data, controlEvidence, readOnly, onSetStatus }) {
  const { objective, links, status } = data;
  const [picking, setPicking] = useState(false);

  const linkedIds = new Set(links.map((l) => l.evidence_id).filter(Boolean));
  const linkedItems = controlEvidence.filter((e) => linkedIds.has(e.id));

  const badge =
    status === 'Met' ? 'bg-green-50 text-green-700' :
    status === 'Gap' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500';

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="text-xs font-mono text-slate-500 mt-0.5 flex-shrink-0">{objective.id}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-700 leading-snug">{objective.text}</p>
          <p className="text-[11px] text-slate-400 mt-1">Satisfied by: {objective.evidence.join(', ')}</p>
          {linkedItems.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {linkedItems.map((e) => (
                <span key={e.id} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold">
                  <Link2 className="w-3 h-3" /> {e.evidence_title}
                </span>
              ))}
            </div>
          )}
        </div>
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${badge}`}>{status}</span>
      </div>

      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 mt-2 pl-8">
          <button onClick={() => onSetStatus('Met')} className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 hover:underline">
            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Met
          </button>
          <button onClick={() => onSetStatus('Gap')} className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:underline">
            <XCircle className="w-3.5 h-3.5" /> Mark Gap
          </button>
          {controlEvidence.length > 0 && (
            <div className="relative">
              <button onClick={() => setPicking(!picking)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline">
                <Plus className="w-3.5 h-3.5" /> Link evidence
              </button>
              {picking && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setPicking(false)} />
                  <div className="absolute left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 max-h-52 overflow-y-auto">
                    {controlEvidence.map((e) => (
                      <button key={e.id} onClick={() => { onSetStatus('Met', e.id); setPicking(false); }}
                        disabled={linkedIds.has(e.id)}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-40 truncate">
                        {e.evidence_title}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}