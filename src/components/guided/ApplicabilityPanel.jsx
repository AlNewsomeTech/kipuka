import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleSlash2, Loader2, RotateCcw } from 'lucide-react';

const WIRELESS_CONTROLS = new Set(['AC.L2-3.1.16', 'AC.L2-3.1.17']);

function guidanceFor(controlId) {
  if (WIRELESS_CONTROLS.has(controlId)) {
    return {
      reason: 'Example: The CMMC assessment boundary contains no organization-controlled wireless access points or wireless networks, and no in-scope system provides wireless access.',
      evidence: 'Cite the network or data-flow diagram, asset inventory, location inventory, SSP boundary statement, and any policy that prohibits wireless access inside the assessment boundary.',
    };
  }
  return {
    reason: 'Explain exactly which capability, system, location, device type, or data flow is absent from the assessment scope.',
    evidence: 'Cite the scope diagram, inventory, SSP section, contract boundary, provider responsibility record, or other evidence that proves the requirement does not apply.',
  };
}

export default function ApplicabilityPanel({
  assessment,
  libEntry,
  readOnly,
  saving,
  onMarkNotApplicable,
  onRestoreApplicable,
}) {
  const isNotApplicable = assessment?.status === 'Not Applicable';
  const [open, setOpen] = useState(false);
  const [justification, setJustification] = useState('');
  const [scopeEvidence, setScopeEvidence] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const guidance = guidanceFor(libEntry?.control_id);

  useEffect(() => {
    setJustification(assessment?.not_applicable_justification || '');
    setScopeEvidence(assessment?.not_applicable_scope_evidence || '');
    setConfirmed(false);
    setError('');
  }, [assessment?.id, assessment?.status, assessment?.not_applicable_justification, assessment?.not_applicable_scope_evidence]);

  if (isNotApplicable) {
    return (
      <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Marked Not Applicable (Out of Scope)</h2>
              <p className="text-xs text-slate-600 mt-0.5">This is recorded as an assessment finding and counts as complete only while the documented scope remains accurate.</p>
            </div>
          </div>
          {!readOnly && (
            <button
              onClick={onRestoreApplicable}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              Restore as Applicable
            </button>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <div className="font-semibold text-slate-500 uppercase tracking-wide mb-1">Why it does not apply</div>
            <p className="text-slate-800 whitespace-pre-line">{assessment.not_applicable_justification || 'No justification recorded.'}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3">
            <div className="font-semibold text-slate-500 uppercase tracking-wide mb-1">Scope evidence</div>
            <p className="text-slate-800 whitespace-pre-line">{assessment.not_applicable_scope_evidence || 'No scope evidence recorded.'}</p>
          </div>
        </div>
        {(assessment.not_applicable_confirmed_by || assessment.not_applicable_confirmed_date) && (
          <p className="text-[11px] text-slate-500">
            Confirmed by {assessment.not_applicable_confirmed_by || 'unknown'} on {assessment.not_applicable_confirmed_date || 'unknown date'}.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-2.5">
          <CircleSlash2 className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="text-sm font-bold text-amber-950">Does this control truly not apply?</h2>
            <p className="text-xs text-amber-900/80 mt-0.5">Use the official Not Applicable finding only when the requirement or objective does not exist within the documented CMMC assessment scope.</p>
          </div>
        </div>
        {!readOnly && !open && (
          <button
            onClick={() => setOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-amber-900 bg-white border border-amber-300 hover:bg-amber-100"
          >
            Review N/A option
          </button>
        )}
      </div>

      {open && !readOnly && (
        <div className="mt-4 pt-4 border-t border-amber-200 space-y-3">
          <div className="flex gap-2 text-xs text-amber-900 bg-white/70 rounded-lg p-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>Do not use N/A because a control is inconvenient or unfinished. An incomplete applicable control is a gap or POA&amp;M item.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-amber-950 mb-1">Why does {libEntry?.control_id} not apply?</label>
            <textarea
              rows={3}
              className="form-input"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder={guidance.reason}
            />
            <p className="text-[11px] text-amber-800 mt-1">{guidance.reason}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-amber-950 mb-1">What evidence proves that scope statement?</label>
            <textarea
              rows={3}
              className="form-input"
              value={scopeEvidence}
              onChange={(e) => setScopeEvidence(e.target.value)}
              placeholder={guidance.evidence}
            />
            <p className="text-[11px] text-amber-800 mt-1">{guidance.evidence}</p>
          </div>
          <label className="flex items-start gap-2 text-xs text-amber-950 cursor-pointer">
            <input type="checkbox" className="mt-0.5" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            <span>I confirmed that no in-scope system, device, location, provider, or data flow uses the capability addressed by this control.</span>
          </label>
          {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (justification.trim().length < 20) {
                  setError('Enter a specific justification of at least 20 characters.');
                  return;
                }
                if (scopeEvidence.trim().length < 10) {
                  setError('Identify the scope evidence that supports the decision.');
                  return;
                }
                if (!confirmed) {
                  setError('Confirm the scope statement before marking this control N/A.');
                  return;
                }
                setError('');
                onMarkNotApplicable({
                  justification: justification.trim(),
                  scopeEvidence: scopeEvidence.trim(),
                });
              }}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-700 hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CircleSlash2 className="w-3.5 h-3.5" />}
              Mark Not Applicable
            </button>
            <button onClick={() => { setOpen(false); setError(''); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
