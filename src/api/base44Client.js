import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { orgEntity, GATED_ENTITIES } from '@/lib/orgData';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
const rawClient = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// ---- Role-aware entity routing -------------------------------------------
// Client-role users are denied org data at the RLS layer (strict tenant
// isolation). Their entity calls on gated entities are transparently routed
// through the orgScopedData backend gatekeeper, which scopes every read and
// verifies every write against their organization_id server-side.
// Admin/technician calls pass straight through to the SDK.
let rolePromise = null;
function resolveRole() {
  if (!rolePromise) {
    rolePromise = rawClient.auth.me().then((u) => u?.role ?? null).catch(() => null);
  }
  return rolePromise;
}

const GATEKEEPER_METHODS = new Set(['list', 'filter', 'get', 'create', 'bulkCreate', 'update']);

const scopedEntities = new Proxy(rawClient.entities, {
  get(target, entityName) {
    const direct = target[entityName];
    if (typeof entityName !== 'string' || !GATED_ENTITIES.has(entityName)) return direct;
    return new Proxy(direct, {
      get(entityTarget, method) {
        const orig = entityTarget[method];
        if (typeof method !== 'string' || !GATEKEEPER_METHODS.has(method)) {
          return typeof orig === 'function' ? orig.bind(entityTarget) : orig;
        }
        return async (...args) => {
          const role = await resolveRole();
          if (role === 'client') return orgEntity(entityName)[method](...args);
          return orig.apply(entityTarget, args);
        };
      }
    });
  }
});

export const base44 = new Proxy(rawClient, {
  get(target, prop) {
    if (prop === 'entities') return scopedEntities;
    const value = target[prop];
    return value;
  }
});