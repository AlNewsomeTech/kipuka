// Read-only Microsoft 365 posture collection + configuration drift analysis
// for the OPTIONAL ACOLYTE Graph monitoring capability.
//
// STRICTLY READ-ONLY: every Graph request in this module is a GET. This module
// never creates, updates, or deletes anything in a customer tenant, and the
// monitoring entry point never exposes a write path. Remediation of drift is
// NEVER automatic — it either produces guidance, or (when the separate Graph
// deployment capability is enabled) routes into the full Kipuka deployment
// workflow: precheck → diff → approval → deploy → read back → verify → evidence.

import { GRAPH_BASE, stripVolatile, projectOntoDesired, deepEqual, configSha } from './microsoftGraph.ts';

export const COLLECTOR_VERSION = 'acolyte-graph-monitor-1.0.0';

// Least-privilege READ permissions the customer grants for monitoring. No
// write scopes are ever required for monitoring-only organizations.
export const MONITORING_READ_PERMISSIONS = [
  'Organization.Read.All',
  'User.Read.All',
  'Directory.Read.All',
  'Reports.Read.All',
  'Policy.Read.All',
  'DeviceManagementManagedDevices.Read.All',
  'DeviceManagementConfiguration.Read.All',
  'SecurityEvents.Read.All',
];

// GET-only paged Graph reader. Follows @odata.nextLink up to maxPages.
async function pagedGet(accessToken: string, path: string, maxPages = 5): Promise<{ ok: boolean; items: any[]; truncated: boolean; error?: string }> {
  const items: any[] = [];
  let url: string | undefined = `${GRAPH_BASE}${path}`;
  let truncated = false;
  for (let page = 0; page < maxPages && url; page += 1) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, items, truncated, error: data?.error?.message || `HTTP ${res.status}` };
    }
    items.push(...(Array.isArray(data.value) ? data.value : [data]));
    url = data['@odata.nextLink'];
    if (url && page === maxPages - 1) truncated = true;
  }
  return { ok: true, items, truncated };
}

function sortedStrings(value: any): string[] {
  return [...new Set((Array.isArray(value) ? value : []).map((v) => String(v || '')).filter(Boolean))].sort();
}

// Condenses one Conditional Access policy to the security-relevant shape used
// for drift comparison. Arrays are sorted and volatile keys stripped so
// ordering differences and timestamps never register as drift.
async function condenseCaPolicy(policy: any, managedIndex: Map<string, any>) {
  const managed = managedIndex.get(String(policy.id || ''));
  const conditions = policy.conditions || {};
  return {
    graph_id: String(policy.id || ''),
    display_name: String(policy.displayName || ''),
    state: String(policy.state || ''),
    managed_by: managed ? 'Kipuka' : 'Customer',
    deployment_id: managed?.id || '',
    include_users: sortedStrings(conditions.users?.includeUsers),
    exclude_users: sortedStrings(conditions.users?.excludeUsers),
    include_groups: sortedStrings(conditions.users?.includeGroups),
    exclude_groups: sortedStrings(conditions.users?.excludeGroups),
    include_applications: sortedStrings(conditions.applications?.includeApplications),
    client_app_types: sortedStrings(conditions.clientAppTypes),
    grant_controls: sortedStrings(policy.grantControls?.builtInControls),
    grant_operator: String(policy.grantControls?.operator || ''),
    auth_strength: String(policy.grantControls?.authenticationStrength?.displayName || ''),
    session_controls: Object.keys(policy.sessionControls || {}).filter((k) => policy.sessionControls?.[k]).sort(),
    config_sha256: await configSha(stripVolatile(policy)),
  };
}

