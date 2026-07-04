import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, Plus, Loader2, Archive, Pencil, FileText, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAcolyteScope } from '@/lib/useAcolyteScope';
import { logAudit, AUDIT_ACTIONS } from '@/lib/auditLog';
import { REVIEW_TYPES, REVIEW_STATUSES } from '@/lib/acolyte';
import { canUseAssistant, draftReviewNarrative } from '@/lib/acolyteAssistant';
import AcolyteHeader from '@/components/acolyte/AcolyteHeader';
import AcolyteProjectBar from '@/components/acolyte/AcolyteProjectBar';
import NoProjectState from '@/components/acolyte/NoProjectState';
import ReviewFormModal from '@/components/acolyte/ReviewFormModal';
import AssistantPanel from '@/components/acolyte/AssistantPanel';
import StatusBadge from '@/components/StatusBadge';

export default function ReadinessReviews() {
  const scope = useAcolyteScope();
  const navigate = useNavigate();
  const { project, projects, projectId, selectProject, orgNameForProject, readOnly, orgRole, user } = scope;
  const [narrativeFor, setNarrativeFor] = useState(null);
  const canAssist = canUseAssistant(orgRole, 'draft_review');
  const toHtml = (t) => `<p>${(t || '').replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;
  const [reviews, setReviews] = useState([]);
  const [findings, setFindings] = useState([]);
  const [remediations, setRemediations] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [fType, setFType] = useState('All');
  const [fStatus, setFStatus] = useState('All');

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    const [rv, f, r, ev] = await Promise.all([
      base44.entities.CyberReadinessReview.filter({ project_id: projectId }, '-created_date').catch(() => []),
      base44.entities.CyberFinding.filter({ project_id: projectId }).catch(() => []),
      base44.entities.AcolyteRemediationItem.filter({ project_id: projectId }).catch(() => []),
      base44.entities.ProjectEvidence.filter({ project_id: projectId }).catch(() => []),
    ]);
    setReviews(rv); setFindings(f); setRemediations(r); setEvidence(ev);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => reviews.filter((r) =>
    (fType === 'All' || r.review_type === fType) && (fStatus === 'All' || r.review_status === fStatus)
  ), [reviews, fType, fStatus]);

  const archive = async (r) => {
    await base44.entities.CyberReadinessReview.update(r.id, { review_status: 'Archived' });
    await logAudit({ organizationId: r.organization_id, user, actionType: AUDIT_ACTIONS.ACOLYTE_REVIEW_ARCHIVE, targetEntity: 'CyberReadinessReview', targetRecordId: r.id, summary: `Archived readiness review "${r.review_title}".` });
    load();
  };

  const createReportFromReview = async (r) => {
    const report = await base44.entities.AcolyteExecutiveReport.create({
      organization_id: r.organization_id || project.organization_id || '',
      project_id: project.id,
      report_title: `Executive Cyber Report — ${r.review_title}`,
      report_period_start: r.review_period_start || '',
      report_period_end: r.review_period_end || '',
      prepared_by: r.prepared_by || 'Pacific Global Security Group',
      report_status: 'Draft',
      executive_summary: r.executive_summary || '',
      major_risks: r.key_risks || '',
      completed_actions: r.completed_actions || '',
      next_recommended_actions: r.recommended_next_steps || '',
      leadership_decisions_needed: r.leadership_decisions_needed || '',
      linked_review_ids: [r.id],
      linked_finding_ids: r.linked_finding_ids || [],
      linked_remediation_ids: r.linked_remediation_ids || [],
      linked_evidence_ids: r.linked_evidence_ids || [],
    });
    await logAudit({ organizationId: r.organization_id, user, actionType: AUDIT_ACTIONS.ACOLYTE_REPORT_CREATE, targetEntity: 'AcolyteExecutiveReport', targetRecordId: report.id, summary: `Created executive report from review "${r.review_title}".` });
    navigate('/acolyte/reports');
  };

  return (
    <div className="space-y-4">
      <AcolyteHeader
        title="Readiness Reviews"
        subtitle="Document manual monthly, quarterly, annual, and on-demand cyber readiness reviews."
        icon={CalendarCheck}
        darkHorizon
        right={!readOnly && project ? (
          <button onClick={() => { setEditing(null); setModal(true); }} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white text-[#0F1E3C] rounded-lg hover:bg-slate-100">
            <Plus className="w-4 h-4" /> New Review
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
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3">
            <select className="form-input w-auto" value={fType} onChange={(e) => setFType(e.target.value)}>
              <option value="All">All types</option>
              {REVIEW_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="form-input w-auto" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="All">All statuses</option>
              {REVIEW_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {rows.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
              {reviews.length === 0 ? 'No readiness reviews have been recorded yet.' : 'No readiness reviews in this view.'}
            </div>
          ) : (
            <div className="relative pl-6 space-y-3">
              <div className="absolute left-2 top-2 bottom-2 w-px bg-slate-200" />
              {rows.map((r) => (
                <div key={r.id} className="relative bg-white rounded-xl border border-slate-200 p-5">
                  <div className="absolute -left-[18px] top-6 w-3 h-3 rounded-full bg-[#0F1E3C] border-2 border-white" />
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-slate-800">{r.review_title}</h3>
                        <StatusBadge status={r.review_status} size="xs" />
                        <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{r.review_type}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {r.review_period_start || '—'} to {r.review_period_end || '—'} · Readiness {Math.round(r.readiness_score || 0)}% · Prepared by {r.prepared_by || '—'}
                      </div>
                      {r.executive_summary && (
                        <div className="prose prose-slate prose-sm max-w-none text-slate-600 mt-2 line-clamp-3" dangerouslySetInnerHTML={{ __html: r.executive_summary }} />
                      )}
                    </div>
                    {!readOnly && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {canAssist && (
                          <button onClick={() => setNarrativeFor(r)} title="Draft Review Narrative with ACOLYTE Analyst Assistant"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-white border border-purple-200 hover:bg-purple-50">
                            <Sparkles className="w-3.5 h-3.5" /> Draft Narrative
                          </button>
                        )}
                        <button onClick={() => createReportFromReview(r)} title="Create Executive Report from Review"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200">
                          <FileText className="w-3.5 h-3.5" /> Report
                        </button>
                        <button onClick={() => { setEditing(r); setModal(true); }} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" title="Edit"><Pencil className="w-4 h-4" /></button>
                        {r.review_status !== 'Archived' && (
                          <button onClick={() => archive(r)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" title="Archive"><Archive className="w-4 h-4" /></button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {modal && project && (
        <ReviewFormModal project={project} existing={editing} findings={findings} remediations={remediations} evidence={evidence} user={user}
          onClose={() => setModal(false)} onSaved={() => { setModal(false); load(); }} />
      )}

      {narrativeFor && (
        <AssistantPanel
          open={!!narrativeFor}
          title="Draft Review Narrative"
          actionLabel="Draft Review Narrative"
          applyLabel="Apply to Executive Summary"
          organizationId={project?.organization_id}
          user={user}
          targetEntity="CyberReadinessReview"
          targetRecordId={narrativeFor.id}
          generate={async () => {
            const linkedF = findings.filter((f) => (narrativeFor.linked_finding_ids || []).includes(f.id));
            const linkedR = remediations.filter((r) => (narrativeFor.linked_remediation_ids || []).includes(r.id));
            const irRows = await base44.entities.IncidentReadinessRecord.filter({ project_id: projectId }).catch(() => []);
            return draftReviewNarrative({
              project, orgName: orgNameForProject, review: narrativeFor,
              findings: linkedF.length ? linkedF : findings,
              remediations: linkedR.length ? linkedR : remediations,
              incident: irRows[0],
            });
          }}
          onApply={async (text) => {
            await base44.entities.CyberReadinessReview.update(narrativeFor.id, { executive_summary: toHtml(text) });
            load();
          }}
          onClose={() => setNarrativeFor(null)}
        />
      )}
    </div>
  );
}