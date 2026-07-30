import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Server-side org-role enforcement for org-level Asset writes.
//
// Organization roles (e.g. "Auditor Viewer") live on OrganizationUser, not on the
// app-level User.role, so entity RLS cannot express them. This function is the
// authoritative write path for the org-level asset inventory: it verifies the
// caller's OrganizationUser role in the target org and rejects read-only roles
// (Auditor Viewer, Executive Viewer) before performing the write.
//
// Payload: { action: 'create'|'update'|'delete', organizationId, projectId, assetId?, data? }

const READ_ONLY_ORG_ROLES = new Set(['Auditor Viewer', 'Executive Viewer']);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { action, organizationId, projectId, assetId, data } = body;

    if (!action || !organizationId) {
      return Response.json({ error: 'action and organizationId are required' }, { status: 400 });
    }

    // Platform super-admins (app role admin) bypass org-role checks.
    const isPlatformAdmin = user.role === 'admin';

    if (!isPlatformAdmin) {
      // The requested organizationId is never trusted: it must equal the
      // caller's own organization, backed by an Active membership.
      if (!user.organization_id || user.organization_id !== organizationId) {
        return Response.json({ error: 'You are not a member of this organization.' }, { status: 403 });
      }
      const memberships = await base44.asServiceRole.entities.OrganizationUser
        .filter({ organization_id: organizationId, user_email: user.email })
        .catch(() => []);
      const active = memberships.filter((m: any) => m.status === 'Active');
      if (active.length !== 1) {
        return Response.json({ error: 'Your organization membership is missing or ambiguous.' }, { status: 403 });
      }
      const role = active[0].role;
      if (READ_ONLY_ORG_ROLES.has(role)) {
        return Response.json({ error: `Your role (${role}) has read-only access and cannot modify assets.` }, { status: 403 });
      }
    }

    const svc = base44.asServiceRole.entities.Asset;

    // Any referenced project must belong to the authorized organization.
    if (projectId) {
      const project = await base44.asServiceRole.entities.Project.get(projectId).catch(() => null);
      if (!project || project.organization_id !== organizationId) {
        return Response.json({ error: 'Project not found in this organization.' }, { status: 404 });
      }
    }

    // organization_id / project_id can never be moved by the client payload.
    const clean = { ...(data || {}) };
    delete clean.organization_id;
    delete clean.project_id;

    if (action === 'create') {
      if (!projectId) return Response.json({ error: 'projectId is required for create' }, { status: 400 });
      const created = await svc.create({ ...clean, organization_id: organizationId, project_id: projectId });
      return Response.json({ asset: created });
    }

    if (action === 'update') {
      if (!assetId) return Response.json({ error: 'assetId is required for update' }, { status: 400 });
      const existing = await svc.get(assetId).catch(() => null);
      if (!existing || existing.organization_id !== organizationId) {
        return Response.json({ error: 'Asset not found in this organization.' }, { status: 404 });
      }
      if (projectId && existing.project_id !== projectId) {
        return Response.json({ error: 'Asset not found in this project.' }, { status: 404 });
      }
      if (existing.project_id) {
        const storedProject = await base44.asServiceRole.entities.Project.get(existing.project_id).catch(() => null);
        if (!storedProject || storedProject.organization_id !== organizationId) {
          return Response.json({ error: 'Asset not found in this organization.' }, { status: 404 });
        }
      }
      const updated = await svc.update(assetId, clean);
      return Response.json({ asset: updated });
    }

    if (action === 'delete') {
      if (!assetId) return Response.json({ error: 'assetId is required for delete' }, { status: 400 });
      const existing = await svc.get(assetId).catch(() => null);
      if (!existing || existing.organization_id !== organizationId) {
        return Response.json({ error: 'Asset not found in this organization.' }, { status: 404 });
      }
      if (projectId && existing.project_id !== projectId) {
        return Response.json({ error: 'Asset not found in this project.' }, { status: 404 });
      }
      if (existing.project_id) {
        const storedProject = await base44.asServiceRole.entities.Project.get(existing.project_id).catch(() => null);
        if (!storedProject || storedProject.organization_id !== organizationId) {
          return Response.json({ error: 'Asset not found in this organization.' }, { status: 404 });
        }
      }
      await svc.delete(assetId);
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});