// Collects the Phase 1 posture areas. Each area is best-effort: a missing
// permission or Graph error becomes a warning and the scan stays Partial
// instead of failing outright.
export async function collectPosture(accessToken: string, opts: {
  tenant: any; deployments: any[];
}) {
  const warnings: string[] = [];
  const errors: string[] = [];
  const raw: Record<string, any> = {};
  let collectedAreas = 0;

  const managedIndex = new Map<string, any>(
    (opts.deployments || [])
      .filter((d: any) => d.graph_object_id)
      .map((d: any) => [String(d.graph_object_id), d]),
  );

  // ---- Identity ----
  const identity_summary: any = {
    tenant_display_name: String(opts.tenant?.displayName || ''),
    verified_domains: sortedStrings((opts.tenant?.verifiedDomains || []).map((d: any) => d?.name)),
  };
  const users = await pagedGet(accessToken, '/users?$select=id,userPrincipalName,accountEnabled,userType&$top=999', 10);
  if (users.ok) {
    collectedAreas += 1;
    identity_summary.total_users = users.items.length;
    identity_summary.enabled_users = users.items.filter((u) => u.accountEnabled === true).length;
    identity_summary.disabled_users = users.items.filter((u) => u.accountEnabled === false).length;
    identity_summary.guest_users = users.items.filter((u) => String(u.userType || '').toLowerCase() === 'guest').length;
    identity_summary.users_truncated = users.truncated;
  } else {
    warnings.push(`Users: ${users.error}`);
  }
  const roles = await pagedGet(accessToken, '/directoryRoles?$expand=members($select=id,userPrincipalName)', 3);
  if (roles.ok) {
    collectedAreas += 1;
    const privileged: Record<string, string[]> = {};
    for (const role of roles.items) {
      const members = sortedStrings((role.members || []).map((m: any) => m?.userPrincipalName)).slice(0, 50);
      if (members.length) privileged[String(role.displayName || 'Unknown role')] = members;
    }
    identity_summary.privileged_roles = privileged;
    raw.directory_roles = roles.items.map((r: any) => ({
      displayName: r.displayName,
      members: (r.members || []).map((m: any) => ({ id: m.id, userPrincipalName: m.userPrincipalName })),
    }));
  } else {
    warnings.push(`Directory roles: ${roles.error}`);
  }
  const groups = await pagedGet(accessToken, '/groups?$select=id,displayName,securityEnabled&$top=999', 2);
  if (groups.ok) {
    identity_summary.groups_total = groups.items.length;
    identity_summary.security_groups = groups.items.filter((g) => g.securityEnabled === true).length;
    identity_summary.groups_truncated = groups.truncated;
  } else {
    warnings.push(`Groups: ${groups.error}`);
  }

  // ---- MFA / authentication registration ----
  // Registration data identifies coverage; it is NOT by itself a complete
  // CMMC MFA implementation determination.
  const mfa_summary: any = {};
  const mfa = await pagedGet(accessToken, '/reports/authenticationMethods/userRegistrationDetails?$top=999', 10);
  if (mfa.ok) {
    collectedAreas += 1;
    const total = mfa.items.length;
    const capable = mfa.items.filter((u) => u.isMfaCapable === true).length;
    const registered = mfa.items.filter((u) => u.isMfaRegistered === true).length;
    const notRegistered = mfa.items.filter((u) => u.isMfaRegistered !== true);
    mfa_summary.total_users = total;
    mfa_summary.mfa_capable = capable;
    mfa_summary.mfa_registered = registered;
    mfa_summary.not_registered_count = notRegistered.length;
    mfa_summary.not_registered_sample = sortedStrings(notRegistered.map((u) => u.userPrincipalName)).slice(0, 25);
    mfa_summary.coverage_percent = total ? Math.round((registered / total) * 1000) / 10 : null;
    mfa_summary.truncated = mfa.truncated;
    mfa_summary.note = 'MFA registration coverage only. Registration alone does not prove a complete CMMC MFA implementation.';
    raw.mfa_registration = mfa.items.map((u: any) => ({
      userPrincipalName: u.userPrincipalName, isMfaCapable: u.isMfaCapable, isMfaRegistered: u.isMfaRegistered,
    }));
  } else {
    warnings.push(`MFA registration report: ${mfa.error}`);
  }

  // ---- Conditional Access ----
  const conditional_access_summary: any = {};
  const caHashes: Record<string, string> = {};
  const ca = await pagedGet(accessToken, '/identity/conditionalAccess/policies', 5);
  let rawCaPolicies: any[] = [];
  if (ca.ok) {
    collectedAreas += 1;
    rawCaPolicies = ca.items;
    raw.conditional_access_policies = ca.items;
    const policies = [];
    for (const policy of ca.items) {
      const condensed = await condenseCaPolicy(policy, managedIndex);
      policies.push(condensed);
      caHashes[condensed.graph_id] = condensed.config_sha256;
    }
    policies.sort((a, b) => a.display_name.localeCompare(b.display_name));
    conditional_access_summary.policies = policies;
    conditional_access_summary.total = policies.length;
    conditional_access_summary.enabled = policies.filter((p) => p.state === 'enabled').length;
    conditional_access_summary.report_only = policies.filter((p) => p.state === 'enabledForReportingButNotEnforced').length;
    conditional_access_summary.disabled = policies.filter((p) => p.state === 'disabled').length;
    conditional_access_summary.kipuka_managed = policies.filter((p) => p.managed_by === 'Kipuka').length;
  } else {
    warnings.push(`Conditional Access: ${ca.error}`);
  }

  // ---- Intune managed devices ----
  const device_summary: any = {};
  const devices = await pagedGet(accessToken, '/deviceManagement/managedDevices?$select=id,deviceName,operatingSystem,osVersion,userPrincipalName,complianceState,lastSyncDateTime&$top=999', 10);
  if (devices.ok) {
    collectedAreas += 1;
    const byState: Record<string, number> = {};
    const osCounts: Record<string, number> = {};
    const deviceMap: Record<string, any> = {};
    for (const device of devices.items) {
      const state = String(device.complianceState || 'unknown');
      byState[state] = (byState[state] || 0) + 1;
      const os = String(device.operatingSystem || 'Unknown');
      osCounts[os] = (osCounts[os] || 0) + 1;
      if (Object.keys(deviceMap).length < 500) {
        deviceMap[String(device.id)] = {
          name: String(device.deviceName || ''), os,
          compliance: state, user: String(device.userPrincipalName || ''),
          last_sync: String(device.lastSyncDateTime || ''),
        };
      }
    }
    device_summary.total = devices.items.length;
    device_summary.compliant = byState.compliant || 0;
    device_summary.noncompliant = byState.noncompliant || 0;
    device_summary.in_grace_period = byState.inGracePeriod || 0;
    device_summary.states = byState;
    device_summary.os_counts = osCounts;
    device_summary.devices = deviceMap;
    device_summary.devices_truncated = devices.truncated || devices.items.length > 500;
    raw.managed_devices = devices.items;
  } else {
    warnings.push(`Intune managed devices: ${devices.error}`);
  }

  // ---- Intune policies ----
  const compliance_summary: any = {};
  const complianceHashes: Record<string, string> = {};
  const compliancePolicies = await pagedGet(accessToken, '/deviceManagement/deviceCompliancePolicies?$expand=assignments', 3);
  if (compliancePolicies.ok) {
    collectedAreas += 1;
    raw.compliance_policies = compliancePolicies.items;
    const rows = [];
    for (const policy of compliancePolicies.items) {
      const hash = await configSha(stripVolatile(policy));
      complianceHashes[String(policy.id)] = hash;
      rows.push({
        graph_id: String(policy.id || ''),
        display_name: String(policy.displayName || ''),
        platform: String(policy['@odata.type'] || '').replace('#microsoft.graph.', ''),
        assignment_count: Array.isArray(policy.assignments) ? policy.assignments.length : 0,
        managed_by: managedIndex.has(String(policy.id)) ? 'Kipuka' : 'Customer',
        deployment_id: managedIndex.get(String(policy.id))?.id || '',
        config_sha256: hash,
      });
    }
    rows.sort((a, b) => a.display_name.localeCompare(b.display_name));
    compliance_summary.policies = rows;
    compliance_summary.total = rows.length;
  } else {
    warnings.push(`Intune compliance policies: ${compliancePolicies.error}`);
  }
  const configPolicies = await pagedGet(accessToken, '/deviceManagement/deviceConfigurations?$select=id,displayName&$top=999', 2);
  if (configPolicies.ok) {
    compliance_summary.configuration_policies = configPolicies.items
      .map((p: any) => ({ graph_id: String(p.id || ''), display_name: String(p.displayName || '') }))
      .sort((a: any, b: any) => a.display_name.localeCompare(b.display_name));
  } else {
    warnings.push(`Intune configuration policies: ${configPolicies.error}`);
  }

  // ---- Microsoft Secure Score ----
  const secure_score_summary: any = {};
  const secureScores = await pagedGet(accessToken, '/security/secureScores?$top=5', 1);
  if (secureScores.ok && secureScores.items.length) {
    collectedAreas += 1;
    raw.secure_scores = secureScores.items;
    const latest = [...secureScores.items].sort((a, b) => String(b.createdDateTime || '').localeCompare(String(a.createdDateTime || '')))[0];
    const current = Number(latest.currentScore);
    const max = Number(latest.maxScore);
    secure_score_summary.current_score = Number.isFinite(current) ? current : null;
    secure_score_summary.max_score = Number.isFinite(max) ? max : null;
    secure_score_summary.percent = Number.isFinite(current) && Number.isFinite(max) && max > 0
      ? Math.round((current / max) * 1000) / 10 : null;
    secure_score_summary.report_date = String(latest.createdDateTime || '').slice(0, 10);
  } else {
    warnings.push(`Secure Score: ${secureScores.error || 'no Secure Score records returned'}`);
  }

  return {
    identity_summary, mfa_summary, conditional_access_summary, device_summary,
    compliance_summary, secure_score_summary,
    config_hashes: { conditional_access: caHashes, compliance_policies: complianceHashes },
    raw, rawCaPolicies, warnings, errors, collectedAreas,
  };
}

