import { X, Wrench, Pencil, Sparkles } from 'lucide-react';
import { SeverityBadge } from './AcolyteBadges';
import StatusBadge from '@/components/StatusBadge';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

function Rich({ label, html }) {
  if (!html) return null;
  return (
    <div>
      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="prose prose-slate prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />
    </div>
  );
}
function Chips({ label, items, empty }) {
  if (!items?.length) {
    if (!empty) return null;
    return (
      <div>
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</div>
        <p className="text-xs text-slate-400 italic">{empty}</p>
      </div>
    );
  }
  return (
    <div>
      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((i) => <span key={i} className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{i}</span>)}
      </div>
    </div>
  );
}

export default function FindingDetail({ finding, controlLabels, evidenceLabels, poamLabels, remediationTitles, onClose, onEdit, onCreateRemediation, readOnly, canAssist, onExplainImpact, onDraftRemediation, onMapCmmc }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm font-bold text-slate-800 truncate">{finding.finding_title}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 flex-shrink-0"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={finding.severity} />
            <StatusBadge status={finding.finding_status} size="xs" />
            <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{finding.finding_category}</span>
            {finding.owner && <span className="text-xs text-slate-500">Owner: <b className="text-slate-700">{finding.owner}</b></span>}
            {finding.target_resolution_date && <span className="text-xs text-slate-500">Target: <b className="text-slate-700">{finding.target_resolution_date}</b></span>}
          </div>

          <Rich label="Description" html={finding.description} />
          <Rich label="Affected Systems" html={finding.affected_systems} />
          <Rich label="Business Impact" html={finding.business_impact} />
          <Rich label="Recommended Action" html={finding.recommended_action} />

          <Chips label="Related CMMC Controls" items={finding.related_control_ids} empty="No related CMMC controls linked yet." />
          <Chips label="Related Evidence" items={(finding.related_evidence_ids || []).map((id) => evidenceLabels[id] || id)} empty="No related evidence linked yet." />
          <Chips label="Related POA&M Items" items={(finding.related_poam_ids || []).map((id) => poamLabels[id] || id)} empty="No related POA&M item linked yet." />
          <Chips label="Related Remediation Items" items={remediationTitles} empty="No related remediation items linked yet." />

          <Rich label="Closure Notes" html={finding.closure_notes} />
          <Rich label="Validation Notes" html={finding.validation_notes} />

          {canAssist && (
            <div className="rounded-lg border border-purple-200 bg-purple-50/60 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wide">Drafting Assistant</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={onExplainImpact} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-white border border-purple-200 hover:bg-purple-50">
                  <Sparkles className="w-3.5 h-3.5" /> Explain Impact
                </button>
                <button onClick={onDraftRemediation} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-white border border-purple-200 hover:bg-purple-50">
                  <Sparkles className="w-3.5 h-3.5" /> Draft Remediation Recommendation
                </button>
                <button onClick={onMapCmmc} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-white border border-purple-200 hover:bg-purple-50">
                  <Sparkles className="w-3.5 h-3.5" /> Suggest CMMC Relevance
                </button>
              </div>
              <p className="text-[10px] text-purple-500/90 mt-2">Suggestions are drafts for analyst review. CMMC relevance is review-only and must be confirmed before linking.</p>
            </div>
          )}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3 flex justify-end gap-2">
          {!readOnly && (
            <>
              <button onClick={onCreateRemediation} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200">
                <Wrench className="w-4 h-4" /> Create Remediation
              </button>
              <button onClick={onEdit} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
                <Pencil className="w-4 h-4" /> Edit Finding
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}