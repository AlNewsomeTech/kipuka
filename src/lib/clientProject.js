import { base44 } from '@/api/base44Client';

// Resolve through the client's own organization. A failed read is not an
// absent relationship: let callers show the actual loading error.
export async function resolveClientProject(clientOrId) {
  if (!clientOrId) return null;
  const client = typeof clientOrId === 'string'
    ? await base44.entities.Client.get(clientOrId)
    : clientOrId;
  const orgId = client?.organization_id;
  if (!orgId) return null;

  const profiles = await base44.entities.CompanyProfile.filter({ organization_id: orgId });
  const activeId = profiles[0]?.active_project_id;
  if (activeId) {
    const project = await base44.entities.Project.get(activeId);
    if (project?.organization_id !== orgId) throw new Error('The active project does not belong to this client’s organization.');
    return project;
  }
  const projects = await base44.entities.Project.filter({ organization_id: orgId }, '-created_date', 1);
  const project = projects[0] || null;
  if (project && project.organization_id !== orgId) throw new Error('The project does not belong to this client’s organization.');
  return project;
}

// Preserve the ID-only interface used by existing project links and editors.
export async function resolveProjectIdForClient(clientOrId) {
  return (await resolveClientProject(clientOrId))?.id || null;
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