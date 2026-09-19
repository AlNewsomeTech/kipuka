import { useState, useEffect, useCallback, useMemo } from 'react';
import { FileStack, Loader2, Wand2, FileDown, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import RichTextField from '@/components/ui/RichTextField';
import ProgressBar from '@/components/ProgressBar';
import { SSP_SECTIONS, sectionCompletion, buildSspDraft } from '@/lib/sspSections';
import { generateSspPdf } from '@/lib/reportGenerators';
import { generateSspDocx } from '@/lib/sspDocxExport';
import {
  computeReadiness, sspPrechecks, allPass, FINAL_DOC_WARNING, validApprovedSsp,
} from '@/lib/readinessGate';
import ReadinessPrecheck from '@/components/project/ReadinessPrecheck';
import SSPStatementEditor from '@/components/project/ssp/SSPStatementEditor';
import { hasSspStatement, planSspControlStatements, saveSspControlStatements } from '@/lib/sspControlStatements';

export default function SSPModule({ project, org, readOnly, currentUser }) {
  const [ssp, setSsp] = useState(null);
  const [statements, setStatements] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [objectiveLibrary, setObjectiveLibrary] = useState([]);
  const [objectiveLinks, setObjectiveLinks] = useState([]);
  const [ctx, setCtx] = useState({ scoping: null, assets: [], poams: [], providers: [], diagrams: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState('');
  const [exportingDraft, setExportingDraft] = useState(false);
  const [exportError, setExportError] = useState('');
  const [statementSaving, setStatementSaving] = useState(false);
  const [dirtyStatementIds, setDirtyStatementIds] = useState([]);
  const statementsBusy = statementSaving || dirtyStatementIds.length > 0;
  const [savingKey, setSavingKey] = useState(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewNote, setReviewNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [sspList, stmts, asmt, ev, objectives, links, scope, assets, poams, providers, diagrams] = await Promise.all([
        base44.entities.SystemSecurityPlan.filter({ project_id: project.id }),
        base44.entities.SSPControlStatement.filter({ project_id: project.id }, 'control_id', 500),
        base44.entities.ControlAssessment.filter({ project_id: project.id }, 'control_id', 500),
        base44.entities.ProjectEvidence.filter({ project_id: project.id }),
        base44.entities.AssessmentObjectiveLibrary.filter({ active: true, cmmc_level: project.target_cmmc_level }, 'sort_order', 500),
        base44.entities.ObjectiveEvidenceLink.filter({ project_id: project.id }, 'objective_id', 500),
        base44.entities.ScopingProfile.filter({ project_id: project.id }),
        base44.entities.Asset.filter({ project_id: project.id }),
        base44.entities.ProjectPOAM.filter({ project_id: project.id }),
        base44.entities.ServiceProvider.filter({ project_id: project.id }),
        base44.entities.ProjectDiagram.filter({ project_id: project.id }),
      ]);
      setSsp(sspList[0] || null);
      setStatements(stmts.filter((statement) => !statement.ssp_id || statement.ssp_id === sspList[0]?.id));
      setAssessments(asmt);
      setEvidence(ev);
      setObjectiveLibrary(objectives);
      setObjectiveLinks(links);
      setCtx({ scoping: scope[0] || null, assets, poams, providers, diagrams });
    } catch (error) {
      setLoadError(error?.response?.data?.error || error?.message || 'Kipuka could not verify the complete SSP source data.');
    } finally {
      setLoading(false);
    }
  }, [project.id, project.target_cmmc_level]);

  useEffect(() => { load(); }, [load]);

  const completion = useMemo(() => sectionCompletion(ssp), [ssp]);
  const isReviewSubmitter = Boolean(ssp?.review_requested_by_user_id
    && ssp.review_requested_by_user_id === currentUser?.id)
    || Boolean(ssp?.review_requested_by_email
      && String(ssp.review_requested_by_email).toLowerCase() === String(currentUser?.email || '').toLowerCase());

  // Controls missing an SSP control statement, and controls without evidence.
  const evByControl = useMemo(() => {
    const m = {}; evidence.forEach((e) => (e.control_ids || []).forEach((c) => (m[c] = true))); return m;
  }, [evidence]);
  const missingStatements = useMemo(() => {
    const have = new Set(statements.filter((s) => hasSspStatement(s.implementation_statement)).map((s) => s.control_id));
    return assessments.filter((a) => !have.has(a.control_id));
  }, [assessments, statements]);
  const controlsNoEvidence = useMemo(() => assessments.filter((a) => !evByControl[a.control_id]), [assessments, evByControl]);

  const readiness = useMemo(
    () => computeReadiness({ assessments, objectiveLibrary, objectiveLinks, evidence, poams: ctx.poams, assets: ctx.assets, scoping: ctx.scoping, project }),
    [assessments, objectiveLibrary, objectiveLinks, evidence, ctx, project]
  );
  const checks = useMemo(() => [
    ...sspPrechecks(readiness),
    { label: 'Is every required SSP section complete?', pass: completion.pct === 100 },
    { label: 'Has the SSP been independently approved?', pass: validApprovedSsp(ssp) },
  ], [readiness, completion.pct, ssp]);
  const finalReady = allPass(checks);
  const [showFinalGate, setShowFinalGate] = useState(false);

  const exportDraft = async () => {
    if (!ssp || building || statementsBusy || exportingDraft) return;
    setExportingDraft(true); setExportError('');
    try {
      await generateSspDocx({ project, org, ssp, statements, generatedBy: currentUser?.full_name || currentUser?.email, diagrams: ctx.diagrams, poams: ctx.poams, assessments });
    } catch (error) {
      setExportError(error?.message || 'The Word document could not be downloaded.');
    } finally { setExportingDraft(false); }
  };

  // Final PDF output remains gated; draft downloads are editable Word documents.
  const exportFinal = async () => {
    if (!finalReady) {
      setShowFinalGate(true);
      return;
    }
    await generateSspPdf({ project, org, ssp, statements, generatedBy: currentUser?.full_name || currentUser?.email, diagrams: ctx.diagrams, poams: ctx.poams, assessments });
    setShowFinalGate(false);
  };

  const buildDraft = async () => {
    if (readOnly || building || statementsBusy) return;
    setBuilding(true);
    setBuildError('');
    try {
      // Resolve current tool selections at the user's build action, not from a
      // global/selected client. Ambiguous organization clients are never guessed.
      const [securityTools, clients, profiles, library, freshStatements, freshAssessments, mappings] = await Promise.all([
        base44.entities.ProjectSecurityTool.filter({ project_id: project.id }, '-created_date', 500),
        project.organization_id ? base44.entities.Client.filter({ organization_id: project.organization_id }) : Promise.resolve([]),
        project.organization_id ? base44.entities.CompanyProfile.filter({ organization_id: project.organization_id }) : Promise.resolve([]),
        base44.entities.ControlLibrary.filter({ active: true, authoritative: true }, 'sort_order', 500),
        base44.entities.SSPControlStatement.filter({ project_id: project.id }, 'control_id', 500),
        base44.entities.ControlAssessment.filter({ project_id: project.id }, 'control_id', 500),
        base44.entities.ToolControlMapping.filter({ project_id: project.id }, 'control_id', 500),
      ]);
      const ownClients = clients.filter((item) => item.organization_id === project.organization_id);
      const ownProfiles = profiles.filter((item) => item.organization_id === project.organization_id);
      const context = {
        project, scoping: ctx.scoping, assets: ctx.assets, providers: ctx.providers, securityTools,
        client: ownClients.length === 1 ? ownClients[0] : null,
        companyProfile: ownProfiles.length === 1 ? ownProfiles[0] : null,
      };
      // Plan before writing anything. Existing blank rows are repaired, not skipped.
      const statementPlan = planSspControlStatements({
        project, assessments: freshAssessments,
        statements: freshStatements.filter((statement) => !statement.ssp_id || statement.ssp_id === ssp?.id),
        library, context, mappings,
      });
      const draft = buildSspDraft({
        ...context, org, assessments: freshAssessments, evidence,
        poams: ctx.poams, diagrams: ctx.diagrams, existingSsp: ssp,
      });
      const payload = { ...draft, organization_id: project.organization_id, project_id: project.id, version: ssp?.version || '1.0' };
      let saved;
      if (ssp?.id) saved = await base44.entities.SystemSecurityPlan.update(ssp.id, payload);
      else saved = await base44.entities.SystemSecurityPlan.create(payload);

      await saveSspControlStatements(project, saved.id, statementPlan);
      await load();
    } catch (error) {
      setBuildError(error?.response?.data?.error || error?.message || 'The SSP draft was not saved.');
    } finally {
      setBuilding(false);
    }
  };

  const saveSection = async (key, value) => {
    setSsp((s) => ({ ...s, [key]: value }));
  };
  const commitSection = async (key) => {
    if (!ssp?.id) return;
    setSavingKey(key);
    try {
      const saved = await base44.entities.SystemSecurityPlan.update(ssp.id, { [key]: ssp[key] });
      setSsp(saved);
    } finally {
      setSavingKey(null);
    }
  };

  const runReview = async (action) => {
    if (!ssp?.id) return;
    setReviewBusy(true);
    setReviewError('');
    try {
      const transitionId = `ssp_${action}_${crypto.randomUUID().replace(/-/g, '')}`;
      const response = await base44.functions.invoke('manageFinalDocumentReview', {
        source_entity: 'SystemSecurityPlan',
        record_id: ssp.id,
        action,
        transition_id: transitionId,
        note: reviewNote,
      });
      setSsp(response.data.document);
      setReviewNote('');
    } catch (error) {
      setReviewError(error?.response?.data?.error || error?.message || 'The SSP review transition failed closed.');
    } finally {
      setReviewBusy(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  if (loadError) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-red-800"><AlertTriangle className="w-4 h-4" /> SSP source data could not be verified</div>
      <p className="text-[13px] text-red-700 mt-2">{loadError}</p>
      <p className="text-xs text-red-600 mt-1">Kipuka will not build or export an SSP from a partial data load.</p>
      <button onClick={load} className="mt-3 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-700 hover:bg-red-800">Retry complete load</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <FileStack className="w-5 h-5 text-[#0F1E3C]" />
            <h1 className="text-lg font-bold text-slate-900">System Security Plan</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            {!readOnly && (
              <button onClick={buildDraft} disabled={building || statementsBusy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-60">
                {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {ssp ? 'Rebuild Draft SSP' : 'Build Draft SSP'}
              </button>
            )}
            {ssp && (
              <button disabled={building || statementsBusy || exportingDraft} onClick={exportDraft}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200">
                {exportingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} {exportingDraft ? 'Preparing Word document…' : 'Download Draft SSP (.docx)'}
              </button>
            )}
            {ssp && !readOnly && (
              <button disabled={building || statementsBusy} onClick={() => (finalReady ? exportFinal() : setShowFinalGate(true))}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-green-700 hover:bg-green-800">
                <FileDown className="w-4 h-4" /> Final SSP
              </button>
            )}
          </div>
        </div>

        <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">
          Generate draft SSP content early for planning, but generate the final SSP only after implementation,
          evidence collection, control validation, and final inventory are complete.
        </p>
        {dirtyStatementIds.length > 0 && <p role="status" className="mt-3 text-sm text-muted-foreground">Save or discard your control statement edits before rebuilding, exporting, or submitting for review.</p>}
        {exportError && <p role="alert" className="mt-3 text-sm text-destructive">{exportError}</p>}
        {buildError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <span className="font-semibold">Draft save failed:</span> {buildError}
          </div>
        )}

        {ssp && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Section completion</span><span>{completion.done}/{completion.total} ({completion.pct}%)</span>
            </div>
            <ProgressBar value={completion.pct} label={null} />
          </div>
        )}
      </div>

      {showFinalGate && (
        <div className="space-y-3">
          <ReadinessPrecheck title="Final SSP — Readiness Pre-Check" checks={checks} warning={FINAL_DOC_WARNING} />
          <div className="flex flex-wrap gap-2">
            <button onClick={exportDraft} disabled={building || statementsBusy || exportingDraft}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200">{exportingDraft ? 'Preparing Word document…' : 'Download Draft SSP (.docx)'}</button>
            <button onClick={() => setShowFinalGate(false)}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">Return to Implementation Checklist</button>
          </div>
        </div>
      )}

      {!ssp ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          No SSP yet. {!readOnly && 'Click "Build Draft SSP" to draft one from your project, scoping, asset, control, evidence, and POA&M data.'}
        </div>
      ) : (
        <>
          {/* Gaps */}
          {(missingStatements.length > 0 || controlsNoEvidence.length > 0) && (
            <div className="grid sm:grid-cols-2 gap-3">
              <GapCard title="Missing Control Statements" items={missingStatements.map((a) => `${a.control_id} — ${a.control_title}`)} />
              <GapCard title="Controls Without Evidence" items={controlsNoEvidence.map((a) => `${a.control_id} — ${a.control_title}`)} />
            </div>
          )}

          <section className="space-y-3" aria-label="Control implementation statements">
            <h2 className="text-lg font-semibold text-foreground">Control Implementation Statements ({statements.length})</h2>
            <p className="text-sm text-muted-foreground">Each control has its own saved narrative below. Expand a control to review or edit it; draft wording does not change its implementation or evidence status.</p>
            {statements.length === 0 && <p className="text-sm text-muted-foreground">No individual statements have been saved yet. Rebuild Draft SSP to generate them from the project’s controls.</p>}
            {statements.map((statement) => (
              <SSPStatementEditor key={statement.id} statement={statement}
                readOnly={readOnly || building || statementSaving || ssp.approval_status === 'Approved' || ssp.approval_status === 'In Review'}
                onSavingChange={setStatementSaving}
                onDirtyChange={(dirty) => setDirtyStatementIds((ids) => dirty ? [...new Set([...ids, statement.id])] : ids.filter((id) => id !== statement.id))}
                onSaved={(saved) => setStatements((rows) => rows.map((row) => row.id === saved.id ? saved : row))} />
            ))}
          </section>

          {/* Keep general project descriptions separate from the control narratives. */}
          <details className="rounded-xl border border-border bg-card p-4">
          <summary className="cursor-pointer text-sm font-semibold text-card-foreground">System description and scope</summary>
          <div className="mt-4 space-y-3">
            {SSP_SECTIONS.map((s) => (
              <div key={s.key} className="bg-white rounded-xl border border-slate-200 p-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">{s.label}</label>
                {s.short ? (
                  <input className="form-input" value={ssp[s.key] || ''} disabled={readOnly}
                    onChange={(e) => saveSection(s.key, e.target.value)} onBlur={() => commitSection(s.key)} />
                ) : (
                  <RichTextField label={null} value={ssp[s.key]} placeholder="" disabled={readOnly}
                    onChange={(v) => saveSection(s.key, v)} onBlur={() => commitSection(s.key)} />
                )}
                {savingKey === s.key && <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>}
              </div>
            ))}
          </div>
          </details>



          {/* Approval block */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Independent Review &amp; Revision</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Version</label>
                <input className="form-input" value={ssp.version || ''} disabled={readOnly}
                  onChange={(e) => setSsp((s) => ({ ...s, version: e.target.value }))} onBlur={() => commitSection('version')} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Approval Status</label>
                <div className="form-input bg-slate-50">
                  {ssp.approval_status === 'Approved' && !validApprovedSsp(ssp)
                    ? 'Legacy Approved — independent review required'
                    : ssp.approval_status}
                </div>
              </div>
            </div>
            {!readOnly && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-600">
                  Submission pins the current SSP content with SHA-256. The submitter cannot approve the same version.
                  Any later edit returns it to Draft and clears approval credit.
                </p>
                {ssp.approval_status === 'In Review' && (
                  <textarea className="form-input mt-2" rows={2} value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Reviewer note. Required when rejecting." />
                )}
                {reviewError && <p className="text-xs text-red-700 mt-2">{reviewError}</p>}
                <div className="flex flex-wrap gap-2 mt-3">
                  {(ssp.approval_status === 'Draft' || (ssp.approval_status === 'Approved' && !validApprovedSsp(ssp))) && (
                    <button onClick={() => runReview('submit_review')} disabled={reviewBusy || building || statementsBusy}
                      className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-[#0F1E3C] disabled:opacity-60">
                      Submit for Independent Review
                    </button>
                  )}
                  {ssp.approval_status === 'In Review' && isReviewSubmitter && (
                    <button onClick={() => runReview('withdraw')} disabled={reviewBusy}
                      className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 disabled:opacity-60">Withdraw My Submission</button>
                  )}
                  {ssp.approval_status === 'In Review' && !isReviewSubmitter && (
                    <>
                      <button onClick={() => runReview('approve')} disabled={reviewBusy}
                        className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-green-700 disabled:opacity-60">Approve Current Hash</button>
                      <button onClick={() => runReview('reject')} disabled={reviewBusy || reviewNote.trim().length < 5}
                        className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-red-700 disabled:opacity-60">Reject to Draft</button>
                    </>
                  )}
                </div>
                {validApprovedSsp(ssp) && (
                  <p className="text-xs text-green-700 mt-2">
                    Approved by {ssp.reviewed_by_name || ssp.approved_by} on {ssp.approved_date}. Approval record {ssp.approval_record_id}.
                  </p>
                )}
              </div>
            )}
            <div className="mt-3">
              <RichTextField label="Revision History" value={ssp.revision_history} placeholder="" disabled={readOnly}
                onChange={(v) => setSsp((s) => ({ ...s, revision_history: v }))} onBlur={() => commitSection('revision_history')} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function GapCard({ title, items }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-sm font-bold text-amber-800 mb-2">
        <AlertTriangle className="w-4 h-4" /> {title} ({items.length})
      </div>
      {items.length === 0 ? <p className="text-xs text-amber-700">None.</p> : (
        <ul className="space-y-0.5 max-h-40 overflow-y-auto">
          {items.map((t, i) => <li key={i} className="text-xs text-amber-700 font-mono">{t}</li>)}
        </ul>
      )}
    </div>
  );
}