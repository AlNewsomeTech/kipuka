import { useState, useEffect, useCallback, useMemo } from 'react';
import { Gavel, Loader2, Plus, FileDown, ChevronDown, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useOrg } from '@/lib/orgContext';
import { PLAN_FEATURES, planHasFeature } from '@/lib/planTiers';
import PlanUpgradePanel from '@/components/commercial/PlanUpgradePanel';
import ProgressBar from '@/components/ProgressBar';
import {
  buildObjectiveWorklist, evidenceForControl, computeSessionStats,
  failedByControl, OVERALL_STYLE,
} from '@/lib/mockAssessment';
import { generateMockAssessmentReport } from '@/lib/reportGenerators';
import ObjectiveAssessRow from './ObjectiveAssessRow';

export default function MockAssessmentModule({ project, org, readOnly, currentUser }) {
  const { planHas, isPlatformAdmin } = useOrg();
  const [sessions, setSessions] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [objectives, setObjectives] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [openDomains, setOpenDomains] = useState({});

  // Gate against the org whose project is being viewed (prop), not the viewer's
  // own org context — platform staff viewing a client org were wrongly locked out.
  const allowed = isPlatformAdmin || (org ? planHasFeature(org, PLAN_FEATURES.MOCK_ASSESSMENT) : planHas(PLAN_FEATURES.MOCK_ASSESSMENT));

  const load = useCallback(async () => {
    setLoading(true);
    const [sess, asmt, ev] = await Promise.all([
      base44.entities.MockAssessmentSession.filter({ project_id: project.id }, '-created_date').catch(() => []),
      base44.entities.ControlAssessment.filter({ project_id: project.id }).catch(() => []),
      base44.entities.ProjectEvidence.filter({ project_id: project.id }).catch(() => []),
    ]);
    setSessions(sess);
    setAssessments(asmt);
    setEvidence(ev);
    setActiveId((prev) => (prev && sess.some((s) => s.id === prev) ? prev : sess[0]?.id || null));
    setLoading(false);
  }, [project.id]);

  useEffect(() => { if (allowed) load(); else setLoading(false); }, [load, allowed]);

  const loadObjectives = useCallback(async (sessionId) => {
    if (!sessionId) { setObjectives([]); return; }
    const objs = await base44.entities.MockAssessmentObjective.filter({ session_id: sessionId }).catch(() => []);
    setObjectives(objs);
  }, []);

  useEffect(() => { loadObjectives(activeId); }, [activeId, loadObjectives]);

  const activeSession = sessions.find((s) => s.id === activeId) || null;

  // Create a new session, seeding objective rows from tracked controls.
  const createSession = async () => {
    if (!assessments.length) return;
    setCreating(true);
    const scopeLevel = project.target_cmmc_level === 'Level 1' ? 'Level 1' : 'Level 2';
    const session = await base44.entities.MockAssessmentSession.create({
      organization_id: project.organization_id, project_id: project.id,
      session_name: `Mock Assessment ${new Date().toLocaleDateString()}`,
      scope_level: scopeLevel, run_by: currentUser?.full_name || currentUser?.email || '',
      session_date: new Date().toISOString().slice(0, 10), status: 'In Progress',
    });
    const worklist = buildObjectiveWorklist(assessments);
    const rows = worklist.map((w) => ({
      organization_id: project.organization_id, project_id: project.id, session_id: session.id,
      control_id: w.control_id, control_title: w.control_title, domain: w.domain,
      objective_id: w.objective_id, objective_text: w.objective_text, verdict: 'Not Assessed',
    }));
    // bulkCreate in chunks (SDK caps at 500 per call).
    for (let i = 0; i < rows.length; i += 400) {
      await base44.entities.MockAssessmentObjective.bulkCreate(rows.slice(i, i + 400));
    }
    await base44.entities.MockAssessmentSession.update(session.id, { objectives_total: rows.length });
    await load();
    setActiveId(session.id);
    setCreating(false);
  };

  // Attach worklist context (evidence types, SSP statement) to persisted objectives.
  const worklistCtx = useMemo(() => {
    const map = {};
    buildObjectiveWorklist(assessments).forEach((w) => { map[w.objective_id] = w; });
    return map;
  }, [assessments]);

  const enriched = useMemo(() => objectives.map((o) => ({
    ...o,
    evidence_types: worklistCtx[o.objective_id]?.evidence_types || [],
    ssp_statement: worklistCtx[o.objective_id]?.ssp_statement || '',
  })), [objectives, worklistCtx]);

  const byDomain = useMemo(() => {
    const map = {};
    enriched.forEach((o) => (map[o.domain || 'Other'] ||= []).push(o));
    return map;
  }, [enriched]);

  const stats = useMemo(() => computeSessionStats(objectives), [objectives]);

  const updateObjective = async (obj, patch) => {
    setObjectives((prev) => prev.map((o) => (o.id === obj.id ? { ...o, ...patch } : o)));
    await base44.entities.MockAssessmentObjective.update(obj.id, patch);
    // Recompute + persist session roll-up.
    const next = objectives.map((o) => (o.id === obj.id ? { ...o, ...patch } : o));
    const s = computeSessionStats(next);
    await base44.entities.MockAssessmentSession.update(activeId, s);
    setSessions((prev) => prev.map((x) => (x.id === activeId ? { ...x, ...s } : x)));
  };

  const createPoamFromObjective = async (obj) => {
    await base44.entities.ProjectPOAM.create({
      organization_id: project.organization_id, project_id: project.id,
      control_id: obj.control_id,
      poam_title: `${obj.control_id} ${obj.objective_id} — objective not met`,
      gap_statement: obj.justification || obj.objective_text,
      remediation_plan: '', risk_rating: 'Moderate', status: 'Open',
      responsible_owner: currentUser?.full_name || currentUser?.email || '',
    });
    await updateObjective(obj, { poam_created: true });
  };

  const runReport = () => {
    generateMockAssessmentReport({
      project, org, session: { ...activeSession, ...stats },
      objectives: enriched, generatedBy: currentUser?.full_name || currentUser?.email,
    });
  };

  if (!allowed) {
    return (
      <PlanUpgradePanel
        title="Mock Assessment Mode"
        requiredFeatureKey={PLAN_FEATURES.MOCK_ASSESSMENT}
        description="Walk every control objective-by-objective the way a C3PAO assessor would under NIST SP 800-171A, record MET / NOT MET / N/A verdicts with justification, and produce a readiness verdict and remediation-ready report."
      />
    );
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  const failed = failedByControl(enriched);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <Gavel className="w-5 h-5 text-[#0F1E3C]" />
            <h1 className="text-lg font-bold text-slate-900">Mock Assessment</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {sessions.length > 0 && (
              <select className="form-input text-sm w-auto" value={activeId || ''} onChange={(e) => setActiveId(e.target.value)}>
                {sessions.map((s) => <option key={s.id} value={s.id}>{s.session_name} ({s.completion_pct || 0}%)</option>)}
              </select>
            )}
            {activeSession && (
              <button onClick={runReport} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200">
                <FileDown className="w-4 h-4" /> Report
              </button>
            )}
            {!readOnly && (
              <button onClick={createSession} disabled={creating || !assessments.length}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-60">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} New Mock Assessment
              </button>
            )}
          </div>
        </div>
        <p className="text-[13px] text-slate-500 mt-2">
          A self-run readiness rehearsal. It is not an official C3PAO assessment — use it to find gaps before the real one.
        </p>
        {!assessments.length && (
          <p className="text-sm text-amber-600 mt-2">Generate your control assessment first (Control Implementation module), then start a mock assessment.</p>
        )}
      </div>

      {!activeSession ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          No mock assessment yet. {!readOnly && assessments.length > 0 && 'Click "New Mock Assessment" to begin.'}
        </div>
      ) : (
        <>
          {/* Session summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
              <div className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full border ${OVERALL_STYLE[stats.overall_verdict]}`}>
                {stats.overall_verdict === 'Likely Pass' && <CheckCircle2 className="w-4 h-4" />}
                Verdict: {stats.overall_verdict}
              </div>
              <div className="text-xs text-slate-500">Run by {activeSession.run_by || '—'} · {activeSession.session_date} · Scope {activeSession.scope_level}</div>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Completion</span><span>{stats.completion_pct}%</span>
            </div>
            <ProgressBar value={stats.completion_pct} />
            <div className="grid grid-cols-4 gap-3 mt-4">
              <Tile label="Met" value={stats.objectives_met} tone="text-green-600" />
              <Tile label="Not Met" value={stats.objectives_not_met} tone="text-red-600" />
              <Tile label="N/A" value={stats.objectives_na} tone="text-slate-600" />
              <Tile label="Total" value={stats.objectives_total} tone="text-slate-800" />
            </div>
          </div>

          {/* Failed objectives roll-up */}
          {failed.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-red-800 mb-2">Failed Objectives by Control ({failed.length} control{failed.length !== 1 ? 's' : ''})</h3>
              <div className="space-y-2">
                {failed.map((f) => (
                  <div key={f.control_id} className="text-xs text-red-700">
                    <span className="font-mono font-bold">{f.control_id}</span> — {f.control_title}
                    <span className="text-red-500"> · {f.objectives.length} objective(s) not met</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-red-500 mt-2">Use the "Create POA&M item" button on each failed objective below to track remediation.</p>
            </div>
          )}

          {/* Objective-by-objective, grouped by domain */}
          {Object.keys(byDomain).sort().map((domain) => {
            const rows = byDomain[domain];
            const open = openDomains[domain] !== false;
            const done = rows.filter((r) => r.verdict !== 'Not Assessed').length;
            return (
              <div key={domain} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button onClick={() => setOpenDomains((o) => ({ ...o, [domain]: !open }))} className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                  <span className="text-sm font-bold text-slate-800">{domain} <span className="text-slate-400 font-normal">({done}/{rows.length})</span></span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`} />
                </button>
                {open && (
                  <div className="divide-y divide-slate-100 border-t border-slate-100">
                    {rows.map((o) => (
                      <ObjectiveAssessRow key={o.id} obj={o} readOnly={readOnly}
                        evidence={evidenceForControl(evidence, o.control_id)}
                        onChange={(patch) => updateObjective(o, patch)}
                        onCreatePoam={() => createPoamFromObjective(o)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function Tile({ label, value, tone }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
      <div className={`text-2xl font-bold ${tone}`}>{value ?? 0}</div>
      <div className="text-[11px] font-medium text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}