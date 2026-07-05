import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

// Loads the org-level dashboard data: the CompanyProfile for the selected org,
// its active project, and all ControlAssessment / evidence / POA&M records for
// that project. Everything reads from ControlAssessment (single source of truth).
export function useOrgDashboardData(organizationId) {
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [project, setProject] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [poams, setPoams] = useState([]);

  const load = useCallback(async () => {
    if (!organizationId) { setLoading(false); return; }
    setLoading(true);
    try {
      const profiles = await base44.entities.CompanyProfile
        .filter({ organization_id: organizationId }).catch(() => []);
      const profile = profiles[0] || null;
      setCompany(profile);

      // Resolve the active project: profile.active_project_id, else first project.
      let proj = null;
      if (profile?.active_project_id) {
        const found = await base44.entities.Project.filter({ id: profile.active_project_id }).catch(() => []);
        proj = found[0] || null;
      }
      if (!proj) {
        const projects = await base44.entities.Project
          .filter({ organization_id: organizationId }, '-created_date', 1).catch(() => []);
        proj = projects[0] || null;
      }
      setProject(proj);

      if (proj) {
        const [asmt, ev, pm] = await Promise.all([
          base44.entities.ControlAssessment.filter({ project_id: proj.id }).catch(() => []),
          base44.entities.ProjectEvidence.filter({ project_id: proj.id }).catch(() => []),
          base44.entities.ProjectPOAM.filter({ project_id: proj.id }).catch(() => []),
        ]);
        setAssessments(asmt);
        setEvidence(ev);
        setPoams(pm);
      } else {
        setAssessments([]); setEvidence([]); setPoams([]);
      }
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => { load(); }, [load]);

  return { loading, company, project, assessments, evidence, poams, reload: load };
}