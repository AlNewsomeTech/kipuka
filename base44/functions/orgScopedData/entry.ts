import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ORG GATEKEEPER — the single data path for client-role users.
// RLS templating of custom user fields is NOT enforced by the platform
// (proven by the tenancy probe), so client entity access is denied at the
// RLS layer and mediated here instead. Every read is filtered to the
// caller's organization_id (read server-side from their User record) and
// every write is verified against the target record's organization_id.
//
// Whitelist: entity -> which operations client-role users may perform.
// Reads: filter/get. Writes: create/update only where the client UI
// legitimately writes (guided walkthrough, evidence upload, comments).
const ENTITY_RULES = {
  Project:                { read: true,  create: false, update: true  }, // checklist/status/readiness updates from guided flow
  CompanyProfile:         { read: true,  create: true,  update: true  }, // onboarding wizard
  ControlAssessment:      { read: true,  create: true,  update: true  }, // guided walkthrough status updates + control generation
  ProjectEvidence:        { read: true,  create: true,  update: true  }, // evidence upload
  GuidedProgress:         { read: true,  create: true,  update: true  }, // per-user walkthrough progress
  RemediationComment:     { read: true,  create: true,  update: false }, // client comments on remediation items
  ScopingProfile:         { read: true,  create: true,  update: true  }, // onboarding scoping answers
  Asset:                  { read: true,  create: false, update: false },
  ProjectPOAM:            { read: true,  create: true,  update: false }, // "I'm stuck" flow creates a POA&M
  Organization:           { read: true,  create: false, update: false }, // own-org record only (scoped by record id)
  OrganizationUser:       { read: true,  create: false, update: false }, // own-org membership/role lookup
  ReportExport:           { read: true,  create: false, update: false },
  MockAssessmentSession:  { read: true,  create: false, update: false },
  MockAssessmentObjective:{ read: true,  create: false, update: false },
  PolicyTemplate:         { read: true,  create: false, update: false },
  SPRSRecord:             { read: true,  create: false, update: false },
  SystemSecurityPlan:     { read: true,  create: false, update: false },
  DeploymentTask:         { read: true,  create: false, update: false },
  SecurityReviewNote:     { read: true,  create: false, update: false },
  AcolyteRemediationItem: { read: true,  create: false, update: false },
  AcolyteProfile:         { read: true,  create: false, update: false },
  CyberFinding:           { read: true,  create: false, update: false },
  IncidentReadinessRecord:{ read: true,  create: false, update: false },
  AcolyteExecutiveReport: { read: true,  create: false, update: false },
  CyberReadinessReview:   { read: true,  create: false, update: false },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // organization_id is read server-side from the authenticated user record —
    // the client cannot supply or spoof it.
    const org = caller.organization_id;
    if (!org) {
      return Response.json({ error: 'No organization bound to this account. Contact your administrator.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { entity, op, query, sort, limit, id, data } = body;

    const rules = ENTITY_RULES[entity];
    if (!rules) return Response.json({ error: `Entity not permitted: ${entity}` }, { status: 403 });

    const svc = base44.asServiceRole.entities[entity];

    // Organization has no organization_id field — its own id IS the org id.
    const isOrgRecord = entity === 'Organization';

    if (op === 'filter' || op === 'list') {
      if (!rules.read) return Response.json({ error: 'Read not permitted' }, { status: 403 });
      if (isOrgRecord) {
        const record = await svc.get(org).catch(() => null);
        return Response.json({ records: record ? [record] : [] });
      }
      // organization_id is forced — a caller-supplied organization_id in query is overwritten.
      const scoped = { ...(query || {}), organization_id: org };
      const records = await svc.filter(scoped, sort || '-created_date', Math.min(limit || 500, 500));
      return Response.json({ records });
    }

    if (op === 'get') {
      if (!rules.read) return Response.json({ error: 'Read not permitted' }, { status: 403 });
      if (!id) return Response.json({ error: 'id required' }, { status: 400 });
      if (isOrgRecord) {
        if (id !== org) return Response.json({ error: 'Not found' }, { status: 404 });
        const record = await svc.get(org).catch(() => null);
        if (!record) return Response.json({ error: 'Not found' }, { status: 404 });
        return Response.json({ record });
      }
      const record = await svc.get(id);
      if (!record || record.organization_id !== org) {
        return Response.json({ error: 'Not found' }, { status: 404 });
      }
      return Response.json({ record });
    }

    if (op === 'create') {
      if (!rules.create) return Response.json({ error: 'Create not permitted' }, { status: 403 });
      const payload = { ...(data || {}), organization_id: org };
      const record = await svc.create(payload);
      return Response.json({ record });
    }

    if (op === 'bulkCreate') {
      if (!rules.create) return Response.json({ error: 'Create not permitted' }, { status: 403 });
      if (!Array.isArray(data) || data.length === 0) {
        return Response.json({ error: 'data must be a non-empty array' }, { status: 400 });
      }
      const items = data.map((d) => ({ ...(d || {}), organization_id: org }));
      const records = await svc.bulkCreate(items);
      return Response.json({ records });
    }

    if (op === 'update') {
      if (!rules.update) return Response.json({ error: 'Update not permitted' }, { status: 403 });
      if (!id) return Response.json({ error: 'id required' }, { status: 400 });
      const existing = await svc.get(id);
      if (!existing || existing.organization_id !== org) {
        return Response.json({ error: 'Not found' }, { status: 404 });
      }
      // organization_id can never be changed through this path.
      const patch = { ...(data || {}) };
      delete patch.organization_id;
      const record = await svc.update(id, patch);
      return Response.json({ record });
    }

    return Response.json({ error: `Unsupported op: ${op}` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});