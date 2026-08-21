// Shared engine for the OPTIONAL Microsoft Graph Control Deployment capability.
//
// Design constraints (all enforced here, server-side):
//  - Per-organization tenant authorization ONLY. Each organization supplies its
//    own Entra app registration (client-credentials flow) in its own tenant.
//    Base44's packaged microsoft_graph connector is NOT used: it is a single
//    builder-shared connection and does not support the administrative policy
//    scopes this capability needs, so credentials are never shared across
//    Kipuka customers.
//  - The organization feature flag is checked BEFORE any credential access or
//    Graph call. When false, every deployment request is rejected.
//  - Raw OAuth tokens are acquired on demand and never persisted.
//  - The tenant ID reached through Graph is verified against the tenant stored
//    for the caller's organization before any change.

import { sha256Hex, sha256HexOfText, stableStringify, metadataSha } from './evidenceIntegrity.ts';

export const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

// Organization roles that may run prechecks, approve, deploy, and roll back.
export const DEPLOY_ROLES = ['Organization Owner', 'Organization Admin', 'IT Admin', 'Pac-Sec Admin', 'Pac-Sec Support'];
// Organization roles that may connect / disconnect the Microsoft tenant.
export const CONNECT_ROLES = ['Organization Owner', 'Organization Admin', 'IT Admin', 'Pac-Sec Admin'];
// Organization roles that may run read-only ACOLYTE Microsoft posture scans.
export const MONITOR_ROLES = ['Organization Owner', 'Organization Admin', 'Compliance Manager', 'IT Admin', 'Pac-Sec Admin', 'Pac-Sec Support'];
// Organization roles that may approve a snapshot as the Microsoft baseline.
export const BASELINE_ROLES = ['Organization Owner', 'Organization Admin', 'Pac-Sec Admin'];

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// ---------- Naming (same format + sanitization as the existing Kipuka naming
// engine in src/lib/policyNaming.js / evidenceFilename.js) ----------

export function sanitizeSegment(value: any, fallback = ''): string {
  const cleaned = String(value || '')
    .trim()
    .replace(/&/g, ' And ')
    .replace(/[^a-zA-Z0-9.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_\-.]+|[_\-.]+$/g, '');
  return cleaned || fallback;
}

export function companySegment(organization: any): string {
  return sanitizeSegment(
    organization?.legal_name || organization?.organization_name || organization?.short_name,
    'CompanyName',
  );
}

// CompanyName_PolicyType_CONTROLID_ControlLocation_YYYY-MM-DD — identical to
// POLICY_NAME_FORMAT in src/lib/policyNaming.js. `date` is FROZEN to the
// original deployment date for updates so no duplicate policy is ever created
// merely because the calendar date changed.
export function buildDeploymentPolicyName(args: {
  organization: any; policyType: string; controlId: string; location: string; date: string;
}): string {
  return [
    companySegment(args.organization),
    sanitizeSegment(args.policyType, 'PolicyType'),
    sanitizeSegment(args.controlId, 'CONTROLID'),
    sanitizeSegment(args.location, 'ControlLocation'),
    args.date,
  ].join('_');
}

// ---------- Authorization ----------

