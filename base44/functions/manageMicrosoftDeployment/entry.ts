// Staged Microsoft Graph deployment engine (OPTIONAL capability).
// PRECHECK → BUILD/DIFF → APPROVAL → DEPLOY → READ BACK & VERIFY → EVIDENCE.
//
// Guarantees enforced here, server-side, on EVERY request:
//  - The organization feature flag must be true (checked before any Graph work).
//  - Caller authorization resolves from canonical records, never the browser.
//  - The Graph tenant is verified against the organization's recorded tenant.
//  - Updates PATCH the stored Graph object ID; policy names keep the FROZEN
//    original deployment date — no duplicate policies on a new calendar date.
//  - Conditional Access deploys report-only unless the definition says otherwise.
//  - VERIFIED is set only after the object is read back from Graph and matches
//    the desired canonical configuration (plus explicit validation rules).
//  - Every deployment creates before/after ProjectEvidence through the
//    canonical lifecycle; evidence never auto-marks a control MET.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  HttpError, DEPLOY_ROLES, resolveGraphAccess, getActiveConnection, getActiveCredential,
  getTenantToken, verifyTenantMatch, graphFetch, stripVolatile, projectOntoDesired,
  buildDiff, verifyAgainstDesired, configSha, buildDeploymentPolicyName, writeAudit,
  createGraphSnapshotEvidence, deepEqual,
} from '../../shared/microsoftGraph.ts';
import { sha256HexOfText, stableStringify } from '../../shared/evidenceIntegrity.ts';

const ACTIONS = ['overview', 'precheck', 'deploy', 'check_drift', 'rollback'];
const ALLOWED_KEYS = ['action', 'project_id', 'definition_id', 'deployment_id', 'approve', 'approved_desired_sha256', 'rollback_snapshot_sha256'];

// Desired configuration used for read-back verification: some Graph payload
// keys (e.g. Intune scheduledActionsForRule) are required at POST time but not
// echoed faithfully by GET, so the definition may exclude them from verification.
function verifiableDesired(desired: any, definition: any) {
  const copy = JSON.parse(JSON.stringify(desired || {}));
  for (const key of definition?.verify_ignore_keys || []) delete copy[key];
  return copy;
}

function buildDesired(definition: any, deploymentMode: string, displayName: string) {
  const desired = JSON.parse(JSON.stringify(definition.desired_configuration || {}));
  desired.displayName = displayName;
  if (definition.graph_resource_type === 'conditionalAccessPolicy') {
    desired.state = deploymentMode === 'enabled' ? 'enabled' : 'enabledForReportingButNotEnforced';
  }
  return desired;
}

function snapshotProvenance(args: any) {
  return {
    organization: args.org.organization_name, organization_id: args.org.id,
    project: args.project.project_name, project_id: args.project.id,
    tenant_id: args.connection.tenant_id, tenant_domain: args.connection.tenant_primary_domain || '',
    microsoft_service: args.definitionRecord?.microsoft_service || args.deployment?.microsoft_service || '',
    graph_endpoint: args.deployment?.graph_endpoint || '', graph_object_id: args.deployment?.graph_object_id || '',
    policy_display_name: args.deployment?.deployed_display_name || '',
    definition_key: args.deployment?.definition_key || '', definition_version: args.deployment?.definition_version || '',
    definition_sha256: args.deployment?.definition_sha256 || '',
    collection_timestamp: new Date().toISOString(),
    deploying_user: args.caller.email || '', approving_user: args.deployment?.approved_by || '',
    desired_configuration_sha256: args.deployment?.desired_sha256 || '',
    actual_configuration_sha256: args.actualSha || '',
    assignments: args.deployment?.assignment_summary || '', exclusions: args.deployment?.exclusion_summary || '',
    verification_result: args.verification || '',
  };
}

