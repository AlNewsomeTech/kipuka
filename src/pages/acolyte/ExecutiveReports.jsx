import { useState, useEffect, useCallback } from 'react';
import { FileBarChart, Plus, Loader2, Eye, FileDown, Pencil, Archive } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAcolyteScope } from '@/lib/useAcolyteScope';
import { logAudit, AUDIT_ACTIONS } from '@/lib/auditLog';
import { generateAcolyteReportPdf } from '@/lib/acolyteReport';
import { ACOLYTE_BRAND, REPORT_STATUSES } from '@/lib/acolyte';
import AcolyteHeader from '@/components/acolyte/AcolyteHeader';
import AcolyteProjectBar from '@/components/acolyte/AcolyteProjectBar';
import NoProjectState from '@/components/acolyte/NoProjectState';
import ReportEditorModal from '@/components/acolyte/ReportEditorModal';
import ReportPreview from '@/components/acolyte/ReportPreview';
import StatusBadge from '@/components/StatusBadge';

export default function ExecutiveReports() {
  const scope = useAcolyteScope();
  const { project, projects, projectId, selectProject, orgNameForProject, selectedOrg, readOnly, user } = scope;
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fStatus, setFStatus] = useState('All');

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    const r = await base44.entities.AcolyteExecutiveReport.filter({ project_id: projectId }, '-created_date').catch(() => []);
    setReports(r);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const rows = reports.filter((r) => fStatus === 'All' || r.report_status === fStatus);
  const org = selectedOrg || { organization_name: orgNameForProject };

  const exportPdf = async (r) => {
    generateAcolyteReportPdf({ report: r, project, org, generatedBy: user?.full_name });
    if (r.report_status === 'Draft') await base44.entities.AcolyteExecutiveReport.update(r.id, { report_status: 'Generated' });
    await logAudit({ organizationId: r.organization_id, user, actionType: AUDIT_ACTIONS.ACOLYTE_REPORT_EXPORT, targetEntity: 'AcolyteExecutiveReport', targetRecordId: r.id, summary: `Exported executive report "${r.report_title}".` });
    load();
  };

  const archive = async (r) => {
    await base44.entities.AcolyteExecutiveReport.update(r.id, { report_status: 'Archived' });
    await logAudit({ organizationId: r.organization_id, user, actionType: AUDIT_ACTIONS.ACOLYTE_REPORT_ARCHIVE, targetEntity: 'AcolyteExecutiveReport', targetRecordId: r.id, summary: `Archived executive report "${r.report_title}".` });
    load();
  };

  return (
    <div className="space-y-4">
      <AcolyteHeader
        title="Executive Cyber Reports"
        subtitle="Create user-triggered executive reports summarizing operational cyber readiness."
        icon={FileBarChart}
        right={!readOnly && project ? (
          <button onClick={() => { setEditing(null); setModal(true); }} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white text-[#0F1E3C] rounded-lg hover:bg-slate-100">
            <Plus className="w-4 h-4" /> New Report
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
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center justify-between">
            <select className="form-input w-auto" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="All">All statuses</option>
              {REPORT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="text-xs text-slate-400">{ACOLYTE_BRAND.preparedBy}. {ACOLYTE_BRAND.reportDisclaimer}</span>
          </div>

          {rows.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">No executive reports yet. Create one, or generate a draft from a readiness review.</div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {rows.map((r) => (
                <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-800 truncate">{r.report_title}</h3>
                      <StatusBadge status={r.report_status} size="xs" />
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {r.report_period_start || '—'} to {r.report_period_end || '—'} · {r.prepared_by || 'Pacific Global Security Group'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => setPreview(r)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" title="Preview"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => exportPdf(r)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" title="Export PDF"><FileDown className="w-4 h-4" /></button>
                    {!readOnly && <button onClick={() => { setEditing(r); setModal(true); }} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" title="Edit"><Pencil className="w-4 h-4" /></button>}
                    {!readOnly && r.report_status !== 'Archived' && <button onClick={() => archive(r)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" title="Archive"><Archive className="w-4 h-4" /></button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {modal && project && (
        <ReportEditorModal project={project} existing={editing} user={user}
          onClose={() => setModal(false)} onSaved={() => { setModal(false); load(); }} />
      )}
      {preview && (
        <ReportPreview report={preview} project={project} orgName={orgNameForProject} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}