// ---------- Drift analysis ----------

const CA_CONTROLS = ['AC.L2-3.1.1', 'IA.L2-3.5.3'];
const MFA_CONTROLS = ['IA.L2-3.5.3'];
const DEVICE_CONTROLS = ['CM.L2-3.4.1', 'CM.L2-3.4.2'];

function item(args: any) {
  return {
    fingerprint: String(args.fingerprint),
    drift_type: String(args.drift_type),
    severity: String(args.severity),
    category: String(args.category),
    title: String(args.title).slice(0, 240),
    object_type: String(args.object_type || ''),
    object_id: String(args.object_id || ''),
    object_name: String(args.object_name || ''),
    deployment_id: String(args.deployment_id || ''),
    expected: String(args.expected || '').slice(0, 1000),
    observed: String(args.observed || '').slice(0, 1000),
    recommended_action: String(args.recommended_action || '').slice(0, 1000),
    control_ids: Array.isArray(args.control_ids) ? args.control_ids : [],
  };
}

// Compares the newest snapshot content against (1) the most recently approved
// Microsoft baseline snapshot and (2) verified Kipuka deployment desired
// configurations (only when the separate deployment capability is enabled).
// Only meaningful security changes are reported: comparisons run over
// normalized, sorted, volatile-free shapes, so timestamps, IDs, and ordering
// differences never create noise.
export function buildDriftItems(args: {
  current: any; baseline: any | null; deployments: any[]; deploymentEnabled: boolean; rawCaPolicies: any[];
}): any[] {
  const items: any[] = [];
  const cur = args.current || {};
  const base = args.baseline || null;

  const curPolicies = new Map<string, any>(
    (cur.conditional_access_summary?.policies || []).map((p: any) => [p.graph_id, p]),
  );

  if (base) {
    const basePolicies = new Map<string, any>(
      (base.conditional_access_summary?.policies || []).map((p: any) => [p.graph_id, p]),
    );

    for (const [id, bp] of basePolicies) {
      const cp = curPolicies.get(id);
      if (!cp) {
        items.push(item({
          fingerprint: `ca_policy_deleted|${id}`, drift_type: 'ca_policy_deleted',
          severity: bp.managed_by === 'Kipuka' ? 'Critical' : 'High', category: 'Identity and Access',
          title: `Conditional Access policy deleted: ${bp.display_name}`,
          object_type: 'conditionalAccessPolicy', object_id: id, object_name: bp.display_name,
          deployment_id: bp.deployment_id,
          expected: `Policy "${bp.display_name}" present in state "${bp.state}" (approved baseline).`,
          observed: 'The policy no longer exists in the tenant.',
          recommended_action: 'Restore the expected policy, or review and approve the removal as an intentional baseline change.',
          control_ids: CA_CONTROLS,
        }));
        continue;
      }
      if (bp.state !== cp.state) {
        const weakened = cp.state === 'disabled'
          || (bp.state === 'enabled' && cp.state === 'enabledForReportingButNotEnforced');
        items.push(item({
          fingerprint: `ca_policy_state|${id}`, drift_type: 'ca_policy_state_changed',
          severity: weakened ? 'High' : 'Moderate', category: 'Identity and Access',
          title: weakened
            ? `Conditional Access policy disabled or weakened: ${cp.display_name}`
            : `Conditional Access policy state changed: ${cp.display_name}`,
          object_type: 'conditionalAccessPolicy', object_id: id, object_name: cp.display_name,
          deployment_id: cp.deployment_id,
          expected: `State "${bp.state}" (approved baseline).`,
          observed: `State "${cp.state}".`,
          recommended_action: 'Restore the expected state, or review and approve the new configuration.',
          control_ids: CA_CONTROLS,
        }));
      }
      if (bp.config_sha256 !== cp.config_sha256) {
        const exclusionsAdded = cp.exclude_users.filter((u: string) => !bp.exclude_users.includes(u))
          .concat(cp.exclude_groups.filter((g: string) => !bp.exclude_groups.includes(g)));
        const exclusionsRemoved = bp.exclude_users.filter((u: string) => !cp.exclude_users.includes(u))
          .concat(bp.exclude_groups.filter((g: string) => !cp.exclude_groups.includes(g)));
        const grantsWeakened = bp.grant_controls.filter((g: string) => !cp.grant_controls.includes(g));
        const assignmentNarrowed = bp.include_users.some((u: string) => !cp.include_users.includes(u))
          || bp.include_groups.some((g: string) => !cp.include_groups.includes(g))
          || bp.include_applications.some((a: string) => !cp.include_applications.includes(a));
        const authChanged = bp.auth_strength !== cp.auth_strength;
        const details: string[] = [];
        if (exclusionsAdded.length) details.push(`exclusions added (${exclusionsAdded.slice(0, 5).join(', ')})`);
        if (exclusionsRemoved.length) details.push(`exclusions removed (${exclusionsRemoved.slice(0, 5).join(', ')})`);
        if (grantsWeakened.length) details.push(`grant controls removed (${grantsWeakened.join(', ')})`);
        if (assignmentNarrowed) details.push('assignment scope narrowed');
        if (authChanged) details.push(`authentication strength changed ("${bp.auth_strength || 'none'}" → "${cp.auth_strength || 'none'}")`);
        const high = exclusionsAdded.length > 0 || grantsWeakened.length > 0 || assignmentNarrowed;
        items.push(item({
          fingerprint: `ca_policy_modified|${id}`,
          drift_type: cp.managed_by === 'Kipuka' ? 'kipuka_policy_modified' : 'ca_policy_modified',
          severity: cp.managed_by === 'Kipuka' || high ? 'High' : 'Moderate',
          category: 'Identity and Access',
          title: cp.managed_by === 'Kipuka'
            ? `Kipuka-managed policy modified outside Kipuka: ${cp.display_name}`
            : `Conditional Access policy modified: ${cp.display_name}`,
          object_type: 'conditionalAccessPolicy', object_id: id, object_name: cp.display_name,
          deployment_id: cp.deployment_id,
          expected: 'Configuration matching the approved baseline.',
          observed: details.length ? `Changed: ${details.join('; ')}.` : 'The normalized policy configuration differs from the approved baseline.',
          recommended_action: 'Restore the expected configuration, or review and approve the change.',
          control_ids: CA_CONTROLS,
        }));
      }
    }
    for (const [id, cp] of curPolicies) {
      if (!basePolicies.has(id) && cp.managed_by !== 'Kipuka') {
        items.push(item({
          fingerprint: `ca_policy_new|${id}`, drift_type: 'ca_policy_new',
          severity: 'Low', category: 'Identity and Access',
          title: `New Conditional Access policy created outside Kipuka: ${cp.display_name}`,
          object_type: 'conditionalAccessPolicy', object_id: id, object_name: cp.display_name,
          expected: 'Only baseline-approved or Kipuka-deployed policies.',
          observed: `New policy "${cp.display_name}" in state "${cp.state}".`,
          recommended_action: 'Review the new policy and approve an updated baseline if it is intentional.',
          control_ids: CA_CONTROLS,
        }));
      }
    }

    // MFA registration coverage decrease
    const basePct = base.mfa_summary?.coverage_percent;
    const curPct = cur.mfa_summary?.coverage_percent;
    if (basePct != null && curPct != null && basePct - curPct >= 2) {
      items.push(item({
        fingerprint: 'mfa_coverage_decreased', drift_type: 'mfa_coverage_decreased',
        severity: 'Moderate', category: 'Identity and Access',
        title: 'MFA registration coverage decreased',
        object_type: 'authenticationMethodsReport',
        expected: `MFA registration coverage of about ${basePct}% (approved baseline).`,
        observed: `Coverage is now ${curPct}%.`,
        recommended_action: 'Identify the unregistered users and complete their MFA registration.',
        control_ids: MFA_CONTROLS,
      }));
    }

    // Privileged role membership changes
    const baseRoles = base.identity_summary?.privileged_roles || {};
    const curRoles = cur.identity_summary?.privileged_roles || {};
    for (const role of new Set([...Object.keys(baseRoles), ...Object.keys(curRoles)])) {
      const before = baseRoles[role] || [];
      const after = curRoles[role] || [];
      const added = after.filter((m: string) => !before.includes(m));
      const removed = before.filter((m: string) => !after.includes(m));
      if (added.length || removed.length) {
        items.push(item({
          fingerprint: `privileged_role_changed|${role}`, drift_type: 'privileged_role_changed',
          severity: 'Moderate', category: 'Identity and Access',
          title: `Privileged role membership changed: ${role}`,
          object_type: 'directoryRole', object_name: role,
          expected: `Members: ${before.slice(0, 10).join(', ') || 'none'} (approved baseline).`,
          observed: [added.length ? `added ${added.slice(0, 10).join(', ')}` : '', removed.length ? `removed ${removed.slice(0, 10).join(', ')}` : ''].filter(Boolean).join('; '),
          recommended_action: 'Confirm the privileged access change was authorized, or restore the expected membership.',
          control_ids: ['AC.L2-3.1.5'],
        }));
      }
    }

    // Devices
    const baseDevices = base.device_summary?.devices || {};
    const curDevices = cur.device_summary?.devices || {};
    for (const [id, device] of Object.entries<any>(curDevices)) {
      if (!baseDevices[id]) {
        items.push(item({
          fingerprint: `device_new|${id}`, drift_type: 'device_new',
          severity: 'Informational', category: 'Endpoint Security',
          title: `New managed device enrolled: ${device.name || id}`,
          object_type: 'managedDevice', object_id: id, object_name: device.name,
          expected: 'Only baseline-known devices.', observed: `New device "${device.name}" (${device.os}).`,
          recommended_action: 'Confirm the enrollment is expected and record it in the asset inventory.',
          control_ids: DEVICE_CONTROLS,
        }));
      } else if (baseDevices[id].compliance === 'compliant' && device.compliance === 'noncompliant') {
        items.push(item({
          fingerprint: `device_noncompliant|${id}`, drift_type: 'device_noncompliant',
          severity: 'Moderate', category: 'Endpoint Security',
          title: `Device became noncompliant: ${device.name || id}`,
          object_type: 'managedDevice', object_id: id, object_name: device.name,
          expected: 'Compliant (approved baseline).', observed: 'Noncompliant.',
          recommended_action: 'Investigate the failing compliance settings on the device and remediate.',
          control_ids: DEVICE_CONTROLS,
        }));
      }
    }

    // Intune compliance policies removed / unassigned
    const basePolicyRows = new Map<string, any>((base.compliance_summary?.policies || []).map((p: any) => [p.graph_id, p]));
    const curPolicyRows = new Map<string, any>((cur.compliance_summary?.policies || []).map((p: any) => [p.graph_id, p]));
    for (const [id, bp] of basePolicyRows) {
      const cp = curPolicyRows.get(id);
      if (!cp) {
        items.push(item({
          fingerprint: `compliance_policy_removed|${id}`, drift_type: 'compliance_policy_removed',
          severity: 'High', category: 'Endpoint Security',
          title: `Intune compliance policy removed: ${bp.display_name}`,
          object_type: 'deviceCompliancePolicy', object_id: id, object_name: bp.display_name,
          deployment_id: bp.deployment_id,
          expected: `Compliance policy "${bp.display_name}" present (approved baseline).`,
          observed: 'The policy no longer exists.',
          recommended_action: 'Restore the expected compliance policy, or review and approve the removal.',
          control_ids: DEVICE_CONTROLS,
        }));
      } else if (Number(bp.assignment_count) > 0 && Number(cp.assignment_count) === 0) {
        items.push(item({
          fingerprint: `intune_assignment_removed|${id}`, drift_type: 'intune_assignment_removed',
          severity: 'High', category: 'Endpoint Security',
          title: `Intune policy assignments removed: ${cp.display_name}`,
          object_type: 'deviceCompliancePolicy', object_id: id, object_name: cp.display_name,
          deployment_id: cp.deployment_id,
          expected: `${bp.assignment_count} assignment(s) (approved baseline).`, observed: 'No assignments remain.',
          recommended_action: 'Restore the expected assignments, or review and approve the change.',
          control_ids: DEVICE_CONTROLS,
        }));
      }
    }

    // Secure Score material decline
    const basePctScore = base.secure_score_summary?.percent;
    const curPctScore = cur.secure_score_summary?.percent;
    if (basePctScore != null && curPctScore != null && basePctScore - curPctScore >= 5) {
      items.push(item({
        fingerprint: 'secure_score_decline', drift_type: 'secure_score_decline',
        severity: 'Moderate', category: 'Cloud Security',
        title: 'Microsoft Secure Score materially declined',
        object_type: 'secureScore',
        expected: `Secure Score around ${basePctScore}% (approved baseline).`,
        observed: `Secure Score is now ${curPctScore}%.`,
        recommended_action: 'Review the Secure Score history to identify the regressed improvement actions.',
        control_ids: [],
      }));
    }
  }

  // Verified Kipuka deployments act as an authoritative baseline for the
  // objects they manage — with or without an approved snapshot baseline.
  const rawById = new Map<string, any>((args.rawCaPolicies || []).map((p: any) => [String(p.id || ''), p]));
  for (const dep of (args.deployments || [])) {
    if (dep.status !== 'Verified' || !dep.graph_object_id) continue;
    if (!String(dep.graph_endpoint || '').includes('/identity/conditionalAccess/policies')) continue;
    const rawObj = rawById.get(String(dep.graph_object_id));
    const fingerprint = `kipuka_deployment_drift|${dep.graph_object_id}`;
    if (!rawObj) {
      items.push(item({
        fingerprint: `kipuka_policy_deleted|${dep.graph_object_id}`, drift_type: 'kipuka_policy_deleted',
        severity: 'Critical', category: 'Identity and Access',
        title: `Kipuka-managed policy deleted: ${dep.deployed_display_name}`,
        object_type: 'conditionalAccessPolicy', object_id: dep.graph_object_id,
        object_name: dep.deployed_display_name, deployment_id: dep.id,
        expected: `Verified Kipuka deployment "${dep.deployed_display_name}" present.`,
        observed: 'The policy no longer exists in the tenant.',
        recommended_action: args.deploymentEnabled
          ? 'Review the proposed restoration through the Kipuka deployment workflow (precheck, diff, approval, deploy, verify).'
          : 'Restore the expected policy in the Microsoft portal, or review and approve the removal.',
        control_ids: [dep.primary_control_id].filter(Boolean),
      }));
      continue;
    }
    const desired = { ...(dep.proposed_configuration || {}) };
    delete (desired as any).scheduledActionsForRule;
    const projection = projectOntoDesired(desired, stripVolatile(rawObj));
    if (!deepEqual(projection, desired)) {
      items.push(item({
        fingerprint, drift_type: 'kipuka_policy_modified',
        severity: 'High', category: 'Identity and Access',
        title: `Kipuka-managed policy modified outside Kipuka: ${dep.deployed_display_name}`,
        object_type: 'conditionalAccessPolicy', object_id: dep.graph_object_id,
        object_name: dep.deployed_display_name, deployment_id: dep.id,
        expected: 'The verified desired configuration approved through the Kipuka deployment workflow.',
        observed: 'The live configuration no longer matches the verified desired state.',
        recommended_action: args.deploymentEnabled
          ? 'Review the proposed restoration through the Kipuka deployment workflow (precheck, diff, approval, deploy, verify).'
          : 'Restore the expected configuration in the Microsoft portal, or review and approve the change.',
        control_ids: [dep.primary_control_id].filter(Boolean),
      }));
    }
  }

  // Deduplicate by fingerprint, keeping the highest-severity occurrence.
  const rank: Record<string, number> = { Critical: 5, High: 4, Moderate: 3, Low: 2, Informational: 1 };
  const byFingerprint = new Map<string, any>();
  for (const drift of items) {
    const existing = byFingerprint.get(drift.fingerprint);
    if (!existing || (rank[drift.severity] || 0) > (rank[existing.severity] || 0)) {
      byFingerprint.set(drift.fingerprint, drift);
    }
  }
  return [...byFingerprint.values()];
}