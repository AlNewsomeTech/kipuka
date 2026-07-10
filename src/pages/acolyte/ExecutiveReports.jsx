import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FileBarChart, Plus, Loader2, Eye, FileDown, Pencil, Archive, Sparkles, ShieldCheck, ArrowRight, Package } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAcolyteScope } from '@/lib/useAcolyteScope';
import { logAudit, AUDIT_ACTIONS } from '@/lib/auditLog';
import { generateAcolyteReportPdf } from '@/lib/acolyteReport';
import { generateMonthlyReviewPack } from '@/lib/monthlyReviewPack';
import { scoreBand } from '@/lib/postureAssessment';
import { ACOLYTE_BRAND, REPORT_STATUSES } from '@/lib/acolyte';
import { canUseAssistant, draftExecutiveSummary } from '@/lib/acolyteAssistant';
import { useAcolyteProfile } from '@/lib/useAcolyteProfile';
import AcolyteHeader from '@/components/acolyte/AcolyteHeader';
import AcolyteProjectBar from '@/components/acolyte/AcolyteProjectBar';
import NoProjectState from '@/components/acolyte/NoProjectState';
import ReportEditorModal from '@/components/acolyte/ReportEditorModal';
import ReportPreview from '@/components/acolyte/ReportPreview';
import AssistantPanel from '@/components/acolyte/AssistantPanel';
import StatusBadge from '@/components/StatusBadge';

export default function ExecutiveReports() {
  const scope = useAcolyteScope();
  const { project, projects, projectId, selectProject, orgNameForProject, selectedOrg, readOnly, orgRole, user } = scope;
  const { profile } = useAcolyteProfile(projectId);
  const [draftFor, setDraftFor] = useState(null);
  const canAssist = canUseAssistant(orgRole, 'draft_executive');
  const toHtml = (t) => `<p>${(t || '').replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [autoDraft, setAutoDraft] = useState(false);
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);
  const [fStatus, setFStatus] = useState('All');
  const [posture, setPosture] = useState({ latest: null, delta: null });
  const [packing, setPacking] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    const r = await base44.entities.AcolyteExecutiveReport.filter({ project_id: projectId }, '-created_date').catch(() => []);
    setReports(r);
    // Latest completed posture assessment for the context card + delta.
    if (project?.organization_id) {
      const rows = await base44.entities.PostureAssessment.filter({ organization_id: project.organization_id }, '-created_date', 200).catch(() => []);
      const completed = rows.filter((p) => p.status === 'completed')
        .sort((a, b) => new Date(a.assessment_date || a.created_date) - new Date(b.assessment_date || b.created_date));
      const latest = completed[completed.length - 1] || null;
      const prev = completed[completed.length - 2] || null;
      setPosture({ latest, delta: latest && prev ? Math.round(latest.overall_score) - Math.round(prev.overall_score) : null });
    } else {
      setPosture({ latest: null, delta: null });
    }
    setLoading(false);
  }, [projectId, project?.organization_id]);

  const generatePack = async () => {
    setPacking(true);
    await generateMonthlyReviewPack({ project, org, generatedBy: user?.full_name }).catch(() => {});
    await logAudit({ organizationId: project?.organization_id, user, actionType: AUDIT_ACTIONS.ACOLYTE_REPORT_EXPORT, targetEntity: 'ReportExport', targetRecordId: '', summary: 'Generated ACOLYTE Monthly Review Pack.' }).catch(() => {});
    setPacking(false);
  };

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
          <div className="flex items-center gap-2">
            <button onClick={generatePack} disabled={packing} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white text-[#0F1E3C] rounded-lg hover:bg-slate-100 disabled:opacity-60">
              {packing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />} Generate Monthly Review Pack
            </button>
            {canAssist && (
              <button onClick={() => { setEditing(null); setAutoDraft(true); setModal(true); }} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-lg hover:opacity-90">
                <Sparkles className="w-4 h-4" /> Generate Draft from Current Data
              </button>
            )}
            <button onClick={() => { setEditing(null); setAutoDraft(false); setModal(true); }} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white text-[#0F1E3C] rounded-lg hover:bg-slate-100">
              <Plus className="w-4 h-4" /> New Report
            </button>
          </div>
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

          {/* Posture context — the Monthly Review Pack draws on the latest posture assessment. */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#0F1E3C] flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-white" /></div>
              <div>
                <div className="text-sm font-semibold text-slate-800">Cyber Posture</div>
                {posture.latest ? (
                  <div className="text-xs text-slate-500">
                    Score <b style={{ color: scoreBand(posture.latest.overall_score).color }}>{Math.round(posture.latest.overall_score || 0)}/100</b>
                    {posture.delta !== null && <> · {posture.delta >= 0 ? '+' : ''}{posture.delta} vs previous</>}
                    {' · '}{posture.latest.assessment_date || '—'}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500">No posture assessment yet — run one to enrich the review pack.</div>
                )}
              </div>
            </div>
            <Link to="/acolyte/posture" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
              Open Posture Assessment <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {rows.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
              {reports.length === 0 ? 'No executive cyber reports have been created yet. Create one, or generate a draft from a readiness review.' : 'No reports match this status.'}
            </div>
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
                    {!readOnly && canAssist && <button onClick={() => setDraftFor(r)} className="p-1.5 rounded-lg text-purple-600 hover:bg-purple-50" title="Draft Executive Report with ACOLYTE Analyst Assistant"><Sparkles className="w-4 h-4" /></button>}
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
          orgName={orgNameForProject} canAssist={!readOnly && canAssist} autoDraft={autoDraft}
          onClose={() => setModal(false)} onSaved={() => { setModal(false); load(); }} />
      )}
      {preview && (
        <ReportPreview report={preview} project={project} orgName={orgNameForProject} onClose={() => setPreview(null)} />
      )}

      {draftFor && (
        <AssistantPanel
          open={!!draftFor}
          title="Draft Executive Report"
          actionLabel="Draft Executive Report"
          applyLabel="Apply to Executive Summary"
          organizationId={project?.organization_id}
          user={user}
          targetEntity="AcolyteExecutiveReport"
          targetRecordId={draftFor.id}
          generate={async () => {
            const [findings, remediations, irRows] = await Promise.all([
              base44.entities.CyberFinding.filter({ project_id: projectId }).catch(() => []),
              base44.entities.AcolyteRemediationItem.filter({ project_id: projectId }).catch(() => []),
              base44.entities.IncidentReadinessRecord.filter({ project_id: projectId }).catch(() => []),
            ]);
            return draftExecutiveSummary({ project, orgName: orgNameForProject, profile, findings, remediations, incident: irRows[0] });
          }}
          onApply={async (text) => {
            await base44.entities.AcolyteExecutiveReport.update(draftFor.id, { executive_summary: toHtml(text) });
            load();
          }}
          onClose={() => setDraftFor(null)}
        />
      )}
    </div>
  );
}