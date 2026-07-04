import { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, Check, RotateCcw, AlertTriangle } from 'lucide-react';
import { logAudit, AUDIT_ACTIONS } from '@/lib/auditLog';
import { ASSISTANT_BRAND, ASSISTANT_DISCLAIMER, REVIEW_NOTICE } from '@/lib/acolyteAssistant';

// Reusable editable-preview panel for every ACOLYTE Analyst Assistant action.
// Flow: auto-generate on open -> user edits -> "Apply to Record" (persists via
// the provided onApply) or "Discard". Nothing is saved until the user applies.
export default function AssistantPanel({
  open,
  title,
  actionLabel,        // human label of the action (for audit + heading)
  generate,           // async () => string   (the LLM call)
  onApply,            // async (editedText) => void  (persists to the record)
  applyLabel = 'Apply to Record',
  reviewOnly = false, // when true, hide Apply — suggestion is advisory only
  organizationId = '',
  user = null,
  targetEntity = '',
  targetRecordId = '',
  onClose,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [applying, setApplying] = useState(false);

  const runGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await generate();
      setText(result || '');
    } catch (e) {
      setError('Content generation failed. Please try again.');
      console.warn('Assistant generation failed:', e?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) { setText(''); setError(''); runGenerate(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const apply = async () => {
    if (!text.trim()) return;
    setApplying(true);
    try {
      await onApply(text);
      await logAudit({
        organizationId, user,
        actionType: AUDIT_ACTIONS.ACOLYTE_ASSISTANT_APPLY,
        targetEntity, targetRecordId,
        summary: `Applied ACOLYTE Analyst Assistant content (${actionLabel}) to record.`,
      });
      onClose();
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-800 truncate">{title}</h2>
              <div className="text-[11px] font-medium text-purple-600">{ASSISTANT_BRAND.name} · {ASSISTANT_BRAND.subtitle}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 flex-shrink-0"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <span className="text-sm">Generating draft…</span>
            </div>
          ) : error ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-800">{REVIEW_NOTICE}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {reviewOnly ? 'Suggested content (review only — confirm manually before use)' : 'Editable draft — review and edit before applying'}
                </label>
                <textarea
                  className="form-input min-h-[280px] font-mono text-[13px] leading-relaxed"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3 space-y-3">
          <p className="text-[11px] text-slate-400 leading-snug">{ASSISTANT_DISCLAIMER}</p>
          <div className="flex justify-between gap-2">
            <button
              onClick={runGenerate}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-60"
            >
              <RotateCcw className="w-4 h-4" /> Regenerate
            </button>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">
                Discard
              </button>
              {!reviewOnly && (
                <button
                  onClick={apply}
                  disabled={applying || loading || !text.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-60"
                >
                  {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {applyLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}