// Resolves and verifies EVERYTHING server-side. organization_id / project_id /
// tenant_id / roles supplied by the browser are treated as lookup keys only —
// the canonical records decide.
export async function resolveGraphAccess(base44: any, opts: {
  projectId?: string; organizationId?: string; requireFlag?: boolean; allowedRoles?: string[] | null;
  // Which optional capability gates this request:
  //  'deployment' (default) — Graph Control Deployment entitlement
  //  'monitoring' — ACOLYTE Graph monitoring entitlement (also requires an
  //                 ACOLYTE service tier; monitoring NEVER requires deployment)
  //  'any' — either capability (tenant connection management)
  flag?: 'deployment' | 'monitoring' | 'any';
}) {
  const caller = await base44.auth.me();
  if (!caller) throw new HttpError(401, 'Unauthorized');
  const sr = base44.asServiceRole;

  const isPlatformAdmin = caller.role === 'admin' || caller._app_role === 'admin';
  const isPlatformTechnician = !isPlatformAdmin && (caller.role === 'technician' || caller._app_role === 'technician');
  const isPlatformStaff = isPlatformAdmin || isPlatformTechnician;

  let project: any = null;
  let org: any = null;
  if (opts.projectId) {
    project = await sr.entities.Project.get(String(opts.projectId)).catch(() => null);
    if (!project) throw new HttpError(404, 'Project not found');
    if (opts.organizationId && project.organization_id !== opts.organizationId) {
      throw new HttpError(403, 'Project does not belong to the requested organization.');
    }
    org = await sr.entities.Organization.get(project.organization_id).catch(() => null);
  } else if (opts.organizationId) {
    org = await sr.entities.Organization.get(String(opts.organizationId)).catch(() => null);
  }
  if (!org) throw new HttpError(404, 'Organization not found');
  if (org.fully_disabled) throw new HttpError(403, 'This organization is disabled.');

  let orgRole = '';
  if (isPlatformAdmin) {
    orgRole = 'Pac-Sec Admin';
  } else if (isPlatformTechnician) {
    orgRole = 'Pac-Sec Support';
  } else {
    const memberships = await sr.entities.OrganizationUser
      .filter({ user_email: caller.email, organization_id: org.id }).catch(() => []);
    const active = memberships.filter((m: any) => m.status === 'Active');
    if (active.length !== 1) throw new HttpError(403, 'Your organization membership is missing, inactive, or ambiguous.');
    orgRole = active[0].role;
  }

  if (Array.isArray(opts.allowedRoles) && !isPlatformAdmin && !opts.allowedRoles.includes(orgRole)) {
    throw new HttpError(403, 'Your organization role cannot perform this Microsoft deployment action.');
  }

  // Feature entitlement gates — checked before ANY credential access or Graph
  // call. Both capabilities default OFF and are super-admin controlled.
  // Monitoring additionally requires an ACOLYTE service entitlement.
  const deploymentEnabled = org.microsoft_graph_deployment_enabled === true;
  const monitoringEnabled = org.acolyte_microsoft_graph_monitoring_enabled === true
    && String(org.acolyte_tier || 'none') !== 'none';
  const flag = opts.flag || 'deployment';
  if (opts.requireFlag !== false) {
    if (flag === 'deployment' && org.microsoft_graph_deployment_enabled !== true) {
      throw new HttpError(403, 'Microsoft Graph deployment is not enabled for this organization.');
    }
    if (flag === 'monitoring' && !monitoringEnabled) {
      throw new HttpError(403, 'ACOLYTE Microsoft Graph monitoring is not enabled for this organization.');
    }
    if (flag === 'any' && !deploymentEnabled && !monitoringEnabled) {
      throw new HttpError(403, 'No Microsoft Graph capability is enabled for this organization.');
    }
  }

  return { caller, sr, org, project, orgRole, isPlatformStaff, isPlatformAdmin, deploymentEnabled, monitoringEnabled };
}

// ---------- Tenant connection + tokens ----------

export async function getActiveConnection(sr: any, organizationId: string) {
  const rows = await sr.entities.MicrosoftTenantConnection
    .filter({ organization_id: organizationId }).catch(() => []);
  return rows.find((r: any) => r.connection_status === 'Connected') || rows[0] || null;
}

export async function getActiveCredential(sr: any, organizationId: string) {
  const rows = await sr.entities.MicrosoftTenantCredential
    .filter({ organization_id: organizationId, active: true }).catch(() => []);
  return rows[0] || null;
}

export function decodeJwtRoles(accessToken: string): string[] {
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return Array.isArray(payload.roles) ? payload.roles.map(String).sort() : [];
  } catch {
    return [];
  }
}

