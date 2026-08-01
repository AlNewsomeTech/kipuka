import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// PHASE 4B COMPLETION — PROJECT DOCUMENT CONFIGURATION
// Creates or updates the single active project override. Organization identity
// is resolved from the authorized Project; organization_id is never accepted.

const FIELDS = [
  'logo_url', 'classification', 'filename_short_name', 'policy_owner_name',
  'approving_authority_name', 'reporting_channel', 'document_repository',
  'evidence_repository', 'retention_schedule', 'review_cycle_days',
  'approval_workflow', 'default_responsible_team', 'timezone', 'notes',
];
const ROLES = ['Organization Owner', 'Organization Admin', 'Compliance Manager', 'Pac-Sec Admin', 'Pac-Sec Support'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const unknown = Object.keys(body).filter((k) => k !== 'project_id' && !FIELDS.includes(k));
    if (unknown.length) return Response.json({ error: `Unexpected fields: ${unknown.join(', ')}` }, { status: 400 });
    if (!body.project_id) return Response.json({ error: 'project_id is required.' }, { status: 400 });

    const sr = base44.asServiceRole;
    const isAdmin = caller.role === 'admin';
    let callerOrg: string | null = null;
    if (!isAdmin) {
      callerOrg = caller.organization_id;
      if (!callerOrg) return Response.json({ error: 'No organization is linked to your account.' }, { status: 403 });
      const memberships = await sr.entities.OrganizationUser.filter({ user_email: caller.email, organization_id: callerOrg }).catch(() => []);
      const active = memberships.filter((m: any) => m.status === 'Active');
      if (active.length !== 1 || (caller.role !== 'technician' && !ROLES.includes(active[0].role))) {
        return Response.json({ error: 'Your active organization role may not manage document settings.' }, { status: 403 });
      }
    }

    const project = await sr.entities.Project.get(body.project_id).catch(() => null);
    if (!project || (!isAdmin && project.organization_id !== callerOrg)) return Response.json({ error: 'Project not found' }, { status: 404 });
    const existing = await sr.entities.DocumentConfiguration.filter({
      organization_id: project.organization_id, project_id: project.id, active: true,
    }).catch(() => []);
    if (existing.length > 1) return Response.json({ error: 'Duplicate active project document configurations detected.' }, { status: 409 });

    const data: any = {};
    for (const field of FIELDS) if (Object.prototype.hasOwnProperty.call(body, field)) data[field] = body[field];
    if (!['Public', 'Internal', 'Confidential'].includes(data.classification || 'Internal')) {
      return Response.json({ error: 'classification must be Public, Internal, or Confidential.' }, { status: 400 });
    }
    data.review_cycle_days = Math.max(1, Math.min(3650, Number(data.review_cycle_days || 365)));
    data.filename_short_name = String(data.filename_short_name || '').replace(/[^A-Za-z0-9-]+/g, '').slice(0, 60);
    data.timezone = String(data.timezone || 'America/Chicago').slice(0, 80);
    data.organization_id = project.organization_id;
    data.project_id = project.id;
    data.active = true;

    const record = existing.length
      ? await sr.entities.DocumentConfiguration.update(existing[0].id, data)
      : await sr.entities.DocumentConfiguration.create(data);
    return Response.json({ configuration: record });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
