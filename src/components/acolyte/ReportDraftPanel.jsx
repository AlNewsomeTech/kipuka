import { useState, useEffect, useCallback } from 'react';
import { X, Sparkles, Loader2, RotateCcw, AlertTriangle, Check, Database } from 'lucide-react';
import { ASSISTANT_BRAND, ASSISTANT_DISCLAIMER } from '@/lib/acolyteAssistant';
import {
  DRAFT_FIELDS, gatherProjectData, buildSourceSummary,
  generateReportDraft, stripHtml,
} from '@/lib/executiveReportGenerator';

const MIN_DATA_POINTS = 1;

// User-triggered draft panel for the Executive Cyber Report. Gathers current
// project data, drafts all fields, and lets the user apply them into the report
// form (draft state) — safely, never overwriting existing text without confirming.
export default function ReportDraftPanel({
  project, orgName, user, currentValues = {}, onApplyFields, onClose,
}) {
  const [phase, setPhase] = useState('loading'); // loading | insufficient | error | ready
  const [sourceSummary, setSourceSummary] = useState('');
  const [drafts, setDrafts] = useState({}); // key -> plain text (editable)
  const [error, setError] = useState('');

  const run = useCallback(async () => {
    setPhase('loading');
    setError('');
    try {
      const data = await gatherProjectData(project.id);
      const { summary, dataPoints } = buildSourceSummary(data);
      setSourceSummary(summary);
      if (dataPoints < MIN_DATA_POINTS) { setPhase('insufficient'); return; }

      const { fields } = await generateReportDraft({
        project,
        orgName,
        preparedBy: currentValues.prepared_by || user?.full_name,
        periodStart: currentValues.report_period_start,
        periodEnd: currentValues.report_period_end,
        data,
      });
      // Store as plain text for editing in the textareas.
      const plain = {};
      for (const [key] of DRAFT_FIELDS) plain[key] = stripHtml(fields[key]);
      setDrafts(plain);
      setPhase('ready');
    } catch (e) {
      console.warn('Report draft generation failed:', e?.message);
      setError('Draft generation failed. Please try again.');
      setPhase('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, orgName]);

  useEffect(() => { run(); }, [run]);

  const toHtml = (t) => {
    const s = (t || '').trim();
    return s ? `<p>${s.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br/>')}</p>` : '';
  };

  const fieldHasContent = (key) => !!stripHtml(currentValues[key]);

  const applyOne = (key, mode) => {
    const draftHtml = toHtml(drafts[key]);
    if (!draftHtml) return;
    if (mode === 'append' && currentValues[key]) {
      onApplyFields({ [key]: `${currentValues[key]}${draftHtml}` });
    } else {
      onApplyFields({ [key]: draftHtml });
    }
  };

  const applyAllEmpty = () => {
    const patch = {};
    for (const [key] of DRAFT_FIELDS) {
      if (!fieldHasContent(key) && stripHtml(drafts[key])) patch[key] = toHtml(drafts[key]);
    }
    if (Object.keys(patch).length) onApplyFields(patch);
  };

  const replaceAll = () => {
    if (!window.confirm('Replace ALL report fields with the generated draft? Existing content in these fields will be overwritten.')) return;
    const patch = {};
    for (const [key] of DRAFT_FIELDS) if (stripHtml(drafts[key])) patch[key] = toHtml(drafts[key]);
    onApplyFields(patch);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between gap-3 z-10">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-800 truncate">Generate Draft from Current Data</h2>
              <div className="text-[11px] font-medium text-purple-600">{ASSISTANT_BRAND.name} · {ASSISTANT_BRAND.subtitle}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 flex-shrink-0"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Source data used */}
          {sourceSummary && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">
                <Database className="w-3.5 h-3.5" /> Source data used (this project only)
              </div>
              <pre className="text-[11px] text-slate-500 whitespace-pre-wrap font-mono leading-relaxed">{sourceSummary}</pre>
            </div>
          )}

          {phase === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <span className="text-sm">Gathering project data and drafting report…</span>
            </div>
          )}

          {phase === 'insufficient' && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">Not enough project data exists to generate a useful executive report. Add control status, findings, evidence, remediation items, or readiness review data first.</p>
            </div>
          )}

          {phase === 'error' && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
          )}

          {phase === 'ready' && (
            <>
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">Generated content is a draft for operational support only. Review, edit, and validate before client delivery, compliance use, executive reporting, or official submission.</p>
              </div>

              {DRAFT_FIELDS.map(([key, label]) => {
                const hasExisting = fieldHasContent(key);
                return (
                  <div key={key} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">{label}</label>
                      {hasExisting && <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Field already has content</span>}
                    </div>
                    <textarea
                      className="form-input min-h-[90px] text-[13px] leading-relaxed"
                      value={drafts[key] || ''}
                      onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {hasExisting ? (
                        <>
                          <button onClick={() => applyOne(key, 'replace')} className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200">Replace</button>
                          <button onClick={() => applyOne(key, 'append')} className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200">Append</button>
                          <span className="text-[11px] text-slate-400 px-1 py-1">or keep existing</span>
                        </>
                      ) : (
                        <button onClick={() => applyOne(key, 'replace')} className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200"><Check className="w-3 h-3" /> Insert into Report</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3 space-y-3">
          <p className="text-[11px] text-slate-400 leading-snug">{ASSISTANT_DISCLAIMER}</p>
          <div className="flex flex-wrap justify-between gap-2">
            <button
              onClick={run}
              disabled={phase === 'loading'}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-60"
            >
              <RotateCcw className="w-4 h-4" /> Regenerate Draft
            </button>
            <div className="flex flex-wrap gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">Discard Draft</button>
              {phase === 'ready' && (
                <>
                  <button onClick={replaceAll} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">Replace All Fields</button>
                  <button onClick={applyAllEmpty} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
                    <Check className="w-4 h-4" /> Apply All Empty Fields
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}