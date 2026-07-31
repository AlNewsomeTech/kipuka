// Aggregates all project-scoped Phase 3-5 data for the role dashboards.
// User-triggered load only; no polling.
import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { computeCanonicalReadiness, isImplementationComplete } from '@/lib/canonicalReadiness';

export function useProjectDashboardData(projectId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    const [assessments, evidence, poams, scoping, assets, sspList, policies, sprsList, maintenance, exports, objectiveLibrary, objectiveLinks] = await Promise.all([
      base44.entities.ControlAssessment.filter({ project_id: projectId }).catch(() => []),
      base44.entities.ProjectEvidence.filter({ project_id: projectId }).catch(() => []),
      base44.entities.ProjectPOAM.filter({ project_id: projectId }).catch(() => []),
      base44.entities.ScopingProfile.filter({ project_id: projectId }).catch(() => []),
      base44.entities.Asset.filter({ project_id: projectId }).catch(() => []),
      base44.entities.SystemSecurityPlan.filter({ project_id: projectId }).catch(() => []),
      base44.entities.PolicyTemplate.filter({ project_id: projectId }).catch(() => []),
      base44.entities.SPRSRecord.filter({ project_id: projectId }).catch(() => []),
      base44.entities.MaintenanceTask.filter({ project_id: projectId }).catch(() => []),
      base44.entities.ReportExport.filter({ project_id: projectId }, '-generated_date', 10).catch(() => []),
      base44.entities.AssessmentObjectiveLibrary.list('sort_order', 500).catch(() => []),
      base44.entities.ObjectiveEvidenceLink.filter({ project_id: projectId }).catch(() => []),
    ]);
    setData({
      assessments, evidence, poams,
      scoping: scoping[0] || null, assets,
      ssp: sspList[0] || null,
      policies: policies.filter((p) => !p.is_master_template),
      sprs: sprsList[0] || null,
      maintenance, exports, objectiveLibrary, objectiveLinks,
    });
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, reload: load };
}

const CLOSED_POAM = ['Closed', 'Accepted Risk'];

// Derived metrics shared across dashboards.
export function deriveMetrics(project, d) {
  if (!d) return {};
  const canonical = computeCanonicalReadiness({
    project, assessments: d.assessments, objectiveLibrary: d.objectiveLibrary,
    objectiveLinks: d.objectiveLinks, evidence: d.evidence, poams: d.poams,
  });
  const total = canonical.expected_requirements || d.assessments.length;
  const implemented = canonical.implemented;
  const evByControl = {};
  d.evidence.forEach((e) => (e.control_ids || []).forEach((c) => (evByControl[c] = true)));
  const needEvidence = d.assessments.filter((a) => !evByControl[a.control_id]);
  const openPoam = d.poams.filter((p) => !CLOSED_POAM.includes(p.status));
  const highRisk = openPoam.filter((p) => ['High', 'Critical'].includes(p.risk_rating));
  const today = new Date(new Date().toDateString());

  const upcoming = [];
  if (project.target_completion_date) upcoming.push({ label: 'Target completion', date: project.target_completion_date });
  if (d.sprs?.expiration_date) upcoming.push({ label: 'SPRS affirmation expires', date: d.sprs.expiration_date });
  d.maintenance.filter((m) => m.due_date && m.status !== 'Complete').forEach((m) => upcoming.push({ label: m.task_title, date: m.due_date }));
  upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    total, implemented,
    readiness: canonical.readiness_pct,
    implementation: canonical.implementation_pct,
    canonical,
    needEvidence, openPoam, highRisk,
    sspStatus: d.ssp?.approval_status || 'Not Started',
    poamOpenCount: openPoam.length,
    overdueMaintenance: d.maintenance.filter((m) => m.due_date && !['Complete', 'Deferred'].includes(m.status) && new Date(m.due_date) < today),
    upcoming: upcoming.slice(0, 6),
    evByControl,
  };
}

// Group control completion by domain.
export function byDomain(assessments) {
  const map = {};
  assessments.forEach((a) => {
    const dom = a.domain || 'Other';
    map[dom] = map[dom] || { total: 0, done: 0 };
    map[dom].total += 1;
    if (isImplementationComplete(a)) map[dom].done += 1;
  });
  return Object.entries(map).map(([domain, v]) => ({ domain, ...v }));
}