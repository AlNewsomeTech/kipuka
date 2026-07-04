import { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Save, Loader2, Check, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAcolyteScope } from '@/lib/useAcolyteScope';
import { useAcolyteLinkables } from '@/lib/useAcolyteLinkables';
import { logAudit, AUDIT_ACTIONS } from '@/lib/auditLog';
import { canUseAssistant, draftIncidentReadinessSummary } from '@/lib/acolyteAssistant';
import AcolyteHeader from '@/components/acolyte/AcolyteHeader';
import AcolyteProjectBar from '@/components/acolyte/AcolyteProjectBar';
import NoProjectState from '@/components/acolyte/NoProjectState';
import AssistantPanel from '@/components/acolyte/AssistantPanel';
import RichTextField from '@/components/ui/RichTextField';
import LinkMultiSelect from '@/components/acolyte/LinkMultiSelect';
import StatusBadge from '@/components/StatusBadge';

const CARD_FIELDS = [
  { key: 'ir_plan_status', label: 'Incident Response Plan', options: ['Not Started', 'Draft', 'In Review', 'Approved', 'Needs Update'] },
  { key: 'incident_contact_list_status', label: 'Incident Contact List', options: ['Missing', 'Draft', 'Current', 'Needs Update'] },
  { key: 'escalation_path_status', label: 'Escalation Path', options: ['Missing', 'Draft', 'Current', 'Needs Update'] },
  { key: 'tabletop_status', label: 'Tabletop Exercise', options: ['Not Performed', 'Scheduled', 'Completed', 'Needs Follow-Up'] },
  { key: 'backup_recovery_status', label: 'Backup & Recovery', options: ['Unknown', 'Good', 'Needs Attention', 'High Risk'] },
];

export default function IncidentReadiness() {
  const scope = useAcolyteScope();
  const { project, projects, projectId, selectProject, orgNameForProject, readOnly, orgRole, user } = scope;
  const linkables = useAcolyteLinkables(projectId);
  const [assist, setAssist] = useState(false);
  const canAssist = canUseAssistant(orgRole, 'draft_incident');
  const toHtml = (t) => `<p>${(t || '').replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;
  const [record, setRecord] = useState(null);
  const [findings, setFindings] = useState([]);
  const [remediations, setRemediations] = useState([]);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    const [rows, f, r] = await Promise.all([
      base44.entities.IncidentReadinessRecord.filter({ project_id: projectId }).catch(() => []),
      base44.entities.CyberFinding.filter({ project_id: projectId }).catch(() => []),
      base44.entities.AcolyteRemediationItem.filter({ project_id: projectId }).catch(() => []),
    ]);
    setRecord(rows[0] || null);
    setForm(rows[0] || {});
    setFindings(f);
    setRemediations(r);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, organization_id: project.organization_id || '', project_id: projectId };
      if (record?.id) await base44.entities.IncidentReadinessRecord.update(record.id, payload);
      else await base44.entities.IncidentReadinessRecord.create(payload);
      await logAudit({ organizationId: payload.organization_id, user, actionType: AUDIT_ACTIONS.ACOLYTE_INCIDENT_UPDATE, targetEntity: 'IncidentReadinessRecord', targetRecordId: record?.id || '', summary: `Updated incident readiness for "${project.project_name}".` });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <AcolyteHeader title="Incident Readiness" subtitle="Track whether the organization is ready to respond to cybersecurity incidents." icon={ShieldAlert}
        right={!readOnly && project && canAssist ? (
          <button onClick={() => setAssist(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white text-purple-700 rounded-lg hover:bg-slate-100">
            <Sparkles className="w-4 h-4" /> Draft Incident Readiness Summary
          </button>
        ) : null}
      />
      <AcolyteProjectBar projects={projects} projectId={projectId} onSelect={selectProject} orgName={orgNameForProject} />

      {!project ? (
        <NoProjectState />
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {CARD_FIELDS.map((c) => (
              <div key={c.key} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-semibold text-slate-600 mb-2">{c.label}</div>
                <div className="mb-2"><StatusBadge status={form[c.key] || c.options[0]} size="xs" /></div>
                <select className="form-input text-xs" value={form[c.key] || c.options[0]} onChange={(e) => set(c.key, e.target.value)} disabled={readOnly}>
                  {c.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-800">Tabletop & Schedule</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Last Tabletop Date</label>
                <input type="date" className="form-input" value={form.last_tabletop_date || ''} onChange={(e) => set('last_tabletop_date', e.target.value)} disabled={readOnly} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Next Tabletop Target Date</label>
                <input type="date" className="form-input" value={form.next_tabletop_target_date || ''} onChange={(e) => set('next_tabletop_target_date', e.target.value)} disabled={readOnly} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-800">Narrative & Actions</h2>
            <RichTextField label="Incident Roles Summary" value={form.incident_roles_summary} onChange={(v) => set('incident_roles_summary', v)} disabled={readOnly} />
            <RichTextField label="Communication Plan Summary" value={form.communication_plan_summary} onChange={(v) => set('communication_plan_summary', v)} disabled={readOnly} />
            <RichTextField label="Escalation Notes" value={form.escalation_notes} onChange={(v) => set('escalation_notes', v)} disabled={readOnly} />
            <RichTextField label="Tabletop Notes" value={form.tabletop_notes} onChange={(v) => set('tabletop_notes', v)} disabled={readOnly} />
            <RichTextField label="Follow-Up Actions" value={form.follow_up_actions} onChange={(v) => set('follow_up_actions', v)} disabled={readOnly} />
            <RichTextField label="Readiness Notes" value={form.readiness_notes} onChange={(v) => set('readiness_notes', v)} disabled={readOnly} />
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-800">Links</h2>
            <LinkMultiSelect label="Linked Evidence" options={linkables.evidence} selected={form.evidence_item_ids || []} onChange={(v) => set('evidence_item_ids', v)} disabled={readOnly} emptyHint="No evidence in this project yet." />
            <LinkMultiSelect label="Related Findings" options={findings.map((f) => ({ value: f.id, label: f.finding_title }))} selected={form.linked_finding_ids || []} onChange={(v) => set('linked_finding_ids', v)} disabled={readOnly} emptyHint="No findings in this project yet." />
            <LinkMultiSelect label="Related Remediation Items" options={remediations.map((r) => ({ value: r.id, label: r.remediation_title }))} selected={form.linked_remediation_ids || []} onChange={(v) => set('linked_remediation_ids', v)} disabled={readOnly} emptyHint="No remediation items in this project yet." />
          </div>

          {!readOnly && (
            <div className="flex justify-end">
              <button onClick={save} disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? 'Saved' : 'Save Incident Readiness'}
              </button>
            </div>
          )}
        </>
      )}

      <AssistantPanel
        open={assist}
        title="Draft Incident Readiness Summary"
        actionLabel="Draft Incident Readiness Summary"
        applyLabel="Apply to Readiness Notes"
        organizationId={project?.organization_id}
        user={user}
        targetEntity="IncidentReadinessRecord"
        targetRecordId={record?.id || ''}
        generate={() => draftIncidentReadinessSummary({ project, orgName: orgNameForProject, incident: form, findings })}
        onApply={async (text) => { set('readiness_notes', toHtml(text)); }}
        onClose={() => setAssist(false)}
      />
    </div>
  );
}