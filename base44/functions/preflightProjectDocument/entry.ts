import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// PHASE 4C — PROJECT DOCUMENT PREFLIGHT (deterministic, WRITE-FREE)
//
// Reports, for one Project + one canonical template: applicability, the exact
// resolved fields with provenance, missing required fields, missing approval
// fields, unresolved tags, source freshness, template/hash validity, warnings,
// blockers, and whether draft generation is allowed.
//
// This function performs NO create/update/delete of any kind.
//
// Authorization order (before any project data is used):
//   1. auth.me() — 401 when unauthenticated.
//   2. Platform admin passes; everyone else must hold an OrganizationUser
//      membership with status exactly 'Active' in the organization on their
//      own user record. Invited/Disabled/Removed/missing → 403.
//   3. The target Project must belong to that organization → otherwise 404.
// organization_id is never accepted from the request body.
//
// NOTE: the resolution core below is duplicated in generateProjectDocument
// (Deno functions cannot import local files) — keep the two in sync.

const ALLOWED_BODY_KEYS = ['project_id', 'template_key', 'template_version'];
const APPROVAL_FIELDS = ['approval.date', 'approval.record_id', 'doc.effective_date', 'doc.next_review_date'];
const GENERATE_ORG_ROLES = ['Organization Owner', 'Organization Admin', 'Pac-Sec Admin', 'Pac-Sec Support'];
const CMMC_EXPECTED: Record<string, number> = { 'Level 1': 15, 'Level 2': 110 };

function put(fields: Record<string, any>, tag: string, value: any, provenance: string) {
  const v = value == null ? '' : String(value).trim();
  fields[tag] = { value: v, provenance, resolved: v.length > 0 };
}

function normalizeRetentionPeriod(value: any): string {
  return String(value || '')
    .trim()
    .replace(/^retain(?:\s+approved)?\s+records\s+for\s+/i, '')
    .replace(/[.;:]\s*$/, '');
}

