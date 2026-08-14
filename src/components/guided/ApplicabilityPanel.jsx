import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleSlash2, Loader2, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';

const WIRELESS_CONTROLS = new Set(['AC.L2-3.1.16', 'AC.L2-3.1.17']);

function guidanceFor(controlId) {
  if (WIRELESS_CONTROLS.has(controlId)) {
    return {
      reason: 'Example: The documented CMMC assessment boundary has no organization-controlled wireless access points or wireless networks, and no in-scope system provides wireless access.',
      evidence: 'Name the network or data-flow diagram, asset inventory, location inventory, SSP boundary section, or policy that proves wireless is absent from the assessment boundary.',
    };
  }
  return {
    reason: 'Explain exactly which capability, system, location, device type, provider responsibility, or data flow is absent from the documented assessment scope.',
    evidence: 'Name the scope diagram, inventory, SSP section, contract boundary, provider responsibility record, or other record that proves the requirement does not apply.',
  };
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function ApplicabilityPanel({
  assessment,
  libEntry,
  readOnly,
  saving,
  workflow,
  onAction,
}) {
  const [open, setOpen] = useState(false);
  const [justification, setJustification] = useState('');
  const [scopeEvidence, setScopeEvidence] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [error, setError] = useState('');
  const guidance = guidanceFor(libEntry?.control_id);
  const pending = workflow?.pending_request || null;
  const latest = workflow?.request || null;
  const permissions = workflow?.permissions || {};
  const legacyReviewRequired = workflow?.legacy_review_required === true;
  const approved = assessment?.status === 'Not Applicable'
    && assessment?.not_applicable_request_status === 'Approved'
    && /^[a-f0-9]{64}$/i.test(assessment?.not_applicable_decision_sha256 || '');
  const rejected = latest?.status === 'Rejected';

  useEffect(() => {
    setJustification(pending?.justification || assessment?.not_applicable_justification || '');
    setScopeEvidence(pending?.scope_evidence || assessment?.not_applicable_scope_evidence || '');
    setConfirmed(false);
    setReviewNote('');
    setError('');
    setOpen(false);
  }, [
    assessment?.id,
    assessment?.status,
    assessment?.not_applicable_request_status,
    pending?.id,
    latest?.id,
  ]);

  const run = async (action, payload = {}) => {
    setError('');
    try {
      await onAction(action, payload);
      setReviewNote('');
      if (action === 'request') setOpen(false);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'The applicability action failed.');
    }
  };

  const submitRequest = () => {
    if (justification.trim().length < 40) {
      setError('Explain why this control is outside the documented scope in at least 40 characters.');
      return;
    }
    if (scopeEvidence.trim().length < 20) {
      setError('Name the scope records or evidence that support the request.');
      return;
    }
    if (!confirmed) {
      setError('Confirm the assessment-scope statement before submitting.');
      return;
    }
    run('request', {
      justification: justification.trim(),
      scope_evidence: scopeEvidence.trim(),
      scope_confirmation: true,
    });
  };

  const review = (action) => {
    if (reviewNote.trim().length < 10) {
      setError('Enter a review note of at least 10 characters.');
      return;
    }
    run(action, { request_id: pending.id, review_note: reviewNote.trim() });
  };

  if (pending) {
    return (
      <div className="app-surface border border-blue-300 rounded-xl p-4 space-y-4">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-blue-700 mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Not Applicable request awaiting independent review</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              The control does not receive N/A credit until a different authorized reviewer approves this request.
            </p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-white border border-blue-100 rounded-lg p-3">
            <div className="font-semibold text-slate-500 uppercase tracking-wide mb-1">Why it may not apply</div>
            <p className="text-slate-800 whitespace-pre-line">{pending.justification}</p>
          </div>
          <div className="bg-white border border-blue-100 rounded-lg p-3">
            <div className="font-semibold text-slate-500 uppercase tracking-wide mb-1">Scope records cited</div>
            <p className="text-slate-800 whitespace-pre-line">{pending.scope_evidence}</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-600">
          Submitted by {pending.submitted_by_name || pending.submitted_by_email} on {formatDate(pending.submitted_date)}.
        </p>
        {!readOnly && permissions.can_review && (
          <div className="bg-white border border-blue-200 rounded-lg p-3 space-y-2">
            <label className="block text-xs font-semibold text-slate-700">Independent review note</label>
            <textarea
              rows={2}
              className="form-input"
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              placeholder="State what you checked and why you approve or reject this scope decision."
            />
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => review('approve')} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-green-700 hover:bg-green-800 disabled:opacity-60">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Approve N/A
              </button>
              <button onClick={() => review('reject')} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-700 hover:bg-red-800 disabled:opacity-60">
                <XCircle className="w-3.5 h-3.5" /> Reject request
              </button>
            </div>
          </div>
        )}
        {!readOnly && permissions.is_own_request && (
          <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-slate-700">
            <span>You submitted this request, so you cannot review it.</span>
            <button onClick={() => run('withdraw', { request_id: pending.id, review_note: 'Withdrawn by requester.' })} disabled={saving} className="px-3 py-1.5 rounded-lg font-semibold bg-white border border-blue-300 hover:bg-blue-100 disabled:opacity-60">
              Withdraw request
            </button>
          </div>
        )}
        {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
      </div>
    );
  }

  if (approved) {
    return (
      <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-slate-700 mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Approved Not Applicable determination</h2>
              <p className="text-xs text-slate-600 mt-0.5">A separate authorized reviewer approved this documented scope decision.</p>
            </div>
          </div>
          {!readOnly && permissions.can_restore && (
            <button onClick={() => run('restore', { review_note: 'Scope changed or the control is now applicable.' })} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Restore as Applicable
            </button>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <div className="font-semibold text-slate-500 uppercase tracking-wide mb-1">Approved justification</div>
            <p className="text-slate-800 whitespace-pre-line">{assessment.not_applicable_justification}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <div className="font-semibold text-slate-500 uppercase tracking-wide mb-1">Scope evidence</div>
            <p className="text-slate-800 whitespace-pre-line">{assessment.not_applicable_scope_evidence}</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-500">
          Approved by {assessment.not_applicable_confirmed_by || 'authorized reviewer'} on {assessment.not_applicable_confirmed_date || 'recorded date'}.
        </p>
        {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className={`app-surface border rounded-xl border-l-4 p-4 ${legacyReviewRequired ? 'border-red-300 border-l-red-500' : 'border-slate-300 border-l-amber-500'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2.5">
          {legacyReviewRequired
            ? <AlertTriangle className="w-5 h-5 text-red-700 mt-0.5 flex-shrink-0" />
            : <CircleSlash2 className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />}
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {legacyReviewRequired ? 'Legacy N/A record requires independent review' : 'Does this control truly not apply?'}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {legacyReviewRequired
                ? 'This older record is preserved but does not count as complete. Submit its scope basis for independent approval or restore the control as applicable.'
                : 'Use N/A only when the requirement is outside the documented assessment scope. An unfinished applicable control is a gap, not N/A.'}
            </p>
          </div>
        </div>
        {!readOnly && permissions.can_request && !open && (
          <button onClick={() => setOpen(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0F1E3C] border border-[#27476f] hover:bg-[#152a52]">
            {legacyReviewRequired ? 'Submit for independent review' : 'Request N/A review'}
          </button>
        )}
      </div>

      {rejected && !open && (
        <div className="mt-3 text-xs text-red-900 bg-white border border-red-200 rounded-lg p-3">
          The last request was rejected{latest.review_note ? `: ${latest.review_note}` : '.'} Correct the scope basis before submitting a new request.
        </div>
      )}

      {open && !readOnly && (
        <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">Why does {libEntry?.control_id} not apply?</label>
            <textarea rows={3} className="form-input" value={justification} onChange={(event) => setJustification(event.target.value)} placeholder={guidance.reason} />
            <p className="text-[11px] text-slate-600 mt-1">{guidance.reason}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1">Which scope records prove that statement?</label>
            <textarea rows={3} className="form-input" value={scopeEvidence} onChange={(event) => setScopeEvidence(event.target.value)} placeholder={guidance.evidence} />
            <p className="text-[11px] text-slate-600 mt-1">{guidance.evidence}</p>
          </div>
          <label className="flex items-start gap-2 text-xs text-slate-800 cursor-pointer">
            <input type="checkbox" className="mt-0.5" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            <span>I checked the documented assessment boundary and confirmed that no in-scope system, device, location, provider responsibility, or data flow uses this capability.</span>
          </label>
          {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
          <div className="flex gap-2 flex-wrap">
            <button onClick={submitRequest} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-60">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />} Submit for independent review
            </button>
            <button onClick={() => { setOpen(false); setError(''); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200">Cancel</button>
            {legacyReviewRequired && permissions.can_restore && (
              <button onClick={() => run('restore', { review_note: 'Legacy N/A restored as applicable pending fresh review.' })} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300">
                <RotateCcw className="w-3.5 h-3.5" /> Restore as Applicable
              </button>
            )}
          </div>
        </div>
      )}
      {!open && error && <p className="mt-3 text-xs font-semibold text-red-700">{error}</p>}
    </div>
  );
}