// Client-credentials token for ONE organization's own tenant + app registration.
export async function getTenantToken(credential: any): Promise<{ accessToken: string; roles: string[] }> {
  const tenantId = String(credential?.tenant_id || '').trim();
  if (!/^[0-9a-f-]{36}$/i.test(tenantId)) throw new HttpError(400, 'The stored Microsoft tenant ID is invalid.');
  const body = new URLSearchParams({
    client_id: String(credential.client_id || ''),
    client_secret: String(credential.client_secret || ''),
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new HttpError(502, `Microsoft sign-in failed: ${data.error_description || data.error || res.status}`);
  }
  return { accessToken: data.access_token, roles: decodeJwtRoles(data.access_token) };
}

export async function graphFetch(accessToken: string, method: string, path: string, body?: any) {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return { ok: true, status: 204, data: null };
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// The tenant reached through Graph MUST be the tenant recorded for the
// caller's organization. Prevents cross-tenant access via stale credentials.
export async function verifyTenantMatch(accessToken: string, expectedTenantId: string) {
  const res = await graphFetch(accessToken, 'GET', '/organization');
  const tenant = res.data?.value?.[0];
  if (!res.ok || !tenant?.id) throw new HttpError(502, 'Could not read the Microsoft tenant identity from Graph.');
  if (String(tenant.id).toLowerCase() !== String(expectedTenantId).toLowerCase()) {
    throw new HttpError(403, 'Microsoft tenant mismatch: the authorized tenant does not match this organization\'s recorded tenant.');
  }
  return tenant;
}

// ---------- Configuration normalization, diff, verification ----------

const VOLATILE_KEYS = new Set(['id', 'createdDateTime', 'modifiedDateTime', 'lastModifiedDateTime', 'version', '@odata.context', 'templateId']);

export function stripVolatile(value: any): any {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stripVolatile);
  const out: any = {};
  for (const key of Object.keys(value)) {
    if (VOLATILE_KEYS.has(key)) continue;
    out[key] = stripVolatile(value[key]);
  }
  return out;
}

// Projects the actual Graph object onto the desired shape so hashes and
// comparisons only cover the keys Kipuka manages — customer-added settings on
// the same object are never treated as drift Kipuka owns.
export function projectOntoDesired(desired: any, actual: any): any {
  if (desired === null || typeof desired !== 'object' || Array.isArray(desired)) {
    return actual === undefined ? null : actual;
  }
  const out: any = {};
  for (const key of Object.keys(desired)) {
    out[key] = projectOntoDesired(desired[key], actual && typeof actual === 'object' ? actual[key] : undefined);
  }
  return out;
}

export function deepEqual(a: any, b: any): boolean {
  return stableStringify(a) === stableStringify(b);
}

export async function configSha(config: any): Promise<string> {
  return await sha256HexOfText(stableStringify(config ?? null));
}

// Human-readable diff of CURRENT MICROSOFT CONFIGURATION vs PROPOSED KIPUKA
// CONFIGURATION. Arrays and leaf values compare whole at their path.
export function buildDiff(current: any, desired: any, prefix = ''): Array<{ path: string; current: any; proposed: any; kind: string }> {
  const rows: Array<{ path: string; current: any; proposed: any; kind: string }> = [];
  if (desired === null || typeof desired !== 'object' || Array.isArray(desired)) {
    const cur = current === undefined ? null : current;
    rows.push({
      path: prefix || '(value)',
      current: cur,
      proposed: desired,
      kind: cur === null ? 'add' : (deepEqual(cur, desired) ? 'same' : 'change'),
    });
    return rows;
  }
  for (const key of Object.keys(desired)) {
    const childCurrent = current && typeof current === 'object' && !Array.isArray(current) ? current[key] : undefined;
    rows.push(...buildDiff(childCurrent, desired[key], prefix ? `${prefix}.${key}` : key));
  }
  return rows;
}

function valueAtPath(obj: any, path: string): any {
  return String(path || '').split('.').reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj);
}

