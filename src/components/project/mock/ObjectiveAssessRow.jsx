import { useState } from 'react';
import { FileText, Paperclip, ChevronDown, CheckCircle2, XCircle, MinusCircle, PlusCircle } from 'lucide-react';
import { stripHtml } from '@/lib/reportBranding';
import { VERDICTS } from '@/lib/mockAssessment';

const VERDICT_META = {
  'Met': { icon: CheckCircle2, cls: 'bg-green-600 text-white', ring: 'ring-green-500' },
  'Not Met': { icon: XCircle, cls: 'bg-red-600 text-white', ring: 'ring-red-500' },
  'Not Applicable': { icon: MinusCircle, cls: 'bg-slate-500 text-white', ring: 'ring-slate-400' },
};

// One assessment objective, presented the way a C3PAO would review it:
// objective text, linked evidence, SSP narrative excerpt, and a verdict + notes.
export default function ObjectiveAssessRow({ obj, evidence, readOnly, onChange, onCreatePoam }) {
  const [open, setOpen] = useState(false);
  const verdict = obj.verdict || 'Not Assessed';
  const needsJustification = verdict === 'Not Met' || verdict === 'Not Applicable';
  const missingJust = needsJustification && !(obj.justification || '').trim();

  const setVerdict = (v) => onChange({ verdict: v });

  return (
    <div className={`border-l-4 ${verdict === 'Met' ? 'border-green-400' : verdict === 'Not Met' ? 'border-red-400' : verdict === 'Not Applicable' ? 'border-slate-300' : 'border-slate-200'}`}>
      <div className="px-4 py-3">
        <button onClick={() => setOpen((o) => !o)} className="w-full flex items-start justify-between gap-3 text-left">
          <div className="min-w-0">
            <span className="font-mono text-xs font-bold text-[#0F1E3C]">{obj.objective_id}</span>
            <p className="text-sm text-slate-700 mt-0.5">{obj.objective_text}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {verdict !== 'Not Assessed' && (
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${VERDICT_META[verdict]?.cls || 'bg-slate-200 text-slate-600'}`}>{verdict}</span>
            )}
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`} />
          </div>
        </button>

        {open && (
          <div className="mt-3 space-y-3">
            {/* Expected evidence types */}
            {obj.evidence_types?.length > 0 && (
              <div className="text-[11px] text-slate-500">
                Typical evidence: <span className="font-medium text-slate-600">{obj.evidence_types.join(', ')}</span>
              </div>
            )}

            {/* Linked evidence items */}
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                <Paperclip className="w-3 h-3" /> Linked Evidence ({evidence.length})
              </div>
              {evidence.length === 0 ? (
                <p className="text-xs text-amber-600">No evidence mapped to this control yet.</p>
              ) : (
                <ul className="space-y-1">
                  {evidence.map((e) => (
                    <li key={e.id} className="flex items-center gap-2 text-xs text-slate-600">
                      <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      {e.file_url ? (
                        <a href={e.file_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">{e.file_name || e.evidence_title}</a>
                      ) : (
                        <span className="truncate">{e.evidence_title}</span>
                      )}
                      <span className="text-[10px] text-slate-400">[{e.review_status}]</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* SSP narrative excerpt */}
            <div>
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">SSP Narrative Excerpt</div>
              <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded p-2">
                {stripHtml(obj.ssp_statement) || <span className="italic text-slate-400">No SSP implementation statement recorded for this control.</span>}
              </p>
            </div>

            {/* Verdict buttons */}
            <div className="flex flex-wrap gap-2">
              {VERDICTS.map((v) => {
                const M = VERDICT_META[v];
                const Icon = M.icon;
                const active = verdict === v;
                return (
                  <button key={v} disabled={readOnly} onClick={() => setVerdict(v)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${active ? M.cls + ' border-transparent' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'} disabled:opacity-60`}>
                    <Icon className="w-3.5 h-3.5" /> {v}
                  </button>
                );
              })}
            </div>

            {needsJustification && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Justification {missingJust && <span className="text-red-500">(required)</span>}</label>
                <textarea className={`form-input text-sm ${missingJust ? 'ring-1 ring-red-300' : ''}`} rows={2} disabled={readOnly}
                  value={obj.justification || ''} onChange={(e) => onChange({ justification: e.target.value })}
                  placeholder={verdict === 'Not Applicable' ? 'Why does this objective not apply?' : 'Why is this objective not met? What is the gap?'} />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Assessor Notes</label>
              <textarea className="form-input text-sm" rows={2} disabled={readOnly}
                value={obj.assessor_notes || ''} onChange={(e) => onChange({ assessor_notes: e.target.value })}
                placeholder="Observations, interview notes, config references…" />
            </div>

            {verdict === 'Not Met' && !readOnly && (
              <button onClick={onCreatePoam} disabled={obj.poam_created}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-60">
                <PlusCircle className="w-3.5 h-3.5" /> {obj.poam_created ? 'POA&M item created' : 'Create POA&M item'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}