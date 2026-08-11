import { useState } from 'react';
import { X, Loader2, Save, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import RichTextField from '@/components/ui/RichTextField';
import { validIndependentDocumentApproval } from '@/lib/readinessGate';

export default function PolicyEditorModal({ policy, currentUser, onClose, onSaved }) {
  const [form, setForm] = useState({ ...policy, mapped_control_ids: policy.mapped_control_ids || [] });
  const [saving, setSaving] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [error, setError] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const saved = await base44.entities.PolicyTemplate.update(policy.id, {
        policy_name: form.policy_name,
        policy_category: form.policy_category,
        mapped_control_ids: (form.mapped_control_ids_str ?? (form.mapped_control_ids || []).join(', '))
          .split(',').map((value) => value.trim()).filter(Boolean),
        policy_body: form.policy_body,
        version: form.version,
        owner: form.owner,
        effective_date: form.effective_date || null,
        review_date: form.review_date || null,
        family_code: form.family_code || '',
        doc_kind: form.doc_kind || '',
      });
      setForm({ ...saved, mapped_control_ids: saved.mapped_control_ids || [] });
      onSaved();
    } catch (saveError) {
      setError(saveError?.response?.data?.error || saveError?.message || 'The policy draft could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const runReview = async (action) => {
    setReviewBusy(true);
    setError('');
    try {
      const transitionId = `policy_${action}_${crypto.randomUUID().replace(/-/g, '')}`;
      const response = await base44.functions.invoke('manageFinalDocumentReview', {
        source_entity: 'PolicyTemplate',
        record_id: policy.id,
        action,
        transition_id: transitionId,
        note: reviewNote,
      });
      const saved = response.data.document;
      setForm({ ...saved, mapped_control_ids: saved.mapped_control_ids || [] });
      setReviewNote('');
    } catch (reviewError) {
      setError(reviewError?.response?.data?.error || reviewError?.message || 'The policy review transition failed closed.');
    } finally {
      setReviewBusy(false);
    }
  };

  const requesterId = String(form.review_requested_by_user_id || '');
  const requesterEmail = String(form.review_requested_by_email || '').toLowerCase();
  const isSubmitter = (requesterId && requesterId === String(currentUser?.id || ''))
    || (requesterEmail && requesterEmail === String(currentUser?.email || '').toLowerCase());
  const validApproval = validIndependentDocumentApproval(form);
  const displayStatus = form.approval_status === 'Approved' && !validApproval
    ? 'Legacy Approved — independent review required'
    : form.approval_status;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="text-sm font-bold text-slate-800">Edit Policy Draft</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Policy Name</label>
            <input className="form-input" value={form.policy_name || ''} onChange={(event) => set('policy_name', event.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
              <input className="form-input" value={form.policy_category || ''} onChange={(event) => set('policy_category', event.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Owner</label>
              <input className="form-input" value={form.owner || ''} onChange={(event) => set('owner', event.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Version</label>
              <input className="form-input" value={form.version || ''} onChange={(event) => set('version', event.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Approval Status</label>
              <div className="form-input bg-slate-50">{displayStatus}</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Effective Date</label>
              <input type="date" className="form-input" value={form.effective_date || ''} onChange={(event) => set('effective_date', event.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Review Date</label>
              <input type="date" className="form-input" value={form.review_date || ''} onChange={(event) => set('review_date', event.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Mapped Control IDs (comma-separated)</label>
            <input className="form-input" defaultValue={(form.mapped_control_ids || []).join(', ')}
              onChange={(event) => set('mapped_control_ids_str', event.target.value)} />
          </div>

          <RichTextField label="Policy Body" value={form.policy_body || ''} onChange={(value) => set('policy_body', value)} />

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <ShieldCheck className="w-4 h-4" /> Independent approval
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Save the current draft before submission. Submission pins its SHA-256 content hash.
              The submitter cannot approve that version, and any later edit clears approval credit.
            </p>
            {form.approval_status === 'In Review' && (
              <textarea className="form-input mt-2" rows={2} value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                placeholder="Reviewer note. Required when rejecting." />
            )}
            {error && <p className="text-xs text-red-700 mt-2">{error}</p>}
            <div className="flex flex-wrap gap-2 mt-3">
              {(form.approval_status === 'Draft' || (form.approval_status === 'Approved' && !validApproval)) && (
                <button onClick={() => runReview('submit_review')} disabled={reviewBusy || saving}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-[#0F1E3C] disabled:opacity-60">
                  Submit for Independent Review
                </button>
              )}
              {form.approval_status === 'In Review' && isSubmitter && (
                <button onClick={() => runReview('withdraw')} disabled={reviewBusy}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 disabled:opacity-60">
                  Withdraw My Submission
                </button>
              )}
              {form.approval_status === 'In Review' && !isSubmitter && (
                <>
                  <button onClick={() => runReview('approve')} disabled={reviewBusy}
                    className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-green-700 disabled:opacity-60">
                    Approve Current Hash
                  </button>
                  <button onClick={() => runReview('reject')} disabled={reviewBusy || reviewNote.trim().length < 5}
                    className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-red-700 disabled:opacity-60">
                    Reject to Draft
                  </button>
                </>
              )}
            </div>
            {form.approval_status === 'In Review' && isSubmitter && (
              <p className="text-xs text-amber-700 mt-2">This account submitted the review and cannot approve or reject it.</p>
            )}
            {validApproval && (
              <p className="text-xs text-green-700 mt-2">
                Approved by {form.reviewed_by_name || form.approved_by} on {form.approved_date}. Approval record {form.approval_record_id}.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100">Close</button>
          <button onClick={save} disabled={saving || form.approval_status === 'In Review'}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Draft
          </button>
        </div>
      </div>
    </div>
  );
}
