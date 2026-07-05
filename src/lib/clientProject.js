import { base44 } from '@/api/base44Client';

// Resolve the ControlAssessment "project" that backs a given consultant Client.
// The consultant control pages are keyed by client_id, but ControlAssessment
// (the single source of truth) is keyed by project_id. A Client and its Project
// share organization_id; we prefer the org's CompanyProfile.active_project_id,
// else the org's newest project.
export async function resolveProjectIdForClient(clientId) {
  if (!clientId) return null;
  const clients = await base44.entities.Client.filter({ id: clientId }).catch(() => []);
  const client = clients[0];
  const orgId = client?.organization_id;
  if (!orgId) return null;

  const profiles = await base44.entities.CompanyProfile.filter({ organization_id: orgId }).catch(() => []);
  const activeId = profiles[0]?.active_project_id;
  if (activeId) {
    const found = await base44.entities.Project.filter({ id: activeId }).catch(() => []);
    if (found[0]) return found[0].id;
  }
  const projects = await base44.entities.Project.filter({ organization_id: orgId }, '-created_date', 1).catch(() => []);
  return projects[0]?.id || null;
}

// Map a ControlAssessment status back to the 6-value consultant status vocabulary
// used by CMMCControl / ControlProgress, for display in the consultant pages.
export function assessmentToConsultantStatus(status) {
  switch (status) {
    case 'Ready for Assessment':
    case 'Ready for Documentation':
    case 'Implemented':
      return 'Complete';
    case 'Evidence Accepted':
      return 'Reviewed';
    case 'Evidence Needs Review':
    case 'Needs Review':
      return 'Ready for Review';
    case 'Implemented Pending Evidence':
    case 'Evidence Uploaded':
      return 'Evidence Needed';
    case 'Implementation Planned':
    case 'Implementation In Progress':
    case 'Partially Implemented':
    case 'Gap Identified':
    case 'POA&M Linked':
      return 'In Progress';
    default:
      return 'Not Started';
  }
}

// Map a consultant status → ControlAssessment status when writing.
export function consultantToAssessmentStatus(status, readyForAssessment) {
  if (readyForAssessment) return 'Ready for Assessment';
  switch (status) {
    case 'Complete': return 'Ready for Assessment';
    case 'Reviewed': return 'Evidence Accepted';
    case 'Ready for Review': return 'Evidence Needs Review';
    case 'Evidence Needed': return 'Implemented Pending Evidence';
    case 'In Progress': return 'Implementation In Progress';
    default: return 'Not Started';
  }
}