// Resolve every merge tag from canonical data only. Deterministic — no AI, no
// fabricated business/scope/implementation/owner/approval content.
function resolveFields({ template, project, organization, companyProfile, scoping, components, tools, config, plannedVersion }: any) {
  const fields: Record<string, any> = {};
  const orgName = organization?.legal_name || organization?.organization_name || companyProfile?.company_name || '';

  put(fields, 'org.legal_name', orgName, 'Organization.legal_name/organization_name');
  put(fields, 'org.short_name', config?.filename_short_name || organization?.short_name, 'DocumentConfiguration.filename_short_name/Organization.short_name');
  put(fields, 'org.logo', config?.logo_url && /^[a-f0-9]{64}$/i.test(config?.logo_sha256 || '') ? config.logo_url : '', 'DocumentConfiguration.logo_url + logo_sha256');

  put(fields, 'doc.template_key', template?.template_key, 'DocumentTemplate.template_key');
  put(fields, 'doc.document_id', template?.document_id, 'DocumentTemplate.document_id');
  put(fields, 'doc.title', template?.title, 'DocumentTemplate.title');
  put(fields, 'doc.version', plannedVersion, 'Engine draft version');
  put(fields, 'doc.classification', config?.classification, 'DocumentConfiguration.classification');
  put(fields, 'doc.owner_name', config?.policy_owner_name, 'DocumentConfiguration.policy_owner_name');
  put(fields, 'doc.approver_name', config?.approving_authority_name, 'DocumentConfiguration.approving_authority_name');
  const cycleDays = config?.review_cycle_days;
  put(fields, 'doc.review_cycle', cycleDays ? (cycleDays === 365 ? 'Annual' : `Every ${cycleDays} days`) : '', 'DocumentConfiguration.review_cycle_days');

  put(fields, 'scope.summary', scoping?.included_systems_summary || scoping?.boundary_summary, 'ScopingProfile.included_systems_summary/boundary_summary');
  put(fields, 'scope.boundary', scoping?.boundary_summary, 'ScopingProfile.boundary_summary');
  put(fields, 'scope.included_locations', (scoping?.included_locations || []).join('; '), 'ScopingProfile.included_locations');
  put(fields, 'scope.excluded_locations', (scoping?.excluded_locations || []).join('; '), 'ScopingProfile.excluded_locations');
  const componentNames = (components || []).map((c: any) => c.component_name || c.asset_name).filter(Boolean).slice(0, 30).join('; ');
  put(fields, 'scope.systems', componentNames || scoping?.included_systems_summary, 'SystemComponent/ScopingProfile');
  put(fields, 'scope.data_flow', scoping?.data_flow_summary, 'ScopingProfile.data_flow_summary');

  const enabledTools = (tools || []).filter((t: any) => t.tool_status === 'Enabled').map((t: any) => t.tool_name);
  const stack = project?.implementation_stack || '';
  put(fields, 'implementation.control_location', stack ? (enabledTools.length ? `${stack} (managed with ${enabledTools.join(', ')})` : stack) : '', 'Project.implementation_stack/ProjectSecurityTool');
  put(fields, 'implementation.responsible_team', config?.default_responsible_team, 'DocumentConfiguration.default_responsible_team');
  put(fields, 'implementation.reporting_channel', config?.reporting_channel, 'DocumentConfiguration.reporting_channel');
  put(fields, 'implementation.repository', config?.evidence_repository, 'DocumentConfiguration.evidence_repository');
  put(fields, 'implementation.procedure_location', config?.document_repository, 'DocumentConfiguration.document_repository');
  put(fields, 'implementation.retention_period', normalizeRetentionPeriod(config?.retention_schedule), 'DocumentConfiguration.retention_schedule');
  put(fields, 'implementation.review_trigger', cycleDays ? `Reviewed every ${cycleDays} days or upon significant change` : '', 'DocumentConfiguration.review_cycle_days');
  put(fields, 'implementation.defined_frequency', cycleDays ? (cycleDays === 365 ? 'least annually' : `least every ${cycleDays} days`) : '', 'DocumentConfiguration.review_cycle_days');

  const today = new Date().toISOString().slice(0, 10);
  put(fields, 'revision.date', today, 'Engine draft generation date');
  put(fields, 'revision.summary', `Draft ${plannedVersion} generated from canonical project data`, 'Engine');
  put(fields, 'revision.author', '', 'Set to the generating user at generation time');

  // Approval-controlled fields are never resolved by the engine.
  for (const tag of APPROVAL_FIELDS) put(fields, tag, '', 'Approval workflow (not implemented in 4C — never fabricated)');
  return fields;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const unknown = Object.keys(body).filter((k) => !ALLOWED_BODY_KEYS.includes(k));
    if (unknown.length) return Response.json({ error: `Unexpected fields: ${unknown.join(', ')}` }, { status: 400 });
    const { project_id: projectId, template_key: templateKey, template_version: templateVersion } = body;
    if (!projectId || !templateKey) return Response.json({ error: 'project_id and template_key are required' }, { status: 400 });

    const sr = base44.asServiceRole;
    // --- Membership gate BEFORE project data reads ---
    const isPlatformAdmin = caller.role === 'admin';
    let callerOrg: string | null = null;
    let orgRole: string | null = null;
    if (!isPlatformAdmin) {
      callerOrg = caller.organization_id;
      if (!callerOrg) return Response.json({ error: 'No organization is linked to your account.' }, { status: 403 });
      const memberships = await sr.entities.OrganizationUser.filter({ user_email: caller.email, organization_id: callerOrg }).catch(() => []);
      const active = memberships.filter((m: any) => m.status === 'Active');
      if (active.length !== 1) return Response.json({ error: 'Your organization membership is missing, inactive, or ambiguous.' }, { status: 403 });
      orgRole = active[0].role;
    }

    const project = await sr.entities.Project.get(projectId).catch(() => null);
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });
    if (!isPlatformAdmin && project.organization_id !== callerOrg) return Response.json({ error: 'Project not found' }, { status: 404 });
    const org = project.organization_id;

    // --- Template record (imported catalog is the authority) ---
    const templateQuery: any = { template_key: templateKey, active: true };
    if (templateVersion) templateQuery.template_version = templateVersion;
    const templates = await sr.entities.DocumentTemplate.filter(templateQuery).catch(() => []);
    const blockers: string[] = [];
    const warnings: string[] = [];
    if (templates.length === 0) blockers.push('Template is not imported into the canonical library. Run importPolicyTemplateLibrary first.');
    if (templates.length > 1) blockers.push('Template selection is ambiguous — multiple active versions match.');
    const template = templates.length === 1 ? templates[0] : null;
    const templateValid = Boolean(template?.file_uri && template?.normalized_sha256);
    if (template && !templateValid) blockers.push('Template record is missing its verified asset (file_uri/normalized_sha256).');

    // --- Canonical source loads (allowlist only) ---
    const [organization, companyProfiles, scopings, components, tools, toolMappings, assessments, evidence, poams, objectiveLinks, configs, existingDocs, snapshots] = await Promise.all([
      sr.entities.Organization.get(org).catch(() => null),
      sr.entities.CompanyProfile.filter({ organization_id: org }).catch(() => []),
      sr.entities.ScopingProfile.filter({ project_id: projectId }).catch(() => []),
      sr.entities.SystemComponent.filter({ project_id: projectId }).catch(() => []),
      sr.entities.ProjectSecurityTool.filter({ project_id: projectId }).catch(() => []),
      sr.entities.ToolControlMapping.list(null, 500).catch(() => []),
      sr.entities.ControlAssessment.filter({ project_id: projectId }, null, 500).catch(() => []),
      sr.entities.ProjectEvidence.filter({ project_id: projectId }, null, 500).catch(() => []),
      sr.entities.ProjectPOAM.filter({ project_id: projectId }, null, 500).catch(() => []),
      sr.entities.ObjectiveEvidenceLink.filter({ project_id: projectId }, null, 500).catch(() => []),
      sr.entities.DocumentConfiguration.filter({ organization_id: org, active: true }).catch(() => []),
      sr.entities.ProjectDocument.filter({ project_id: projectId, template_key: templateKey }).catch(() => []),
      sr.entities.DocumentSourceSnapshot.filter({ project_id: projectId, template_key: templateKey }, '-generated_date', 5).catch(() => []),
    ]);
    if (project.organization_id !== org || (scopings[0] && scopings[0].organization_id && scopings[0].organization_id !== org)) {
      blockers.push('Inconsistent project/organization/scope linkage.');
    }

    // --- Configuration resolution (server-enforced, never trusted from the frontend) ---
    const defaults = configs.filter((c: any) => !c.project_id);
    const overrides = configs.filter((c: any) => c.project_id === projectId);
    if (defaults.length > 1) blockers.push('Multiple active organization-default document configurations exist — deactivate extras.');
    if (overrides.length > 1) blockers.push('Multiple active project-override document configurations exist — deactivate extras.');
    if (defaults.length === 0 && overrides.length === 0) warnings.push('No active document configuration — owner, approver, classification, channels, repositories, and retention will be unresolved.');
    const config = overrides.length === 1 ? overrides[0] : (defaults.length === 1 ? defaults[0] : null);

    // --- Canonical assessment integrity gate (15 for L1 / 110 for L2, unique control IDs) ---
    const targetLevel = project.target_cmmc_level;
    const expected = CMMC_EXPECTED[targetLevel];
    const controlIds = assessments.map((a: any) => String(a.control_id || '').trim()).filter(Boolean);
    const uniqueControls = new Set(controlIds);
    const integrityOk = Boolean(expected) && assessments.length === expected && uniqueControls.size === expected;
    if (!expected) blockers.push(`Project target level "${targetLevel || 'Unknown'}" is not an authoritative CMMC level.`);
    else if (!integrityOk) blockers.push(`Canonical assessment integrity failed: expected ${expected} unique assessment rows, found ${assessments.length} rows / ${uniqueControls.size} unique controls.`);

    // --- Applicability ---
    const applicable = Boolean(template && expected && template.cmmc_levels?.includes(targetLevel));
    if (template && expected && !applicable) warnings.push(`Template targets ${template.cmmc_levels?.join('/') || 'unknown levels'}; project is ${targetLevel}.`);

    // --- Field resolution ---
    const activeDocs = existingDocs.filter((d: any) => !['Superseded', 'Archived'].includes(d.status));
    const plannedVersion = `0.${existingDocs.length + 1}`;
    const fields = resolveFields({
      template, project, organization, companyProfile: companyProfiles[0] || null,
      scoping: scopings[0] || null, components, tools, config, plannedVersion,
    });
    const requiredSource = template?.required_source_fields || [];
    const missingFields = requiredSource.filter((tag: string) => !fields[tag]?.resolved);
    const unresolvedTags = Object.keys(fields).filter((tag) => !fields[tag].resolved && !APPROVAL_FIELDS.includes(tag));
    const missingApprovalFields = APPROVAL_FIELDS; // approval workflow is not implemented in 4C

    // --- Source freshness ---
    const sourceDates = [project, organization, companyProfiles[0], scopings[0], ...components, ...tools, ...assessments, ...evidence, ...poams, ...objectiveLinks, config]
      .filter(Boolean).map((r: any) => r.updated_date).filter(Boolean).sort();
    const latestSourceUpdate = sourceDates[sourceDates.length - 1] || null;
    const latestSnapshot = snapshots[0] || null;
    const stale = Boolean(latestSnapshot && latestSourceUpdate && latestSnapshot.generated_date < latestSourceUpdate);

    const draftAllowed = blockers.length === 0 && applicable && templateValid && integrityOk;
    const canGenerate = isPlatformAdmin || caller.role === 'technician' || GENERATE_ORG_ROLES.includes(orgRole || '');

    return Response.json({
      project_id: projectId,
      organization_id: org,
      target_level: targetLevel,
      applicable,
      template: template ? {
        template_key: template.template_key, template_version: template.template_version,
        title: template.title, document_type: template.document_type,
        document_id: template.document_id, primary_control_id: template.primary_control_id,
        control_ids: template.control_ids, normalized_sha256: template.normalized_sha256,
        valid: templateValid,
      } : null,
      configuration: {
        status: config ? (overrides.length === 1 ? 'Project override active' : 'Organization default active') : 'Missing',
        duplicate: defaults.length > 1 || overrides.length > 1,
        config_id: config?.id || null,
      },
      resolved_fields: fields,
      missing_fields: missingFields,
      missing_approval_fields: missingApprovalFields,
      unresolved_tags: unresolvedTags,
      assessment_integrity: { expected: expected || null, rows: assessments.length, unique_controls: uniqueControls.size, ok: integrityOk },
      source_freshness: { latest_source_update: latestSourceUpdate, latest_snapshot_date: latestSnapshot?.generated_date || null, stale },
      source_counts: {
        ControlAssessment: assessments.length, ProjectEvidence: evidence.length, ProjectPOAM: poams.length,
        SystemComponent: components.length, ProjectSecurityTool: tools.length, ToolControlMapping: toolMappings.length,
        ObjectiveEvidenceLink: objectiveLinks.length, ScopingProfile: scopings.length,
      },
      existing_documents: activeDocs.map((d: any) => ({
        id: d.id, status: d.status, document_version: d.document_version, file_name: d.file_name,
        generated_date: d.generated_date, output_sha256: d.output_sha256,
      })),
      planned_draft_version: plannedVersion,
      warnings,
      blockers,
      draft_generation_allowed: draftAllowed,
      caller_may_generate: canGenerate,
      approval_note: 'Approval/Published transitions are blocked: approval fields are missing and the approval workflow is not part of Phase 4C.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});