// VERIFIED requires: (1) the read-back object contains every desired key with
// the desired value, and (2) every explicit validation rule passes.
export function verifyAgainstDesired(desired: any, actual: any, rules: any[] = []): { verified: boolean; failures: string[] } {
  const failures: string[] = [];
  const projection = projectOntoDesired(desired, actual);
  if (!deepEqual(projection, desired)) {
    for (const row of buildDiff(projection, desired)) {
      if (row.kind !== 'same') failures.push(`Setting "${row.path}" is ${JSON.stringify(row.current)} but must be ${JSON.stringify(row.proposed)}.`);
    }
  }
  for (const rule of Array.isArray(rules) ? rules : []) {
    const got = valueAtPath(actual, rule?.path);
    if (!deepEqual(got, rule?.equals)) {
      failures.push(`Validation rule "${rule?.path}" expected ${JSON.stringify(rule?.equals)} but Graph returned ${JSON.stringify(got)}.`);
    }
  }
  return { verified: failures.length === 0, failures };
}

// ---------- Audit ----------

export async function writeAudit(sr: any, args: {
  organizationId: string; caller: any; actionType: string;
  targetEntity?: string; targetRecordId?: string; summary: string;
}) {
  try {
    await sr.entities.AuditLog.create({
      organization_id: args.organizationId || '',
      user_email: args.caller?.email || '',
      user_name: args.caller?.full_name || '',
      action_type: args.actionType,
      target_entity: args.targetEntity || '',
      target_record_id: args.targetRecordId || '',
      action_summary: String(args.summary || '').slice(0, 4000),
      ip_address: '',
      user_agent: 'manage-microsoft-deployment',
    });
  } catch (e) {
    console.warn('Audit log failed:', e?.message);
  }
}

// ---------- Automatic evidence (reuses the canonical ProjectEvidence lifecycle) ----------

