// Per-organization Microsoft tenant connection management for the OPTIONAL
// Graph Control Deployment capability.
//
// Isolation model: every organization supplies its OWN Entra app registration
// (tenant ID + client ID + client secret) from its OWN tenant. Credentials are
// stored in the service-only MicrosoftTenantCredential entity — no browser
// session can read them — and access tokens are acquired on demand and never
// persisted. Organization A's authorization can never be reached from
// Organization B: every action resolves the organization from canonical
// server-side records and loads only that organization's credential.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  HttpError, CONNECT_ROLES, resolveGraphAccess, getActiveConnection, getActiveCredential,
  getTenantToken, verifyTenantMatch, writeAudit,
} from '../../shared/microsoftGraph.ts';

const ACTIONS = ['status', 'connect', 'test', 'disconnect'];
const ALLOWED_KEYS = ['action', 'organization_id', 'project_id', 'tenant_id', 'client_id', 'client_secret'];

function publicConnection(connection: any) {
  if (!connection) return null;
  return {
    id: connection.id,
    organization_id: connection.organization_id,
    tenant_id: connection.tenant_id,
    tenant_display_name: connection.tenant_display_name || '',
    tenant_primary_domain: connection.tenant_primary_domain || '',
    auth_method: connection.auth_method || 'client_credentials',
    client_id: connection.client_id || '',
    connection_status: connection.connection_status,
    connection_health: connection.connection_health,
    connection_verified_date: connection.connection_verified_date || '',
    connected_by: connection.connected_by || '',
    granted_scopes: connection.granted_scopes || [],
    last_successful_call: connection.last_successful_call || '',
    error_details: connection.error_details || '',
  };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const unknown = Object.keys(body).filter((k) => !ALLOWED_KEYS.includes(k));
    if (unknown.length) return Response.json({ error: `Unexpected fields: ${unknown.join(', ')}` }, { status: 400 });
    const action = String(body.action || '');
    if (!ACTIONS.includes(action)) return Response.json({ error: 'Unsupported action.' }, { status: 400 });

    // `status` never fails on the flag so the UI can render the locked state;
    // it returns metadata only and performs no Graph call.
    const access = await resolveGraphAccess(base44, {
      projectId: body.project_id ? String(body.project_id) : undefined,
      organizationId: body.organization_id ? String(body.organization_id) : undefined,
      requireFlag: action !== 'status',
      allowedRoles: action === 'status' ? null : CONNECT_ROLES,
    });
    const { caller, sr, org, orgRole } = access;
    const enabled = org.microsoft_graph_deployment_enabled === true;

    if (action === 'status') {
      const connection = enabled ? await getActiveConnection(sr, org.id) : null;
      return Response.json({
        enabled,
        connection: publicConnection(connection),
        can_manage: CONNECT_ROLES.includes(orgRole),
      });
    }

    if (action === 'connect') {
      const tenantId = String(body.tenant_id || '').trim().toLowerCase();
      const clientId = String(body.client_id || '').trim();
      const clientSecret = String(body.client_secret || '');
      if (!/^[0-9a-f-]{36}$/.test(tenantId)) return Response.json({ error: 'A valid Microsoft tenant (directory) ID is required.' }, { status: 400 });
      if (!/^[0-9a-f-]{36}$/i.test(clientId)) return Response.json({ error: 'A valid application (client) ID is required.' }, { status: 400 });
      if (clientSecret.length < 10) return Response.json({ error: 'A client secret is required.' }, { status: 400 });

      // Prove the credential works and that it belongs to the claimed tenant
      // BEFORE storing anything.
      const { accessToken, roles } = await getTenantToken({ tenant_id: tenantId, client_id: clientId, client_secret: clientSecret });
      const tenant = await verifyTenantMatch(accessToken, tenantId);
      const primaryDomain = (tenant.verifiedDomains || []).find((d: any) => d.isDefault)?.name
        || (tenant.verifiedDomains || [])[0]?.name || '';

      // Replace, never accumulate, credentials for this organization.
      const oldCreds = await sr.entities.MicrosoftTenantCredential.filter({ organization_id: org.id, active: true }).catch(() => []);
      for (const cred of oldCreds) {
        await sr.entities.MicrosoftTenantCredential.update(cred.id, { active: false, deactivated_date: new Date().toISOString() });
      }
      const credential = await sr.entities.MicrosoftTenantCredential.create({
        organization_id: org.id, tenant_id: tenantId, client_id: clientId,
        client_secret: clientSecret, active: true, created_by_email: caller.email || '',
      });

      const now = new Date().toISOString();
      const connectionData = {
        organization_id: org.id, tenant_id: tenantId,
        tenant_display_name: tenant.displayName || '', tenant_primary_domain: primaryDomain,
        auth_method: 'client_credentials', client_id: clientId, credential_id: credential.id,
        connection_status: 'Connected', connection_health: 'Healthy',
        connection_verified_date: now, connected_by: caller.email || '',
        granted_scopes: roles, last_successful_call: now, error_details: '',
      };
      const existing = await sr.entities.MicrosoftTenantConnection.filter({ organization_id: org.id }).catch(() => []);
      const connection = existing[0]
        ? await sr.entities.MicrosoftTenantConnection.update(existing[0].id, connectionData)
        : await sr.entities.MicrosoftTenantConnection.create(connectionData);

      await writeAudit(sr, {
        organizationId: org.id, caller, actionType: 'Microsoft Tenant Connected',
        targetEntity: 'MicrosoftTenantConnection', targetRecordId: connection.id,
        summary: `Connected Microsoft tenant ${primaryDomain || tenantId} (${tenant.displayName || 'unnamed'}) with ${roles.length} granted application permissions.`,
      });
      return Response.json({ connection: publicConnection(connection), granted_scopes: roles });
    }

    const connection = await getActiveConnection(sr, org.id);
    if (!connection) return Response.json({ error: 'No Microsoft tenant connection exists for this organization.' }, { status: 404 });

    if (action === 'test') {
      const credential = await getActiveCredential(sr, org.id);
      if (!credential) return Response.json({ error: 'No active Microsoft credential is stored.' }, { status: 404 });
      const now = new Date().toISOString();
      try {
        const { accessToken, roles } = await getTenantToken(credential);
        await verifyTenantMatch(accessToken, connection.tenant_id);
        const updated = await sr.entities.MicrosoftTenantConnection.update(connection.id, {
          connection_status: 'Connected', connection_health: 'Healthy',
          granted_scopes: roles, last_successful_call: now, connection_verified_date: now, error_details: '',
        });
        await writeAudit(sr, {
          organizationId: org.id, caller, actionType: 'Microsoft Tenant Connection Tested',
          targetEntity: 'MicrosoftTenantConnection', targetRecordId: connection.id,
          summary: 'Connection test succeeded.',
        });
        return Response.json({ connection: publicConnection(updated) });
      } catch (e) {
        const updated = await sr.entities.MicrosoftTenantConnection.update(connection.id, {
          connection_status: 'Error', connection_health: 'Failed', error_details: String(e.message || e).slice(0, 2000),
        });
        await writeAudit(sr, {
          organizationId: org.id, caller, actionType: 'Microsoft Tenant Connection Tested',
          targetEntity: 'MicrosoftTenantConnection', targetRecordId: connection.id,
          summary: `Connection test FAILED: ${String(e.message || e).slice(0, 300)}`,
        });
        return Response.json({ connection: publicConnection(updated), error: e.message }, { status: 502 });
      }
    }

    if (action === 'disconnect') {
      const creds = await sr.entities.MicrosoftTenantCredential.filter({ organization_id: org.id, active: true }).catch(() => []);
      for (const cred of creds) {
        await sr.entities.MicrosoftTenantCredential.update(cred.id, { active: false, deactivated_date: new Date().toISOString() });
      }
      const updated = await sr.entities.MicrosoftTenantConnection.update(connection.id, {
        connection_status: 'Disconnected', connection_health: 'Unknown', credential_id: '', error_details: '',
      });
      await writeAudit(sr, {
        organizationId: org.id, caller, actionType: 'Microsoft Tenant Disconnected',
        targetEntity: 'MicrosoftTenantConnection', targetRecordId: connection.id,
        summary: `Disconnected Microsoft tenant ${connection.tenant_primary_domain || connection.tenant_id}. Stored credential deactivated.`,
      });
      return Response.json({ connection: publicConnection(updated) });
    }

    return Response.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    return Response.json({ error: error.message }, { status });
  }
}