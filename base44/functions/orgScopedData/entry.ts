import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ORG READ GATEKEEPER — the single READ path for client-role users.
//
// Entity RLS is creator+staff locked, so an invited client-role teammate who
// did not create the records cannot read them directly. This function reads
// org data on their behalf, after resolving their organization membership
// server-side from OrganizationUser (never trusting a client-supplied
// organization_id) and forcing organization_id on every query.
//
// Payload: { entity, operation: 'list'|'filter'|'get', query, sort, limit, id }
//
// WHITELIST of org-scoped entities readable through the gate.
const READ_WHITELIST = new Set([
  'ControlAssessment', 'Project', 'CompanyProfile', 'ProjectEvidence', 'Asset',
  'ScopingProfile', 'ProjectPOAM', 'SSPControlStatement', 'SystemSecurityPlan',
  'ProjectDiagram', 'ServiceProvider', 'IncidentResponsePlan', 'IncidentLog',
  'MockAssessmentSession', 'MockAssessmentObjective', 'ObjectiveEvidenceLink',
  'SPRSRecord', 'CMMCLevelDetermination', 'MaintenanceTask', 'ReportExport',
  'ToolControlMapping', 'ToolEvidenceChecklist', 'ProjectSecurityTool',
  'PolicyTemplate', 'GuidedProgress', 'RemediationComment', 'DeploymentTask',
  'SecurityReviewNote', 'AcolyteRemediationItem', 'AcolyteProfile',
  'CyberFinding', 'IncidentReadinessRecord', 'AcolyteExecutiveReport',
  'CyberReadinessReview',
  // Own-org records only (special-cased below):
  'Organization', 'OrganizationUser',
]);

// Tier-gated entities: readable only when the org's plan tier / trial unlocks
// the L2 workflow. Entry-tier orgs get a clean 403 instead of empty data.
const L2_GATED = new Set([
  'MockAssessmentSession', 'MockAssessmentObjective', 'ObjectiveEvidenceLink',
]);

const L2_PLAN_TIERS = new Set(['L2_Professional', 'L2_Premium', 'Enterprise']);

function trialActive(org: any) {
  if (!org?.trial_full_access) return false;
  if (!org?.trial_ends_date) return true;
  return new Date(org.trial_ends_date) >= new Date(new Date().toDateString());
}

function planUnlocksL2(org: any) {
  if (!org) return false;
  if (trialActive(org)) return true;
  return L2_PLAN_TIERS.has(org.plan_tier);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    // Accept both { operation } (spec) and legacy { op }.
    const entity = body.entity;
    const operation = body.operation || body.op;
    const { query, sort, limit, id } = body;

    if (!READ_WHITELIST.has(entity)) {
      return Response.json({ error: `Entity not permitted: ${entity}` }, { status: 403 });
    }
    if (!['list', 'filter', 'get'].includes(operation)) {
      return Response.json({ error: `Unsupported operation: ${operation}` }, { status: 400 });
    }

    // Resolve the caller's organization server-side from OrganizationUser.
    // App-level admins (platform owners) are not the target of this gate, but
    // if one calls it we still resolve via their membership.
    const memberships = await base44.asServiceRole.entities.OrganizationUser
      .filter({ user_email: caller.email })
      .catch(() => []);
    const active = memberships.filter((m: any) => m.status !== 'Removed');
    if (active.length === 0) {
      return Response.json({ error: 'No organization is linked to your account. Contact your administrator.' }, { status: 403 });
    }
    const org = active[0].organization_id;

    // Org gating: fully disabled or expired trial → clean 403.
    const orgRecord = await base44.asServiceRole.entities.Organization.get(org).catch(() => null);
    if (orgRecord?.fully_disabled === true) {
      return Response.json({ error: 'Your organization\'s access has been disabled. Contact Pac-Sec support.' }, { status: 403 });
    }
    const endDate = orgRecord?.subscription_end_date;
    const expired = !!endDate && new Date(endDate) < new Date(new Date().toDateString());
    if (expired) {
      return Response.json({ error: 'Your organization\'s subscription has ended. Contact Pac-Sec support to restore access.' }, { status: 403 });
    }
    if (L2_GATED.has(entity) && !planUnlocksL2(orgRecord)) {
      return Response.json({ error: 'This feature requires a Level 2 plan tier. Contact your administrator.' }, { status: 403 });
    }

    const svc = base44.asServiceRole.entities[entity];

    // Organization / OrganizationUser: own-org only.
    if (entity === 'Organization') {
      if (operation === 'get') {
        if (id !== org) return Response.json({ error: 'Not found' }, { status: 404 });
        const record = await svc.get(org).catch(() => null);
        return record ? Response.json({ record }) : Response.json({ error: 'Not found' }, { status: 404 });
      }
      const record = await svc.get(org).catch(() => null);
      return Response.json({ records: record ? [record] : [] });
    }

    if (operation === 'get') {
      if (!id) return Response.json({ error: 'id required' }, { status: 400 });
      const record = await svc.get(id).catch(() => null);
      if (!record || record.organization_id !== org) {
        return Response.json({ error: 'Not found' }, { status: 404 });
      }
      return Response.json({ record });
    }

    // list / filter — organization_id forced over any client-supplied filters.
    const scoped = { ...(query || {}), organization_id: org };
    const records = await svc.filter(scoped, sort || '-created_date', Math.min(limit || 500, 500));
    return Response.json({ records });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});