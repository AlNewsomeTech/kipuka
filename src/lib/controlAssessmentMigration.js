import { base44 } from '@/api/base44Client';
import { CONTROL_FAMILIES } from '@/lib/controlStatus';

// Migration: legacy ControlProgress (keyed by client_id) → ControlAssessment
// (keyed by project_id, the single source of truth for SPRS + readiness).
//
// This NEVER deletes ControlProgress records. It only creates or upgrades
// ControlAssessment rows. An upgrade happens only when the legacy status is
// MORE advanced than the existing ControlAssessment status, so re-running is
// safe and idempotent.

// Rank ControlAssessment statuses so we only ever move a control "forward".
const ASSESSMENT_RANK = {
  'Not Started': 0,
  'Implementation Planned': 1,
  'Implementation In Progress': 2,
  'Implemented Pending Evidence': 3,
  'Evidence Uploaded': 4,
  'Evidence Needs Review': 5,
  'Gap Identified': 3,
  'POA&M Linked': 4,
  'Partially Implemented': 3,
  'Needs Review': 5,
  'Evidence Accepted': 7,
  'Ready for Documentation': 8,
  'Implemented': 7,
  'Ready for Assessment': 9,
};

// Legacy ControlProgress status → ControlAssessment status.
function mapLegacyStatus(row) {
  if (row.ready_for_assessment) return 'Ready for Assessment';
  switch (row.status) {
    case 'Complete': return 'Ready for Assessment';
    case 'Reviewed': return 'Evidence Accepted';
    case 'Ready for Review': return 'Evidence Needs Review';
    case 'Evidence Needed': return 'Implemented Pending Evidence';
    case 'In Progress': return 'Implementation In Progress';
    default: return 'Not Started';
  }
}

function rankOf(status) {
  return ASSESSMENT_RANK[status] ?? 0;
}

function familyName(controlId = '') {
  const m = String(controlId).match(/^([A-Z]{2})\./);
  const code = m ? m[1] : '';
  return (CONTROL_FAMILIES.find((f) => f.code === code) || {}).name || '';
}

// Resolve which Project a client's progress should migrate into.
// Prefer the org's CompanyProfile.active_project_id, else the org's newest project.
async function resolveProjectForClient(client, projectsByOrg, profilesByOrg) {
  const orgId = client.organization_id;
  if (!orgId) return null;
  const profile = profilesByOrg[orgId];
  if (profile?.active_project_id) {
    const proj = (projectsByOrg[orgId] || []).find((p) => p.id === profile.active_project_id);
    if (proj) return proj;
  }
  const list = projectsByOrg[orgId] || [];
  return list[0] || null;
}

// Runs the migration. Returns a results report object (no throwing — collects errors).
export async function migrateControlProgressToAssessment() {
  const report = { examined: 0, created: 0, upgraded: 0, skipped: 0, clientsWithoutProject: 0, errors: [] };

  const [progressRows, clients, projects, profiles, cmmcDefs] = await Promise.all([
    base44.entities.ControlProgress.list('-created_date', 5000).catch(() => []),
    base44.entities.Client.list('-created_date', 2000).catch(() => []),
    base44.entities.Project.list('-created_date', 2000).catch(() => []),
    base44.entities.CompanyProfile.list('-created_date', 2000).catch(() => []),
    base44.entities.CMMCControl.list('-created_date', 3000).catch(() => []),
  ]);

  report.examined = progressRows.length;

  const clientsById = Object.fromEntries(clients.map((c) => [c.id, c]));
  const projectsByOrg = {};
  for (const p of projects) (projectsByOrg[p.organization_id] ||= []).push(p);
  const profilesByOrg = {};
  for (const pr of profiles) if (pr.organization_id) profilesByOrg[pr.organization_id] = pr;
  const defByControl = Object.fromEntries(cmmcDefs.map((d) => [d.control_id, d]));

  // Resolve target project per client (cache).
  const projectForClient = {};
  for (const client of clients) {
    projectForClient[client.id] = await resolveProjectForClient(client, projectsByOrg, profilesByOrg);
  }

  // Pre-load existing assessments per target project to avoid N queries.
  const targetProjectIds = [...new Set(Object.values(projectForClient).filter(Boolean).map((p) => p.id))];
  const assessmentsByProject = {};
  for (const pid of targetProjectIds) {
    const rows = await base44.entities.ControlAssessment.filter({ project_id: pid }).catch(() => []);
    assessmentsByProject[pid] = Object.fromEntries(rows.map((a) => [a.control_id, a]));
  }

  for (const row of progressRows) {
    const client = clientsById[row.client_id];
    const project = client ? projectForClient[client.id] : null;
    if (!project) { report.clientsWithoutProject += 1; report.skipped += 1; continue; }

    const target = mapLegacyStatus(row);
    if (target === 'Not Started') { report.skipped += 1; continue; }

    const existing = (assessmentsByProject[project.id] || {})[row.control_id] || null;
    const def = defByControl[row.control_id] || {};

    try {
      if (!existing) {
        const created = await base44.entities.ControlAssessment.create({
          organization_id: project.organization_id,
          project_id: project.id,
          control_id: row.control_id,
          control_title: def.control_title || row.control_id,
          domain: familyName(row.control_id),
          cmmc_level: row.level || def.level || 'Level 1',
          status: target,
          ssp_statement: row.control_narrative || '',
          assessor_notes: row.reviewer_notes || '',
          responsible_owner: row.assigned_owner || '',
        });
        (assessmentsByProject[project.id] ||= {})[row.control_id] = created;
        report.created += 1;
      } else if (rankOf(target) > rankOf(existing.status)) {
        await base44.entities.ControlAssessment.update(existing.id, { status: target });
        existing.status = target;
        report.upgraded += 1;
      } else {
        report.skipped += 1;
      }
    } catch (e) {
      report.errors.push(`${row.control_id} (client ${row.client_id}): ${e.message}`);
    }
  }

  return report;
}