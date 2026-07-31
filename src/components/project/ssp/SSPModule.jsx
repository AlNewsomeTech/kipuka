import { useState, useEffect, useCallback, useMemo } from 'react';
import { FileStack, Loader2, Wand2, FileDown, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import RichTextField from '@/components/ui/RichTextField';
import ProgressBar from '@/components/ProgressBar';
import { SSP_SECTIONS, sectionCompletion, buildSspDraft } from '@/lib/sspSections';
import { generateSspPdf } from '@/lib/reportGenerators';
import { computeReadiness, sspPrechecks, allPass, FINAL_DOC_WARNING } from '@/lib/readinessGate';
import ReadinessPrecheck from '@/components/project/ReadinessPrecheck';

export default function SSPModule({ project, org, readOnly, currentUser }) {
  const [ssp, setSsp] = useState(null);
  const [statements, setStatements] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [objectiveLibrary, setObjectiveLibrary] = useState([]);
  const [objectiveLinks, setObjectiveLinks] = useState([]);
  const [ctx, setCtx] = useState({ scoping: null, assets: [], poams: [], providers: [], diagrams: [] });
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [savingKey, setSavingKey] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [sspList, stmts, asmt, ev, objectives, links, scope, assets, poams, providers, diagrams] = await Promise.all([
      base44.entities.SystemSecurityPlan.filter({ project_id: project.id }).catch(() => []),
      base44.entities.SSPControlStatement.filter({ project_id: project.id }).catch(() => []),
      base44.entities.ControlAssessment.filter({ project_id: project.id }).catch(() => []),
      base44.entities.ProjectEvidence.filter({ project_id: project.id }).catch(() => []),
      base44.entities.AssessmentObjectiveLibrary.filter({ active: true, cmmc_level: project.target_cmmc_level }, 'sort_order', 500).catch(() => []),
      base44.entities.ObjectiveEvidenceLink.filter({ project_id: project.id }, 'objective_id', 500).catch(() => []),
      base44.entities.ScopingProfile.filter({ project_id: project.id }).catch(() => []),
      base44.entities.Asset.filter({ project_id: project.id }).catch(() => []),
      base44.entities.ProjectPOAM.filter({ project_id: project.id }).catch(() => []),
      base44.entities.ServiceProvider.filter({ project_id: project.id }).catch(() => []),
      base44.entities.ProjectDiagram.filter({ project_id: project.id }).catch(() => []),
    ]);
    setSsp(sspList[0] || null);
    setStatements(stmts);
    setAssessments(asmt);
    setEvidence(ev);
    setObjectiveLibrary(objectives);
    setObjectiveLinks(links);
    setCtx({ scoping: scope[0] || null, assets, poams, providers, diagrams });
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const completion = useMemo(() => sectionCompletion(ssp), [ssp]);

  // Controls missing an SSP control statement, and controls without evidence.
  const evByControl = useMemo(() => {
    const m = {}; evidence.forEach((e) => (e.control_ids || []).forEach((c) => (m[c] = true))); return m;
  }, [evidence]);
  const missingStatements = useMemo(() => {
    const have = new Set(statements.map((s) => s.control_id));
    return assessments.filter((a) => !have.has(a.control_id) || !statements.find((s) => s.control_id === a.control_id)?.implementation_statement);
  }, [assessments, statements]);
  const controlsNoEvidence = useMemo(() => assessments.filter((a) => !evByControl[a.control_id]), [assessments, evByControl]);

  const readiness = useMemo(
    () => computeReadiness({ assessments, objectiveLibrary, objectiveLinks, evidence, poams: ctx.poams, assets: ctx.assets, scoping: ctx.scoping, project }),
    [assessments, objectiveLibrary, objectiveLinks, evidence, ctx, project]
  );
  const checks = useMemo(() => sspPrechecks(readiness), [readiness]);
  const finalReady = allPass(checks);
  const [showFinalGate, setShowFinalGate] = useState(false);

  // "Final SSP" = mark approval status In Review and export. Gated by pre-checks
  // but never hard-blocked — user may continue anyway.
  const exportFinal = async () => {
    if (ssp?.approval_status === 'Draft') await updateApproval({ approval_status: 'In Review' });
    generateSspPdf({ project, org, ssp, statements, generatedBy: currentUser?.full_name || currentUser?.email, diagrams: ctx.diagrams, poams: ctx.poams, assessments });
    setShowFinalGate(false);
  };

  const buildDraft = async () => {
    setBuilding(true);
    const draft = buildSspDraft({ project, org, scoping: ctx.scoping, assets: ctx.assets, assessments, evidence, poams: ctx.poams, providers: ctx.providers, diagrams: ctx.diagrams });
    const payload = { ...draft, organization_id: project.organization_id, project_id: project.id, version: ssp?.version || '1.0', approval_status: ssp?.approval_status || 'Draft' };
    let saved;
    if (ssp?.id) saved = await base44.entities.SystemSecurityPlan.update(ssp.id, payload);
    else saved = await base44.entities.SystemSecurityPlan.create(payload);

    // Sync control statements from assessments.
    const have = new Set(statements.map((s) => s.control_id));
    const toCreate = assessments.filter((a) => !have.has(a.control_id)).map((a) => ({
      organization_id: project.organization_id, project_id: project.id, ssp_id: saved.id,
      control_id: a.control_id, control_title: a.control_title,
      implementation_statement: a.ssp_statement || '', responsible_owner: a.responsible_owner || '',
      statement_status: a.ssp_statement ? 'Draft' : 'Not Started',
    }));
    if (toCreate.length) await base44.entities.SSPControlStatement.bulkCreate(toCreate);
    await load();
    setBuilding(false);
  };

  const saveSection = async (key, value) => {
    setSsp((s) => ({ ...s, [key]: value }));
  };
  const commitSection = async (key) => {
    if (!ssp?.id) return;
    setSavingKey(key);
    await base44.entities.SystemSecurityPlan.update(ssp.id, { [key]: ssp[key] });
    setSavingKey(null);
  };

  const updateApproval = async (patch) => {
    const saved = await base44.entities.SystemSecurityPlan.update(ssp.id, patch);
    setSsp(saved);
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

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
              <button onClick={buildDraft} disabled={building}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-60">
                {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {ssp ? 'Rebuild Draft SSP' : 'Build Draft SSP'}
              </button>
            )}
            {ssp && (
              <button onClick={() => generateSspPdf({ project, org, ssp, statements, generatedBy: currentUser?.full_name || currentUser?.email, diagrams: ctx.diagrams, poams: ctx.poams, assessments })}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200">
                <FileDown className="w-4 h-4" /> Draft SSP PDF
              </button>
            )}
            {ssp && !readOnly && (
              <button onClick={() => (finalReady ? exportFinal() : setShowFinalGate(true))}
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
            <button onClick={() => generateSspPdf({ project, org, ssp, statements, generatedBy: currentUser?.full_name || currentUser?.email, diagrams: ctx.diagrams, poams: ctx.poams, assessments })}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200">Generate Draft SSP</button>
            <button onClick={exportFinal}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700">Continue Anyway</button>
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

          {/* Sections */}
          <div className="space-y-3">
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

          {/* Approval block */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Approval & Revision</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Version</label>
                <input className="form-input" value={ssp.version || ''} disabled={readOnly}
                  onChange={(e) => setSsp((s) => ({ ...s, version: e.target.value }))} onBlur={() => commitSection('version')} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Approval Status</label>
                <select className="form-input" value={ssp.approval_status} disabled={readOnly}
                  onChange={(e) => updateApproval({ approval_status: e.target.value })}>
                  {['Draft', 'In Review', 'Approved', 'Archived'].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Approved By</label>
                <input className="form-input" value={ssp.approved_by || ''} disabled={readOnly}
                  onChange={(e) => setSsp((s) => ({ ...s, approved_by: e.target.value }))} onBlur={() => commitSection('approved_by')} />
              </div>
            </div>
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