import { useState, useEffect, useCallback, useMemo } from 'react';
import { ClipboardCheck, Loader2, FileDown, ChevronDown, CheckCircle2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { objectivesForControl } from '@/lib/assessmentObjectives';
import { createReportPdf, safeFileName, BRAND } from '@/lib/reportBranding';
import ObjectiveRow from './ObjectiveRow';

// Evidence Completeness Checker mapped to NIST SP 800-171A assessment objectives.
// For each control, breaks implementation into its individual objectives, shows
// linked evidence and a MET / GAP status. Includes a per-project readiness report.
export default function EvidenceReadinessModule({ project, org, readOnly, currentUser }) {
  const [assessments, setAssessments] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openControl, setOpenControl] = useState(null);
  const [onlyGaps, setOnlyGaps] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [asmt, ev, lk] = await Promise.all([
      base44.entities.ControlAssessment.filter({ project_id: project.id }).catch(() => []),
      base44.entities.ProjectEvidence.filter({ project_id: project.id }).catch(() => []),
      base44.entities.ObjectiveEvidenceLink.filter({ project_id: project.id }).catch(() => []),
    ]);
    setAssessments(asmt);
    setEvidence(ev);
    setLinks(lk);
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const linksByObjective = useMemo(() => {
    const m = {};
    links.forEach((l) => (m[l.objective_id] ||= []).push(l));
    return m;
  }, [links]);

  // Evidence available to link to a control's objectives (evidence mapped to that control).
  const evidenceForControl = useCallback((controlId) =>
    evidence.filter((e) => (e.control_ids || []).includes(controlId)), [evidence]);

  // Compute per-control objective breakdown + met/gap.
  const controlSummaries = useMemo(() => assessments.map((a) => {
    const objs = objectivesForControl(a.control_id, a.control_title);
    let met = 0;
    const rows = objs.map((o) => {
      const objLinks = linksByObjective[o.id] || [];
      const status = objLinks.length ? (objLinks.every((l) => l.status === 'Met') ? 'Met' : objLinks.some((l) => l.status === 'Gap') ? 'Gap' : 'Not Assessed') : 'Not Assessed';
      if (status === 'Met') met += 1;
      return { objective: o, links: objLinks, status };
    });
    return { control: a, objectives: rows, met, total: objs.length, gaps: rows.filter((r) => r.status !== 'Met').length };
  }), [assessments, linksByObjective]);

  const totals = useMemo(() => {
    let met = 0, total = 0;
    controlSummaries.forEach((c) => { met += c.met; total += c.total; });
    return { met, total, gaps: total - met, pct: total ? Math.round((met / total) * 100) : 0 };
  }, [controlSummaries]);

  const setObjectiveStatus = async (controlId, objectiveId, status, evidenceId) => {
    const existing = (linksByObjective[objectiveId] || []).find((l) => (l.evidence_id || '') === (evidenceId || ''));
    if (existing) await base44.entities.ObjectiveEvidenceLink.update(existing.id, { status });
    else await base44.entities.ObjectiveEvidenceLink.create({
      organization_id: project.organization_id, project_id: project.id,
      control_id: controlId, objective_id: objectiveId, evidence_id: evidenceId || '', status,
    });
    load();
  };

  const generateReport = () => {
    const r = createReportPdf({ title: 'Evidence Readiness Report (NIST SP 800-171A)', project, org, generatedBy: currentUser?.full_name || currentUser?.email });
    r.heading('Overall Objective Coverage');
    r.label('Objectives Met', `${totals.met} of ${totals.total} (${totals.pct}%)`);
    r.label('Open Gaps', totals.gaps);
    r.space();
    controlSummaries.forEach((c) => {
      r.ensure(50);
      r.text(`${c.control.control_id} — ${c.control.control_title || ''}  [${c.met}/${c.total} met]`, { bold: true });
      c.objectives.forEach((o) => {
        const linked = o.links.map((l) => evidence.find((e) => e.id === l.evidence_id)?.evidence_title).filter(Boolean);
        r.text(`   ${o.objective.id} [${o.status}] — ${o.objective.text}`);
        r.text(`      Satisfying evidence: ${o.objective.evidence.join(', ')}. Linked: ${linked.length ? linked.join('; ') : 'NONE (gap)'}`);
      });
      r.space(4);
    });
    r.disclaimerNote(BRAND.disclaimer);
    r.save(`${safeFileName(project.project_name)}_Evidence_Readiness.pdf`);
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  const visible = onlyGaps ? controlSummaries.filter((c) => c.gaps > 0) : controlSummaries;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <ClipboardCheck className="w-5 h-5 text-[#0F1E3C]" />
            <h1 className="text-lg font-bold text-slate-900">Evidence Readiness</h1>
          </div>
          {assessments.length > 0 && (
            <button onClick={generateReport}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
              <FileDown className="w-4 h-4" /> Readiness Report
            </button>
          )}
        </div>
        <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">
          Each control is broken into its NIST SP 800-171A assessment objectives. Link evidence to each objective and mark
          it Met or Gap. This is your pre-assessment audit view.
        </p>
        {assessments.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Stat label="Objectives Met" value={`${totals.met}/${totals.total}`} tone="text-green-700" />
            <Stat label="Coverage" value={`${totals.pct}%`} tone="text-blue-700" />
            <Stat label="Open Gaps" value={totals.gaps} tone={totals.gaps ? 'text-amber-600' : 'text-slate-500'} />
          </div>
        )}
      </div>

      {assessments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          No controls tracked yet. Seed controls in the Control Implementation module first.
        </div>
      ) : (
        <>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
            <input type="checkbox" checked={onlyGaps} onChange={(e) => setOnlyGaps(e.target.checked)} className="w-4 h-4 rounded border-slate-300" />
            Show only controls with gaps
          </label>
          <div className="space-y-2">
            {visible.map((c) => {
              const open = openControl === c.control.control_id;
              return (
                <div key={c.control.control_id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <button onClick={() => setOpenControl(open ? null : c.control.control_id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left">
                    {c.gaps === 0 ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800"><span className="font-mono text-slate-500">{c.control.control_id}</span> {c.control.control_title}</div>
                    </div>
                    <span className={`text-xs font-semibold ${c.gaps === 0 ? 'text-green-700' : 'text-amber-600'}`}>{c.met}/{c.total} met</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </button>
                  {open && (
                    <div className="border-t border-slate-100 divide-y divide-slate-50">
                      {c.objectives.map((o) => (
                        <ObjectiveRow key={o.objective.id} data={o} readOnly={readOnly}
                          controlEvidence={evidenceForControl(c.control.control_id)}
                          onSetStatus={(status, evId) => setObjectiveStatus(c.control.control_id, o.objective.id, status, evId)} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone = 'text-slate-900' }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 text-center">
      <div className={`text-xl font-bold ${tone}`}>{value}</div>
      <div className="text-[11px] font-medium text-slate-500 mt-0.5 uppercase tracking-wide">{label}</div>
    </div>
  );
}