import { base44 } from '@/api/base44Client';

const blank = (value) => value == null || value === '';
export function missingValues(record, values) {
  return Object.fromEntries(Object.entries(values).filter(([key, value]) => blank(record?.[key]) && !blank(value)));
}

// Only copy known values within the same organization; never replace saved answers.
export async function saveProjectSetupData(project, client = null, details = {}, answers = {}) {
  const organizationId = project.organization_id;
  if (!organizationId || (client && client.organization_id !== organizationId)) throw new Error('Company and project organization must match.');
  const [org, profiles, scopes] = await Promise.all([
    base44.entities.Organization.get(organizationId),
    base44.entities.CompanyProfile.filter({ organization_id: organizationId }),
    base44.entities.ScopingProfile.filter({ project_id: project.id }),
  ]);
  if (profiles.length > 1 || scopes.length > 1) throw new Error('Multiple company or scope records need review before linking.');
  if (scopes[0] && scopes[0].organization_id !== organizationId) throw new Error('Scope organization does not match this project.');
  const company = {
    company_name: details.legal_name || client?.legal_name || org.legal_name || org.organization_name,
    cage_code: details.primary_cage_code || project.primary_cage_code || org.cage_codes?.[0],
    duns_uei: details.uei || project.uei || org.uei,
    employee_count: client?.initial_user_count,
    active_project_id: project.id,
    cmmc_track: ['Level 1', 'Level 2'].includes(project.target_cmmc_level) ? project.target_cmmc_level : 'Undetermined',
  };
  if (profiles[0]) {
    const patch = missingValues(profiles[0], company);
    if (Object.keys(patch).length) await base44.entities.CompanyProfile.update(profiles[0].id, patch);
  } else {
    await base44.entities.CompanyProfile.create({ organization_id: organizationId, ...missingValues({}, company) });
  }
  if (!scopes.length) {
    const scope = { organization_id: organizationId, project_id: project.id, scope_name: `${company.company_name} preliminary scope`, scope_status: 'Draft' };
    const fci = answers.handles_fci ?? client?.fci_in_scope;
    const cui = answers.handles_cui ?? client?.cui_in_scope;
    if (typeof fci === 'boolean') scope.handles_fci = fci;
    if (typeof cui === 'boolean') scope.handles_cui = cui;
    if (client?.physical_location_description) scope.included_locations = [client.physical_location_description];
    await base44.entities.ScopingProfile.create(scope);
  }
  const orgPatch = missingValues(org, { legal_name: company.company_name, uei: company.duns_uei, primary_contact_name: details.primary_poc || client?.poc_name, primary_contact_email: details.primary_poc_email || client?.poc_email });
  if (!org.cage_codes?.length && company.cage_code) orgPatch.cage_codes = [company.cage_code];
  if (Object.keys(orgPatch).length) await base44.entities.Organization.update(org.id, orgPatch);
  if (client) {
    const patch = missingValues(project, { project_owner_name: client.poc_name, project_owner_email: client.poc_email, start_date: client.start_date, target_completion_date: client.target_completion_date, primary_cage_code: company.cage_code, uei: company.duns_uei });
    if (Object.keys(patch).length) await base44.entities.Project.update(project.id, patch);
  }
}

export async function loadProjectSetupDefaults(org, selectedClient = null) {
  const [profiles, clients, projects] = await Promise.all([
    base44.entities.CompanyProfile.filter({ organization_id: org.id }),
    base44.entities.Client.filter({ organization_id: org.id }),
    base44.entities.Project.filter({ organization_id: org.id }, '-created_date', 500),
  ]);
  if (profiles.length > 1) throw new Error('Multiple company profiles need review.');
  const company = profiles[0];
  const client = selectedClient?.organization_id === org.id ? selectedClient : clients.length === 1 ? clients[0] : null;
  const active = projects.find(p => p.id === company?.active_project_id) || (projects.length === 1 ? projects[0] : null);
  const [scopes, determinations] = active ? await Promise.all([
    base44.entities.ScopingProfile.filter({ project_id: active.id, organization_id: org.id }),
    base44.entities.CMMCLevelDetermination.filter({ project_id: active.id, organization_id: org.id }, '-created_date', 1),
  ]) : [[], []];
  const savedAnswers = {};
  for (const key of ['handles_fci', 'handles_cui', 'has_far_52_204_21', 'has_dfars_252_204_7012', 'has_dfars_252_204_7020', 'contract_mentions_cmmc_l1', 'contract_mentions_cmmc_l2', 'expected_future_cui', 'performs_dod_work']) {
    const value = determinations[0]?.[key];
    if (typeof value === 'boolean') savedAnswers[key] = value;
  }
  for (const [key, clientKey] of [['handles_fci', 'fci_in_scope'], ['handles_cui', 'cui_in_scope']]) {
    const value = scopes.length === 1 ? scopes[0][key] : client?.[clientKey];
    if (typeof value === 'boolean') savedAnswers[key] = value;
  }
  return { client, profile: {
    legal_name: client?.legal_name || company?.company_name || org.legal_name || org.organization_name || '',
    uei: company?.duns_uei || org.uei || active?.uei || '',
    primary_cage_code: company?.cage_code || org.cage_codes?.[0] || active?.primary_cage_code || '',
    sam_status: org.sam_registration_status || '',
    primary_poc: client?.poc_name || org.primary_contact_name || active?.project_owner_name || '',
    primary_poc_email: client?.poc_email || org.primary_contact_email || active?.project_owner_email || '',
    affirming_official_name: active?.affirming_official_name || '',
    implementation_stack: company?.implementation_stack || active?.implementation_stack || 'Microsoft 365 Commercial',
    start_date: client?.start_date || '', target_completion_date: client?.target_completion_date || '',
    project_name: `${client?.legal_name || org.short_name || org.organization_name || 'CMMC'} Readiness`,
  }, answers: savedAnswers };
}