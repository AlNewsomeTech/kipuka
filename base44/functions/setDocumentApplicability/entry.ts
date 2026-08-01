import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// PHASE 4E — PROJECT DOCUMENT APPLICABILITY DECISIONS
// Creates versioned, reviewable decisions. No template is silently omitted.
// Out-of-Scope approval requires a substantive justification, project evidence,
// reviewer identity, and a reassessment trigger.

const ALLOWED_KEYS = ['project_id', 'template_key', 'template_version', 'decision', 'justification', 'supporting_evidence_ids', 'reassessment_trigger', 'reassessment_date', 'mode'];
const DECISIONS = ['Required', 'Recommended', 'Conditional', 'Out of Scope', 'Needs Scoping Decision'];
const DECISION_ROLES = ['Organization Owner', 'Organization Admin', 'Compliance Manager', 'IT Admin', 'Pac-Sec Admin', 'Pac-Sec Support'];
const APPROVE_ROLES = ['Organization Owner', 'Organization Admin', 'Compliance Manager', 'Pac-Sec Admin'];

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function stableStringify(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const unknown = Object.keys(body).filter((k) => !ALLOWED_KEYS.includes(k));
    if (unknown.length) return Response.json({ error: `Unexpected fields: ${unknown.join(', ')}` }, { status: 400 });

    const projectId = body.project_id;
    const templateKey = String(body.template_key || '').trim();
    const decision = body.decision;
    const mode = body.mode === 'approve' ? 'approve' : 'draft';
    const justification = String(body.justification || '').trim();
    const trigger = String(body.reassessment_trigger || '').trim();
    const evidenceIds = [...new Set((Array.isArray(body.supporting_evidence_ids) ? body.supporting_evidence_ids : []).map(String).filter(Boolean))];
    if (!projectId || !templateKey || !DECISIONS.includes(decision)) {
      return Response.json({ error: 'project_id, template_key, and a supported decision are required.' }, { status: 400 });
    }

    const sr = base44.asServiceRole;
    const isAdmin = caller.role === 'admin';
    let callerOrg: string | null = null;
    let orgRole: string | null = null;
    if (!isAdmin) {
      callerOrg = caller.organization_id;
      if (!callerOrg) return Response.json({ error: 'No organization is linked to your account.' }, { status: 403 });
      const memberships = await sr.entities.OrganizationUser.filter({ user_email: caller.email, organization_id: callerOrg }).catch(() => []);
      const active = memberships.filter((m: any) => m.status === 'Active');
      if (active.length !== 1) return Response.json({ error: 'Your organization membership is missing, inactive, or ambiguous.' }, { status: 403 });
      orgRole = active[0].role;
      const allowed = mode === 'approve' ? APPROVE_ROLES : DECISION_ROLES;
      if (!allowed.includes(orgRole || '')) {
        return Response.json({ error: 'Your active organization role is not authorized for this applicability action.' }, { status: 403 });
      }
    }

    const project = await sr.entities.Project.get(projectId).catch(() => null);
    if (!project || (!isAdmin && project.organization_id !== callerOrg)) return Response.json({ error: 'Project not found' }, { status: 404 });
    if (!project.organization_id) return Response.json({ error: 'Project is not linked to an organization.' }, { status: 409 });

    const templateQuery: any = { template_key: templateKey, active: true };
    if (body.template_version) templateQuery.template_version = body.template_version;
    const templates = await sr.entities.DocumentTemplate.filter(templateQuery).catch(() => []);
    if (templates.length !== 1) return Response.json({ error: 'Canonical template selection is missing or ambiguous.' }, { status: 409 });
    const template = templates[0];
    if (!template.cmmc_levels?.includes(project.target_cmmc_level)) {
      return Response.json({ error: `Template does not apply to ${project.target_cmmc_level} projects.` }, { status: 409 });
    }

    const [scopings, allEvidence, existing] = await Promise.all([
      sr.entities.ScopingProfile.filter({ project_id: projectId }).catch(() => []),
      sr.entities.ProjectEvidence.filter({ project_id: projectId }, null, 500).catch(() => []),
      sr.entities.DocumentApplicabilityDecision.filter({ project_id: projectId, template_key: templateKey }).catch(() => []),
    ]);
    if (scopings.length > 1) return Response.json({ error: 'Multiple scoping profiles exist for this project.' }, { status: 409 });
    const scoping = scopings[0] || null;
    const evidenceById = new Map(allEvidence.map((e: any) => [e.id, e]));
    const missingEvidence = evidenceIds.filter((id: string) => !evidenceById.has(id));
    if (missingEvidence.length) return Response.json({ error: 'One or more supporting evidence records do not belong to this project.' }, { status: 409 });

    if (mode === 'approve') {
      if (decision === 'Needs Scoping Decision') return Response.json({ error: 'A Needs Scoping Decision record cannot be approved.' }, { status: 409 });
      if (justification.length < 20) return Response.json({ error: 'Approved decisions require a substantive justification of at least 20 characters.' }, { status: 400 });
      if (decision === 'Out of Scope') {
        if (justification.length < 40 || evidenceIds.length < 1 || trigger.length < 20) {
          return Response.json({
            error: 'Out-of-Scope approval requires at least 40 characters of justification, one project evidence record, and a reassessment trigger of at least 20 characters.',
          }, { status: 400 });
        }
        const evidenceNotAccepted = evidenceIds.map((id: string) => evidenceById.get(id)).filter((e: any) => e.review_status !== 'Accepted' || !/^[a-f0-9]{64}$/i.test(e.hash_value || ''));
        if (evidenceNotAccepted.length) {
          return Response.json({ error: 'Out-of-Scope approval requires accepted, SHA-256-hashed supporting evidence.' }, { status: 409 });
        }
      }
      if (decision === 'Conditional' && trigger.length < 20) {
        return Response.json({ error: 'Approved Conditional decisions require a reassessment trigger.' }, { status: 400 });
      }
    }

    const activeExisting = existing.filter((d: any) => d.status !== 'Superseded').sort((a: any, b: any) => (b.decision_version || 0) - (a.decision_version || 0));
    const nextVersion = (activeExisting[0]?.decision_version || 0) + 1;
    const now = new Date().toISOString();
    const actor = caller.full_name || caller.email || 'System';
    const scopeFacts = {
      scope_profile_id: scoping?.id || '',
      scope_status: scoping?.scope_status || 'Missing',
      environment_type: scoping?.environment_type || 'Unknown',
      handles_fci: scoping?.handles_fci === true,
      handles_cui: scoping?.handles_cui === true,
      included_locations: scoping?.included_locations || [],
      excluded_locations: scoping?.excluded_locations || [],
      boundary_summary_present: Boolean(scoping?.boundary_summary),
      supporting_evidence: evidenceIds.map((id: string) => {
        const e: any = evidenceById.get(id);
        return { id: e.id, title: e.evidence_title, hash_value: e.hash_value || '', review_status: e.review_status };
      }),
    };
    const payload = {
      organization_id: project.organization_id, project_id: projectId,
      template_key: template.template_key, template_version: template.template_version,
      decision, status: mode === 'approve' ? 'Approved' : 'Draft',
      justification, supporting_evidence_ids: evidenceIds, scope_facts: scopeFacts,
      reassessment_trigger: trigger, reassessment_date: body.reassessment_date || '',
      reviewer_name: mode === 'approve' ? actor : '', reviewer_email: mode === 'approve' ? (caller.email || '') : '',
      approved_by: mode === 'approve' ? actor : '', approved_date: mode === 'approve' ? now : '',
      decision_version: nextVersion, supersedes_decision_id: activeExisting[0]?.id || '',
      created_by_name: actor, created_by_email: caller.email || '',
    };
    const decisionSha = await sha256Hex(new TextEncoder().encode(stableStringify(payload)));
    const created = await sr.entities.DocumentApplicabilityDecision.create({ ...payload, decision_sha256: decisionSha });

    for (const prior of activeExisting) {
      await sr.entities.DocumentApplicabilityDecision.update(prior.id, {
        status: 'Superseded', superseded_by_decision_id: created.id,
      }).catch(() => {});
    }
    return Response.json({ decision: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
