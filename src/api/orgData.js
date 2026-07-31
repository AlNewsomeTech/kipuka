// Role-aware org data layer.
//
// Entity RLS is creator+staff locked as defense in depth. Client-role users
// therefore cannot read/write org data directly — an invited teammate would
// otherwise see only records they personally created. This layer routes
// client-role traffic through the orgScopedData (read) / orgScopedWrite
// (write) backend gates, which resolve the caller's organization server-side
// and scope every operation to it. Admin and technician roles pass straight
// through to the direct base44.entities SDK, unchanged.
//
// Usage:
//   import { orgData } from '@/api/orgData';
//   const rows = await orgData('client').ControlAssessment.filter({ project_id });
// The role argument comes from useAuth().user.role (platform role).

import { rawClient } from '@/api/base44Client';

// Entities readable through the read gate.
export const READ_GATED = new Set([
  'Client', 'ControlAssessment', 'Project', 'CompanyProfile', 'ProjectEvidence', 'Asset',
  'ScopingProfile', 'ProjectPOAM', 'SSPControlStatement', 'SystemSecurityPlan',
  'ProjectDiagram', 'ServiceProvider', 'IncidentResponsePlan', 'IncidentLog',
  'MockAssessmentSession', 'MockAssessmentObjective', 'ObjectiveEvidenceLink',
  'SPRSRecord', 'CMMCLevelDetermination', 'MaintenanceTask', 'ReportExport',
  'ToolControlMapping', 'ToolEvidenceChecklist', 'ProjectSecurityTool',
  'PolicyTemplate', 'GuidedProgress', 'RemediationComment', 'DeploymentTask',
  'SecurityReviewNote', 'AcolyteRemediationItem', 'AcolyteProfile',
  'CyberFinding', 'IncidentReadinessRecord', 'AcolyteExecutiveReport',
  'CyberReadinessReview', 'Organization', 'OrganizationUser', 'PostureAssessment',
]);

// Entities writable through the write gate.
export const WRITE_GATED = new Set([
  'ControlAssessment', 'ProjectEvidence', 'Asset', 'ScopingProfile', 'ProjectPOAM',
  'SSPControlStatement', 'ProjectDiagram', 'ServiceProvider', 'IncidentResponsePlan',
  'IncidentLog', 'MockAssessmentSession', 'MockAssessmentObjective',
  'ObjectiveEvidenceLink', 'SPRSRecord', 'MaintenanceTask', 'RemediationComment',
  'PolicyTemplate', 'GuidedProgress', 'CompanyProfile', 'PostureAssessment',
]);

async function readGate(entity, operation, payload) {
  const res = await rawClient.functions.invoke('orgScopedData', { entity, operation, ...payload });
  return res.data;
}
async function writeGate(entity, operation, payload) {
  const res = await rawClient.functions.invoke('orgScopedWrite', { entity, operation, ...payload });
  return res.data;
}

// Client-gated entity accessor with the standard list/filter/get/create/update API.
function gatedEntity(entityName) {
  return {
    list: async (sort, limit) =>
      (await readGate(entityName, 'filter', { query: {}, sort, limit })).records,
    filter: async (query = {}, sort, limit) =>
      (await readGate(entityName, 'filter', { query, sort, limit })).records,
    get: async (id) =>
      (await readGate(entityName, 'get', { id })).record,
    create: async (data) =>
      (await writeGate(entityName, 'create', { data })).record,
    update: async (id, data) =>
      (await writeGate(entityName, 'update', { id, data })).record,
  };
}

// Returns a role-aware entity map. For client-role users, gated entities go
// through the backend gates; everything else (and every other role) uses the
// direct SDK unchanged.
export function orgData(platformRole) {
  const isClient = platformRole === 'client';
  return new Proxy({}, {
    get(_t, entityName) {
      if (typeof entityName !== 'string') return undefined;
      if (isClient && (READ_GATED.has(entityName) || WRITE_GATED.has(entityName))) {
        // Merge gate methods over the direct SDK so non-gated methods
        // (e.g. bulkCreate, delete) still resolve to the SDK if used.
        return { ...rawClient.entities[entityName], ...gatedEntity(entityName) };
      }
      return rawClient.entities[entityName];
    }
  });
}

// Direct gate accessors (used by the transparent proxy in base44Client.js).
export function gatedEntityFor(entityName) {
  return gatedEntity(entityName);
}