async function loadDeployment(sr: any, project: any, deploymentId: string) {
  const deployment = await sr.entities.MicrosoftPolicyDeployment.get(String(deploymentId || '')).catch(() => null);
  if (!deployment || deployment.project_id !== project.id || deployment.organization_id !== project.organization_id) {
    throw new HttpError(404, 'Deployment not found for this project.');
  }
  return deployment;
}

async function requireConnectedTenant(sr: any, org: any) {
  const connection = await getActiveConnection(sr, org.id);
  if (!connection || connection.connection_status !== 'Connected') {
    throw new HttpError(409, 'Connect the organization\'s Microsoft tenant before running deployments.');
  }
  const credential = await getActiveCredential(sr, org.id);
  if (!credential || credential.tenant_id !== connection.tenant_id) {
    throw new HttpError(409, 'The stored Microsoft credential is missing or does not match the recorded tenant.');
  }
  const { accessToken, roles } = await getTenantToken(credential);
  await verifyTenantMatch(accessToken, connection.tenant_id);
  await sr.entities.MicrosoftTenantConnection.update(connection.id, {
    last_successful_call: new Date().toISOString(), connection_health: 'Healthy', granted_scopes: roles,
  }).catch(() => {});
  return { connection, accessToken, roles };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const unknown = Object.keys(body).filter((k) => !ALLOWED_KEYS.includes(k));
    if (unknown.length) return Response.json({ error: `Unexpected fields: ${unknown.join(', ')}` }, { status: 400 });
    const action = String(body.action || '');
    if (!ACTIONS.includes(action)) return Response.json({ error: 'Unsupported action.' }, { status: 400 });
    if (!body.project_id) return Response.json({ error: 'project_id is required.' }, { status: 400 });

    // Feature flag + org/project authorization on EVERY request, before any Graph work.
    const { caller, sr, org, project, orgRole } = await resolveGraphAccess(base44, {
      projectId: String(body.project_id),
      requireFlag: true,
      allowedRoles: action === 'overview' ? null : DEPLOY_ROLES,
    });
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    // ---------------- OVERVIEW (no Graph calls) ----------------
    if (action === 'overview') {
      const [connection, definitions, deployments] = await Promise.all([
        getActiveConnection(sr, org.id),
        sr.entities.MicrosoftPolicyDefinition.filter({ active: true }, 'definition_key', 200).catch(() => []),
        sr.entities.MicrosoftPolicyDeployment.filter({ project_id: project.id }, '-updated_date', 200).catch(() => []),
      ]);
      const stack = project.implementation_stack || '';
      const applicable = definitions.filter((d: any) =>
        !Array.isArray(d.target_stacks) || d.target_stacks.length === 0 || d.target_stacks.includes(stack));
      return Response.json({
        enabled: true,
        connection: connection ? {
          tenant_id: connection.tenant_id, tenant_display_name: connection.tenant_display_name || '',
          tenant_primary_domain: connection.tenant_primary_domain || '',
          connection_status: connection.connection_status, connection_health: connection.connection_health,
          connection_verified_date: connection.connection_verified_date || '',
          granted_scopes: connection.granted_scopes || [], last_successful_call: connection.last_successful_call || '',
        } : null,
        definitions: applicable,
        deployments,
        can_deploy: DEPLOY_ROLES.includes(orgRole),
      });
    }

    // ---------------- STAGE 1: PRECHECK (read-only against the tenant) ----------------
    if (action === 'precheck') {
      const definition = await sr.entities.MicrosoftPolicyDefinition.get(String(body.definition_id || '')).catch(() => null);
      if (!definition || definition.active !== true) return Response.json({ error: 'Active policy definition not found.' }, { status: 404 });

      const { connection, accessToken, roles } = await requireConnectedTenant(sr, org);
      const missingPermissions = (definition.required_application_permissions || []).filter((p: string) => !roles.includes(p));

      // Duplicate prevention: exactly one deployment record per project + definition key.
      const existingRows = await sr.entities.MicrosoftPolicyDeployment
        .filter({ project_id: project.id, definition_key: definition.definition_key }).catch(() => []);
      const existing = existingRows[0] || null;

      // Frozen naming date: reuse the original deployment date when this
      // definition was already deployed here; new deployments freeze today.
      const namingDate = existing?.original_deployment_date || today;
      const displayName = buildDeploymentPolicyName({
        organization: org, policyType: definition.policy_type || 'Policy',
        controlId: definition.primary_control_id, location: definition.policy_location || 'Microsoft365',
        date: namingDate,
      });
      const deploymentMode = definition.initial_deployment_mode || 'report_only';
      const desired = buildDesired(definition, deploymentMode, displayName);
      const desiredSha = await configSha(desired);

      // Read the current tenant state. No changes are made during precheck.
      let currentConfig: any = null;
      let managedObjectMissing = false;
      if (existing?.graph_object_id) {
        const read = await graphFetch(accessToken, 'GET', `${definition.graph_endpoint}/${existing.graph_object_id}${definition.graph_read_suffix || ''}`);
        if (read.ok) currentConfig = stripVolatile(read.data);
        else if (read.status === 404) managedObjectMissing = true;
        else throw new HttpError(502, `Graph read failed (${read.status}): ${read.data?.error?.message || ''}`);
      }
      const listRes = await graphFetch(accessToken, 'GET', definition.graph_endpoint);
      if (!listRes.ok) throw new HttpError(502, `Graph list failed (${listRes.status}): ${listRes.data?.error?.message || 'check granted permissions'}`);
      const existingPolicies = (listRes.data?.value || []).map((p: any) => ({
        id: p.id, displayName: p.displayName || p.name || '(unnamed)', state: p.state || '',
        kipuka_managed: existing?.graph_object_id === p.id,
      }));
      const nameConflict = existingPolicies.find((p: any) => !p.kipuka_managed && p.displayName === displayName);

      const diff = buildDiff(currentConfig, desired).filter((row) => row.kind !== 'same' || currentConfig);
      const rollbackAvailable = Boolean(existing?.graph_object_id && currentConfig && definition.rollback_strategy !== 'not_supported');

      // Save a verified pre-change snapshot for rollback when we will modify an existing object.
      let rollbackUri = '';
      let rollbackSha = '';
      if (rollbackAvailable) {
        const snapshotDoc = { captured: now, graph_object_id: existing.graph_object_id, configuration: currentConfig };
        const bytes = new TextEncoder().encode(JSON.stringify(snapshotDoc, null, 2));
        rollbackSha = await sha256HexOfText(JSON.stringify(snapshotDoc, null, 2));
        const uploaded = await sr.integrations.Core.UploadPrivateFile({
          file: new File([bytes], `rollback_${definition.definition_key}_${Date.now()}.json`, { type: 'application/json' }),
        });
        if (!uploaded?.file_uri) throw new HttpError(502, 'Rollback snapshot storage failed.');
        rollbackUri = uploaded.file_uri;
      }

      const status = nameConflict ? 'Conflict Detected' : (missingPermissions.length ? 'Precheck Required' : 'Ready for Approval');
      const record: any = {
        organization_id: org.id, project_id: project.id, tenant_id: connection.tenant_id,
        policy_definition_id: definition.id, definition_key: definition.definition_key,
        definition_version: definition.definition_version, definition_sha256: definition.definition_sha256 || '',
        microsoft_service: definition.microsoft_service, graph_resource_type: definition.graph_resource_type || '',
        graph_endpoint: definition.graph_endpoint, deployed_display_name: displayName,
        primary_control_id: definition.primary_control_id,
        related_control_ids: definition.related_control_ids || [],
        related_objective_ids: definition.related_objective_ids || [],
        status, deployment_mode: deploymentMode,
        assignment_summary: definition.assignment_strategy || '', exclusion_summary: definition.exclusion_strategy || '',
        proposed_configuration: desired, current_configuration: currentConfig || {},
        diff_summary: diff, desired_sha256: desiredSha,
        precheck_date: now, precheck_by: caller.email || '',
        original_deployment_date: namingDate,
        rollback_snapshot_uri: rollbackUri, rollback_snapshot_sha256: rollbackSha,
        rollback_available: rollbackAvailable,
        error_details: nameConflict
          ? `An existing Microsoft policy named "${displayName}" was not created by Kipuka. Resolve the conflict before deploying.`
          : (missingPermissions.length ? `Missing Graph application permissions: ${missingPermissions.join(', ')}` : ''),
      };
      const deployment = existing
        ? await sr.entities.MicrosoftPolicyDeployment.update(existing.id, record)
        : await sr.entities.MicrosoftPolicyDeployment.create(record);

      await writeAudit(sr, {
        organizationId: org.id, caller, actionType: 'Microsoft Deployment Precheck',
        targetEntity: 'MicrosoftPolicyDeployment', targetRecordId: deployment.id,
        summary: `Precheck for ${definition.definition_key}@${definition.definition_version} → ${status}. Tenant ${connection.tenant_primary_domain || connection.tenant_id}.`,
      });

      return Response.json({
        deployment, diff,
        permissions: { granted: roles, missing: missingPermissions },
        existing_policies: existingPolicies.slice(0, 50),
        managed_object_missing: managedObjectMissing,
        name_conflict: Boolean(nameConflict),
        tenant: { id: connection.tenant_id, domain: connection.tenant_primary_domain || '' },
      });
    }

    // Remaining actions operate on a saved deployment record.
    const deployment = await loadDeployment(sr, project, body.deployment_id);
    const definitionRecord = await sr.entities.MicrosoftPolicyDefinition.get(deployment.policy_definition_id).catch(() => null);

    // ---------------- STAGES 4-6: APPROVE → DEPLOY → READ BACK & VERIFY ----------------
    if (action === 'deploy') {
      if (deployment.status !== 'Ready for Approval') {
        return Response.json({ error: `Deployment is "${deployment.status}". Run a fresh precheck and review the diff first.` }, { status: 409 });
      }
      // Explicit approval: the caller must confirm the exact configuration hash
      // shown on the diff screen. Opening the page or running precheck is not approval.
      if (body.approve !== true || String(body.approved_desired_sha256 || '') !== deployment.desired_sha256) {
        return Response.json({ error: 'Explicit approval of the exact proposed configuration is required (approve + approved_desired_sha256).' }, { status: 400 });
      }
      const { connection, accessToken } = await requireConnectedTenant(sr, org);
      if (connection.tenant_id !== deployment.tenant_id) {
        return Response.json({ error: 'The connected tenant no longer matches the tenant this deployment was prechecked against.' }, { status: 409 });
      }

      await sr.entities.MicrosoftPolicyDeployment.update(deployment.id, {
        status: 'Deploying', approved_by: caller.email || '', approved_date: now, deployed_by: caller.email || '',
      });
      await writeAudit(sr, {
        organizationId: org.id, caller, actionType: 'Microsoft Deployment Approved',
        targetEntity: 'MicrosoftPolicyDeployment', targetRecordId: deployment.id,
        summary: `Approved and started deployment of "${deployment.deployed_display_name}" (desired SHA ${deployment.desired_sha256.slice(0, 12)}…).`,
      });

      // BEFORE evidence snapshot (tenant state captured at precheck).
      let beforeEvidence: any = null;
      try {
        beforeEvidence = await createGraphSnapshotEvidence(sr, {
          org, project, caller, orgRole,
          title: `BEFORE — ${deployment.deployed_display_name}`, label: 'Before',
          controlIds: [deployment.primary_control_id, ...(deployment.related_control_ids || [])],
          objectiveIds: deployment.related_objective_ids || [],
          payload: {
            provenance: snapshotProvenance({ org, project, connection, deployment, caller, definitionRecord, verification: 'pre-deployment snapshot' }),
            configuration: deployment.current_configuration || null,
          },
          tenantDomain: connection.tenant_primary_domain, transitionId: `msgraph_${deployment.id}_before_${Date.now()}`,
        });
      } catch (e) {
        console.warn('Before-evidence creation failed:', e.message);
      }

      // The Graph change: PATCH the stored object ID when it exists, POST otherwise.
      const isUpdate = Boolean(deployment.graph_object_id);
      const path = isUpdate ? `${deployment.graph_endpoint}/${deployment.graph_object_id}` : deployment.graph_endpoint;
      const writeRes = await graphFetch(accessToken, isUpdate ? 'PATCH' : 'POST', path, deployment.proposed_configuration);
      if (!writeRes.ok) {
        const failed = await sr.entities.MicrosoftPolicyDeployment.update(deployment.id, {
          status: 'Failed', error_details: `Graph ${isUpdate ? 'PATCH' : 'POST'} failed (${writeRes.status}): ${writeRes.data?.error?.message || ''}`.slice(0, 2000),
          last_updated_date: now,
        });
        await writeAudit(sr, {
          organizationId: org.id, caller, actionType: 'Microsoft Deployment Failed',
          targetEntity: 'MicrosoftPolicyDeployment', targetRecordId: deployment.id,
          summary: `Graph write failed (${writeRes.status}) for "${deployment.deployed_display_name}".`,
        });
        return Response.json({ deployment: failed, error: failed.error_details }, { status: 502 });
      }
      const graphObjectId = isUpdate ? deployment.graph_object_id : writeRes.data?.id;
      if (!graphObjectId) {
        const failed = await sr.entities.MicrosoftPolicyDeployment.update(deployment.id, {
          status: 'Failed', error_details: 'Graph accepted the request but returned no object ID.', last_updated_date: now,
        });
        return Response.json({ deployment: failed, error: failed.error_details }, { status: 502 });
      }

      // STAGE 6: a successful POST/PATCH is NOT sufficient — read the object back.
      await sr.entities.MicrosoftPolicyDeployment.update(deployment.id, { status: 'Deployed Pending Verification', graph_object_id: graphObjectId });
      const readBack = await graphFetch(accessToken, 'GET', `${deployment.graph_endpoint}/${graphObjectId}${definitionRecord?.graph_read_suffix || ''}`);
      if (!readBack.ok) {
        const failed = await sr.entities.MicrosoftPolicyDeployment.update(deployment.id, {
          status: 'Verification Failed', error_details: `Read-back failed (${readBack.status}).`, last_updated_date: now,
        });
        await writeAudit(sr, {
          organizationId: org.id, caller, actionType: 'Microsoft Deployment Verification Failed',
          targetEntity: 'MicrosoftPolicyDeployment', targetRecordId: deployment.id,
          summary: `Read-back after deploying "${deployment.deployed_display_name}" failed — NOT marked verified.`,
        });
        return Response.json({ deployment: failed, error: failed.error_details }, { status: 502 });
      }
      const actual = stripVolatile(readBack.data);
      const desiredForVerify = verifiableDesired(deployment.proposed_configuration, definitionRecord);
      const { verified, failures } = verifyAgainstDesired(desiredForVerify, actual, definitionRecord?.validation_rules || []);
      const actualSha = await configSha(projectOntoDesired(desiredForVerify, actual));

      // AFTER evidence with the configuration Microsoft actually returned.
      let afterEvidence: any = null;
      try {
        afterEvidence = await createGraphSnapshotEvidence(sr, {
          org, project, caller, orgRole,
          title: `AFTER — ${deployment.deployed_display_name}`, label: 'After',
          controlIds: [deployment.primary_control_id, ...(deployment.related_control_ids || [])],
          objectiveIds: deployment.related_objective_ids || [],
          payload: {
            provenance: snapshotProvenance({
              org, project, connection, caller, definitionRecord, actualSha,
              deployment: { ...deployment, graph_object_id: graphObjectId, approved_by: caller.email },
              verification: verified ? 'VERIFIED — read-back matches desired configuration' : `VERIFICATION FAILED: ${failures.join(' | ')}`,
            }),
            requested_settings: deployment.proposed_configuration,
            returned_configuration: actual,
          },
          tenantDomain: connection.tenant_primary_domain, transitionId: `msgraph_${deployment.id}_after_${Date.now()}`,
        });
      } catch (e) {
        console.warn('After-evidence creation failed:', e.message);
      }

      const finalStatus = verified ? 'Verified' : 'Verification Failed';
      const updated = await sr.entities.MicrosoftPolicyDeployment.update(deployment.id, {
        status: finalStatus, graph_object_id: graphObjectId, actual_sha256: actualSha,
        verified_date: verified ? now : '', last_updated_date: now,
        drift_status: verified ? 'In Sync' : 'Drift Detected', last_drift_check: now,
        before_evidence_id: beforeEvidence?.id || deployment.before_evidence_id || '',
        after_evidence_id: afterEvidence?.id || '',
        error_details: verified ? '' : failures.join(' | ').slice(0, 2000),
      });
      await writeAudit(sr, {
        organizationId: org.id, caller, actionType: verified ? 'Microsoft Deployment Verified' : 'Microsoft Deployment Verification Failed',
        targetEntity: 'MicrosoftPolicyDeployment', targetRecordId: deployment.id,
        summary: `"${deployment.deployed_display_name}" ${isUpdate ? 'updated (PATCH to stored object ID)' : 'created'} → ${finalStatus}. Object ${graphObjectId}.`,
      });
      return Response.json({ deployment: updated, verified, failures, before_evidence_id: beforeEvidence?.id || '', after_evidence_id: afterEvidence?.id || '' });
    }

    // ---------------- DRIFT CHECK ----------------
    if (action === 'check_drift') {
      if (!deployment.graph_object_id) return Response.json({ error: 'This deployment has no Graph object to check.' }, { status: 409 });
      const { accessToken } = await requireConnectedTenant(sr, org);
      const read = await graphFetch(accessToken, 'GET', `${deployment.graph_endpoint}/${deployment.graph_object_id}${definitionRecord?.graph_read_suffix || ''}`);
      let driftStatus = 'Drift Detected';
      let note = '';
      if (read.ok) {
        const desiredForVerify = verifiableDesired(deployment.proposed_configuration, definitionRecord);
        const projection = projectOntoDesired(desiredForVerify, stripVolatile(read.data));
        driftStatus = deepEqual(projection, desiredForVerify) ? 'In Sync' : 'Drift Detected';
      } else if (read.status === 404) {
        note = 'The Microsoft object no longer exists — it was removed outside Kipuka.';
      } else {
        throw new HttpError(502, `Drift check read failed (${read.status}).`);
      }
      const updated = await sr.entities.MicrosoftPolicyDeployment.update(deployment.id, {
        drift_status: driftStatus, last_drift_check: now, ...(note ? { error_details: note } : {}),
      });
      return Response.json({ deployment: updated, drift_status: driftStatus, note });
    }

    // ---------------- ROLLBACK (explicit approval required) ----------------
    if (action === 'rollback') {
      if (!deployment.rollback_available || !deployment.rollback_snapshot_uri || !deployment.rollback_snapshot_sha256) {
        return Response.json({ error: 'No verified rollback snapshot exists for this deployment.' }, { status: 409 });
      }
      if (body.approve !== true || String(body.rollback_snapshot_sha256 || '') !== deployment.rollback_snapshot_sha256) {
        return Response.json({ error: 'Explicit rollback approval with the snapshot hash is required.' }, { status: 400 });
      }
      const { connection, accessToken } = await requireConnectedTenant(sr, org);
      if (connection.tenant_id !== deployment.tenant_id) {
        return Response.json({ error: 'The connected tenant no longer matches this deployment\'s tenant.' }, { status: 409 });
      }
      const signed = await sr.integrations.Core.CreateFileSignedUrl({ file_uri: deployment.rollback_snapshot_uri });
      const snapshotText = await (await fetch(signed.signed_url)).text();
      if ((await sha256HexOfText(snapshotText)) !== deployment.rollback_snapshot_sha256) {
        return Response.json({ error: 'Rollback snapshot failed hash verification — rollback aborted.' }, { status: 409 });
      }
      const snapshot = JSON.parse(snapshotText);
      const targetId = deployment.graph_object_id || snapshot.graph_object_id;
      if (!targetId) return Response.json({ error: 'No stored Graph object ID to roll back.' }, { status: 409 });

      // Restore ONLY the keys Kipuka manages, onto the stored object ID.
      const restoreConfig = projectOntoDesired(deployment.proposed_configuration, snapshot.configuration);
      const writeRes = await graphFetch(accessToken, 'PATCH', `${deployment.graph_endpoint}/${targetId}`, restoreConfig);
      if (!writeRes.ok) {
        await writeAudit(sr, {
          organizationId: org.id, caller, actionType: 'Microsoft Deployment Rollback Failed',
          targetEntity: 'MicrosoftPolicyDeployment', targetRecordId: deployment.id,
          summary: `Rollback PATCH failed (${writeRes.status}) for "${deployment.deployed_display_name}".`,
        });
        return Response.json({ error: `Rollback failed (${writeRes.status}): ${writeRes.data?.error?.message || ''}` }, { status: 502 });
      }
      const readBack = await graphFetch(accessToken, 'GET', `${deployment.graph_endpoint}/${targetId}`);
      const actual = readBack.ok ? stripVolatile(readBack.data) : null;
      const restored = actual && deepEqual(projectOntoDesired(restoreConfig, actual), restoreConfig);

      let rollbackEvidence: any = null;
      try {
        rollbackEvidence = await createGraphSnapshotEvidence(sr, {
          org, project, caller, orgRole,
          title: `ROLLBACK — ${deployment.deployed_display_name}`, label: 'Rollback',
          controlIds: [deployment.primary_control_id, ...(deployment.related_control_ids || [])],
          objectiveIds: deployment.related_objective_ids || [],
          payload: {
            provenance: snapshotProvenance({
              org, project, connection, caller, definitionRecord, deployment,
              verification: restored ? 'ROLLBACK VERIFIED — configuration restored' : 'ROLLBACK READ-BACK MISMATCH',
            }),
            restored_configuration: restoreConfig, returned_configuration: actual,
          },
          tenantDomain: connection.tenant_primary_domain, transitionId: `msgraph_${deployment.id}_rollback_${Date.now()}`,
        });
      } catch (e) {
        console.warn('Rollback evidence creation failed:', e.message);
      }

      const updated = await sr.entities.MicrosoftPolicyDeployment.update(deployment.id, {
        status: restored ? 'Rolled Back' : 'Verification Failed',
        rolled_back_by: caller.email || '', rolled_back_date: now, last_updated_date: now,
        rollback_available: false, drift_status: 'Unknown',
        error_details: restored ? '' : 'Rollback PATCH succeeded but the read-back did not match the snapshot.',
      });
      await writeAudit(sr, {
        organizationId: org.id, caller, actionType: restored ? 'Microsoft Deployment Rolled Back' : 'Microsoft Deployment Rollback Verification Failed',
        targetEntity: 'MicrosoftPolicyDeployment', targetRecordId: deployment.id,
        summary: `Rollback of "${deployment.deployed_display_name}" ${restored ? 'restored and verified' : 'did NOT verify'} against object ${targetId}.`,
      });
      return Response.json({ deployment: updated, restored, evidence_id: rollbackEvidence?.id || '' });
    }

    return Response.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return Response.json({ error: error.message }, { status });
  }
}