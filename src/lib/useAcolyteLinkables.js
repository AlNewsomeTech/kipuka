import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

// Loads existing CMMC records that ACOLYTE findings/remediation can link to:
// control assessments, project evidence, and POA&M items — all project-scoped.
export function useAcolyteLinkables(projectId) {
  const [data, setData] = useState({ controls: [], evidence: [], poams: [] });

  useEffect(() => {
    let alive = true;
    if (!projectId) { setData({ controls: [], evidence: [], poams: [] }); return; }
    (async () => {
      const [controls, evidence, poams] = await Promise.all([
        base44.entities.ControlAssessment.filter({ project_id: projectId }).catch(() => []),
        base44.entities.ProjectEvidence.filter({ project_id: projectId }).catch(() => []),
        base44.entities.ProjectPOAM.filter({ project_id: projectId }).catch(() => []),
      ]);
      if (!alive) return;
      setData({
        controls: controls.map((c) => ({ value: c.control_id, label: `${c.control_id} — ${c.control_title || ''}`.trim() })),
        evidence: evidence.map((e) => ({ value: e.id, label: e.evidence_title || 'Evidence' })),
        poams: poams.map((p) => ({ value: p.id, label: p.poam_title || 'POA&M item' })),
      });
    })();
    return () => { alive = false; };
  }, [projectId]);

  return data;
}