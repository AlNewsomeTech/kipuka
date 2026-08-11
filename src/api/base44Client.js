import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

//Create a client with authentication required
export const rawClient = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

// ---- Role-aware entity routing (defense-in-depth safety net) -------------
// Entity RLS is creator+staff locked, so client-role users cannot read/write
// org data directly. Their calls on gated entities are transparently routed
// through the orgScopedData (read) / orgScopedWrite (write) backend gates.
// Admin/technician calls pass straight through to the SDK.
//
// The explicit data layer lives in @/api/orgData; this proxy is a safety net
// so any surface still importing base44.entities directly stays correct for
// client-role users. Both share the same gate helpers.
// Role cache. ONLY successful resolutions are cached: a transient auth.me()
// failure must never permanently pin the role to null, which would silently
// downgrade a client-role user to ungated (creator-only) reads for the rest of
// their session — i.e. an invited teammate would see a half-empty app with no
// recovery until a page refresh. AuthContext seeds this on login and clears it
// on logout so the role can never go stale across a user switch.
let cachedRole;          // string | null once successfully resolved
let roleResolved = false;
let rolePromise = null;

export function setRoleCache(role) {
  cachedRole = role ?? null;
  roleResolved = true;
  rolePromise = null;
}

export function resetRoleCache() {
  cachedRole = undefined;
  roleResolved = false;
  rolePromise = null;
}

function resolveRole() {
  if (roleResolved) return Promise.resolve(cachedRole);
  if (!rolePromise) {
    rolePromise = rawClient.auth.me()
      .then((u) => {
        cachedRole = u?.role ?? null;
        roleResolved = true;
        return cachedRole;
      })
      .catch(() => {
        // Do not cache the failure — retry on the next call. This call falls
        // back to a direct (RLS-enforced) SDK call, which is safe: RLS still
        // protects the data, the caller may just see fewer rows once.
        rolePromise = null;
        return null;
      });
  }
  return rolePromise;
}

const READ_METHODS = new Set(['list', 'filter', 'get']);
const WRITE_METHODS = new Set(['create', 'update', 'bulkCreate']);

// Lazy import to avoid a circular module load at startup.
function loadOrgData() {
  return import('@/api/orgData');
}

const scopedEntities = new Proxy(rawClient.entities, {
  get(target, entityName) {
    const direct = target[entityName];
    if (typeof entityName !== 'string') return direct;
    return new Proxy(direct, {
      get(entityTarget, method) {
        const orig = entityTarget[method];
        if (typeof method !== 'string' || (!READ_METHODS.has(method) && !WRITE_METHODS.has(method))) {
          return typeof orig === 'function' ? orig.bind(entityTarget) : orig;
        }
        return async (...args) => {
          const role = await resolveRole();
          const { READ_GATED, WRITE_GATED, gatedEntityFor } = await loadOrgData();
          // Security-sensitive entities are service-write-only. Every platform
          // role uses the backend gate so protected lifecycle fields cannot be
          // changed through a direct SDK call.
          if (WRITE_METHODS.has(method) && ['ControlAssessment', 'PolicyTemplate', 'SystemSecurityPlan'].includes(entityName)) {
            return gatedEntityFor(entityName)[method](...args);
          }
          if (role !== 'client') return orig.apply(entityTarget, args);
          const isGated = (READ_METHODS.has(method) && READ_GATED.has(entityName)) ||
            (WRITE_METHODS.has(method) && WRITE_GATED.has(entityName));
          if (!isGated) return orig.apply(entityTarget, args);
          return gatedEntityFor(entityName)[method](...args);
        };
      }
    });
  }
});

export const base44 = new Proxy(rawClient, {
  get(target, prop) {
    if (prop === 'entities') return scopedEntities;
    return target[prop];
  }
});