import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { logAudit, AUDIT_ACTIONS } from '@/lib/auditLog';
import { REVIEW_TYPES, REVIEW_STATUSES, POSTURE_STATUSES } from '@/lib/acolyte';
import RichTextField from '@/components/ui/RichTextField';
import LinkMultiSelect from './LinkMultiSelect';
import MicrosoftTelemetryHint from '@/components/acolyte/microsoft/MicrosoftTelemetryHint';

const POSTURE_FIELDS = [
  ['endpoint_posture_status', 'Endpoint Posture'],
  ['cloud_posture_status', 'Cloud Posture'],
  ['vulnerability_status', 'Vulnerability'],
  ['identity_access_status', 'Identity / Access'],
  ['incident_readiness_status', 'Incident Readiness'],
  ['compliance_alignment_status', 'Compliance Alignment'],
];

export default function ReviewFormModal({ project, existing, findings = [], remediations = [], evidence = [], user, onClose, onSaved }) {
  const [form, setForm] = useState(existing || {
    review_title: '', review_type: 'Monthly Review', review_status: 'Draft',
    review_period_start: '', review_period_end: '', readiness_score: 0,
    endpoint_posture_status: 'Unknown', cloud_posture_status: 'Unknown', vulnerability_status: 'Unknown',
    identity_access_status: 'Unknown', incident_readiness_status: 'Unknown', compliance_alignment_status: 'Unknown',
    executive_summary: '', key_risks: '', completed_actions: '', recommended_next_steps: '', leadership_decisions_needed: '',
    prepared_by: user?.full_name || 'Pacific Global Security Group',
    linked_finding_ids: [], linked_remediation_ids: [], linked_evidence_ids: [],
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.review_title?.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        organization_id: project.organization_id || '',
        project_id: project.id,
        readiness_score: Number(form.readiness_score) || 0,
      };
      const create = !existing?.id;
      if (create) await base44.entities.CyberReadinessReview.create(payload);
      else await base44.entities.CyberReadinessReview.update(existing.id, payload);
      await logAudit({
        organizationId: payload.organization_id, user,
        actionType: create ? AUDIT_ACTIONS.ACOLYTE_REVIEW_CREATE : AUDIT_ACTIONS.ACOLYTE_REVIEW_UPDATE,
        targetEntity: 'CyberReadinessReview', targetRecordId: existing?.id || '',
        summary: `${create ? 'Created' : 'Updated'} ACOLYTE readiness review "${form.review_title}".`,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">{existing?.id ? 'Edit' : 'New'} Readiness Review</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Review Title *</label>
            <input className="form-input" value={form.review_title} onChange={(e) => set('review_title', e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Review Type</label>
              <select className="form-input" value={form.review_type} onChange={(e) => set('review_type', e.target.value)}>
                {REVIEW_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
              <select className="form-input" value={form.review_status} onChange={(e) => set('review_status', e.target.value)}>
                {REVIEW_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Period Start</label>
              <input type="date" className="form-input" value={form.review_period_start || ''} onChange={(e) => set('review_period_start', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Period End</label>
              <input type="date" className="form-input" value={form.review_period_end || ''} onChange={(e) => set('review_period_end', e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Readiness Score</label>
              <input type="number" className="form-input" value={form.readiness_score} onChange={(e) => set('readiness_score', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Prepared By</label>
              <input className="form-input" value={form.prepared_by} onChange={(e) => set('prepared_by', e.target.value)} />
            </div>
          </div>

          <MicrosoftTelemetryHint projectId={project?.id} />

          <div>
            <div className="text-xs font-semibold text-slate-600 mb-1.5">Posture at Review</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {POSTURE_FIELDS.map(([k, label]) => (
                <div key={k}>
                  <label className="block text-[11px] text-slate-500 mb-1">{label}</label>
                  <select className="form-input" value={form[k]} onChange={(e) => set(k, e.target.value)}>
                    {POSTURE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <RichTextField label="Executive Summary" value={form.executive_summary} onChange={(v) => set('executive_summary', v)} />
          <RichTextField label="Key Risks" value={form.key_risks} onChange={(v) => set('key_risks', v)} />
          <RichTextField label="Completed Actions" value={form.completed_actions} onChange={(v) => set('completed_actions', v)} />
          <RichTextField label="Recommended Next Steps" value={form.recommended_next_steps} onChange={(v) => set('recommended_next_steps', v)} />
          <RichTextField label="Leadership Decisions Needed" value={form.leadership_decisions_needed} onChange={(v) => set('leadership_decisions_needed', v)} />

          <LinkMultiSelect label="Linked Findings" options={findings.map((f) => ({ value: f.id, label: f.finding_title }))} selected={form.linked_finding_ids || []} onChange={(v) => set('linked_finding_ids', v)} emptyHint="No findings in this project yet." />
          <LinkMultiSelect label="Linked Remediation Items" options={remediations.map((r) => ({ value: r.id, label: r.remediation_title }))} selected={form.linked_remediation_ids || []} onChange={(v) => set('linked_remediation_ids', v)} emptyHint="No remediation items in this project yet." />
          <LinkMultiSelect label="Linked Evidence" options={evidence.map((e) => ({ value: e.id, label: e.evidence_title }))} selected={form.linked_evidence_ids || []} onChange={(v) => set('linked_evidence_ids', v)} emptyHint="No evidence in this project yet." />
        </div>
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">Cancel</button>
          <button onClick={save} disabled={saving || !form.review_title?.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Review
          </button>
        </div>
      </div>
    </div>
  );
}