// Creates one canonical ProjectEvidence record from a Graph configuration
// snapshot: private JSON file, SHA-256, metadata hash, immutable
// ProjectEvidenceEvent, and ObjectiveEvidenceLink rows (Not Assessed — Graph
// evidence never auto-marks a control or objective MET).
export async function createGraphSnapshotEvidence(sr: any, args: {
  org: any; project: any; caller: any; orgRole: string;
  title: string; label: string; controlIds: string[]; objectiveIds: string[];
  payload: any; tenantDomain: string; transitionId: string;
  // Monitoring evidence: controls are linked only where a defensible mapping
  // exists in the project's assessment; when none match, the evidence is still
  // preserved (requireControls: false) instead of failing the scan.
  requireControls?: boolean; collector?: string; descriptionNote?: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();

  // Only link controls that actually exist in this project's assessment.
  const assessments = await sr.entities.ControlAssessment
    .filter({ project_id: args.project.id }, null, 500).catch(() => []);
  const projectControls = new Set(assessments.map((a: any) => a.control_id));
  const controlIds = [...new Set(args.controlIds)].filter((id) => projectControls.has(id)).sort();
  if (!controlIds.length && args.requireControls !== false) {
    throw new HttpError(409, 'None of the definition\'s controls exist in this project\'s assessment.');
  }

  // Only link objectives that exist in the active objective library for those controls.
  const objectives = await sr.entities.AssessmentObjectiveLibrary
    .filter({ active: true }, null, 500).catch(() => []);
  const validObjectives = (Array.isArray(args.objectiveIds) ? args.objectiveIds : []).map((id) => {
    const matches = objectives.filter((o: any) => o.objective_id === id && controlIds.includes(o.control_id));
    return matches.length === 1 ? matches[0] : null;
  }).filter(Boolean);
  const objectiveIds = [...new Set(validObjectives.map((o: any) => o.objective_id))].sort();

  const bytes = new TextEncoder().encode(JSON.stringify(args.payload, null, 2));
  const hash = await sha256Hex(bytes);
  const fileName = [
    companySegment(args.org),
    'ConfigurationExport',
    sanitizeSegment(controlIds[0] || 'Monitoring', 'Control'),
    'MicrosoftGraph',
    sanitizeSegment(args.label, 'Snapshot'),
    today, // evidence files use the CURRENT collection date — each collection is a new snapshot
  ].join('_') + '.json';

  const uploaded = await sr.integrations.Core.UploadPrivateFile({
    file: new File([bytes], fileName, { type: 'application/json' }),
  });
  if (!uploaded?.file_uri) throw new HttpError(502, 'Private evidence upload failed.');

  // Read back and verify the stored bytes before trusting the record.
  const signed = await sr.integrations.Core.CreateFileSignedUrl({ file_uri: uploaded.file_uri });
  const stored = new Uint8Array(await (await fetch(signed.signed_url)).arrayBuffer());
  if ((await sha256Hex(stored)) !== hash) throw new HttpError(502, 'Evidence hash verification failed after upload.');

  const expiration = new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10);
  const retention = new Date(Date.now() + 3 * 365 * 864e5).toISOString().slice(0, 10);
  const record: any = {
    organization_id: args.org.id, project_id: args.project.id,
    control_ids: controlIds, objective_ids: objectiveIds,
    evidence_title: String(args.title).slice(0, 240), evidence_type: 'Configuration Export',
    source_tool: 'Microsoft Graph', file_uri: uploaded.file_uri, file_url: '',
    file_name: fileName, original_file_name: fileName, mime_type: 'application/json',
    file_size_bytes: bytes.length,
    description: args.descriptionNote
      || `Automated Microsoft Graph configuration snapshot (${args.label}). Collected by the Kipuka deployment engine; final control and objective determination follows the normal review workflow.`,
    evidence_date: today, expiration_date: expiration, retention_until: retention,
    uploaded_by: args.caller.full_name || args.caller.email, uploaded_by_user_id: args.caller.id || '',
    uploaded_by_email: args.caller.email || '', uploaded_date: now,
    owner: args.caller.full_name || args.caller.email, review_status: 'Needs Review',
    quality_notes: '', quality_checklist: {},
    hash_algorithm: 'SHA-256', hash_value: hash, hash_verified_date: now,
    source_system: String(args.tenantDomain || 'Microsoft 365 tenant').slice(0, 240),
    provenance_type: 'API Import',
    provenance_details: JSON.stringify({
      collector: args.collector || 'Kipuka Microsoft Graph deployment engine',
      tenant_id: args.payload?.provenance?.tenant_id || '',
      graph_endpoint: args.payload?.provenance?.graph_endpoint || '',
      graph_object_id: args.payload?.provenance?.graph_object_id || '',
      definition: `${args.payload?.provenance?.definition_key || ''}@${args.payload?.provenance?.definition_version || ''}`,
    }).slice(0, 4000),
    version: 1, supersedes_evidence_id: '', superseded_by_evidence_id: '', lifecycle_status: 'Current',
    last_transition_id: args.transitionId, last_transition_action: 'create',
    last_transition_from_status: '', last_transition_to_status: 'Needs Review',
  };
  record.metadata_sha256 = await metadataSha(record);
  const evidence = await sr.entities.ProjectEvidence.create(record);

  for (const objective of validObjectives) {
    const dupes = await sr.entities.ObjectiveEvidenceLink
      .filter({ project_id: args.project.id, objective_id: objective.objective_id, evidence_id: evidence.id }).catch(() => []);
    if (!dupes.length) {
      await sr.entities.ObjectiveEvidenceLink.create({
        organization_id: args.org.id, project_id: args.project.id, control_id: objective.control_id,
        objective_id: objective.objective_id, evidence_id: evidence.id, status: 'Not Assessed',
        notes: 'Linked by the Microsoft Graph deployment engine; finding remains Not Assessed until reviewed.',
      });
    }
  }

  const eventPayload = {
    organization_id: args.org.id, project_id: args.project.id,
    project_evidence_id: evidence.id, action: 'Created', from_status: '',
    to_status: 'Needs Review', transition_id: args.transitionId, actor_user_id: args.caller.id || '',
    actor_email: args.caller.email || '', actor_name: args.caller.full_name || args.caller.email,
    actor_role: args.orgRole || '', note: `Automated Graph snapshot: ${args.label}`,
    evidence_sha256: hash, metadata_sha256: record.metadata_sha256, event_date: now,
  };
  await sr.entities.ProjectEvidenceEvent.create({
    ...eventPayload,
    event_sha256: await sha256HexOfText(stableStringify(eventPayload)),
  });

  return evidence;
}