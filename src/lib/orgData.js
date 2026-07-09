// Org-scoped data adapter — the client-role data path.
//
// RLS templating of custom user fields is not enforced by the platform, so
// client-role users cannot read org data via base44.entities directly (RLS
// denies them). Instead, client views route through the orgScopedData
// backend function, which filters every read and verifies every write
// against the caller's organization_id server-side.
//
// Usage (drop-in for the entity SDK surface used by client views):
//   import { orgEntity } from '@/lib/orgData';
//   const rows = await orgEntity('ControlAssessment').filter({ project_id });
//
// Admin/technician code should keep using base44.entities directly —
// their RLS role branches grant direct access.
import { base44 } from '@/api/base44Client';

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