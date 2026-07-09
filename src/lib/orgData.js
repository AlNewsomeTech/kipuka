// Org-scoped data adapter — the client-role data path.
//
// RLS templating of custom user fields is not enforced by the platform, so
// client-role users cannot read org data via base44.entities directly (RLS
// denies them). Instead, client views route through the orgScopedData
// backend function, which filters every read and verifies every write
// against the caller's organization_id server-side.
//
// The base44 client (src/api/base44Client.js) wires this in automatically:
// for client-role users, entity calls on gated entities are transparently
// routed through the gatekeeper. Admin/technician calls hit the SDK directly.
import { base44 } from '@/api/base44Client';

// Entities the gatekeeper mediates — must mirror ENTITY_RULES in
// base44/functions/orgScopedData/entry.ts.
export const GATED_ENTITIES = new Set([
  'Project',
  'CompanyProfile',
  'ControlAssessment',
  'ProjectEvidence',
  'GuidedProgress',
  'RemediationComment',
  'ScopingProfile',
  'Asset',
  'ProjectPOAM',
  'Organization',
  'OrganizationUser',
  'ReportExport',
  'MockAssessmentSession',
  'MockAssessmentObjective',
  'PolicyTemplate',
  'SPRSRecord',
  'SystemSecurityPlan',
  'DeploymentTask',
  'SecurityReviewNote',
  'AcolyteRemediationItem',
  'AcolyteProfile',
  'CyberFinding',
  'IncidentReadinessRecord',
  'AcolyteExecutiveReport',
  'CyberReadinessReview',
]);

async function call(payload) {
  const res = await base44.functions.invoke('orgScopedData', payload);
  return res.data;
}

export function orgEntity(entityName) {
  return {
    list: async (sort, limit) =>
      (await call({ entity: entityName, op: 'filter', query: {}, sort, limit })).records,
    filter: async (query = {}, sort, limit) =>
      (await call({ entity: entityName, op: 'filter', query, sort, limit })).records,
    get: async (id) =>
      (await call({ entity: entityName, op: 'get', id })).record,
    create: async (data) =>
      (await call({ entity: entityName, op: 'create', data })).record,
    bulkCreate: async (data) =>
      (await call({ entity: entityName, op: 'bulkCreate', data })).records,
    update: async (id, data) =>
      (await call({ entity: entityName, op: 'update', id, data })).record,
  };
}

// Role-aware entity accessor: direct SDK for consultant/admin roles,
// gatekeeper for client-role users. Pass the platform role from auth.me().
export function scopedEntity(entityName, platformRole) {
  if (platformRole === 'client') return orgEntity(entityName);
  return base44.entities[entityName];
}