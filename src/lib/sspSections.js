// SSP section definitions + auto-build logic from project data.
export const SSP_SECTIONS = [
  { key: 'system_name', label: 'System Name', short: true },
  { key: 'system_description', label: 'System Description' },
  { key: 'system_purpose', label: 'System Purpose' },
  { key: 'authorization_boundary', label: 'Authorization Boundary' },
  { key: 'environment_description', label: 'Environment Description' },
  { key: 'cui_description', label: 'CUI Description' },
  { key: 'fci_description', label: 'FCI Description' },
  { key: 'user_population', label: 'User Population' },
  { key: 'asset_summary', label: 'Asset Summary' },
  { key: 'network_summary', label: 'Network Summary' },
  { key: 'cloud_services_summary', label: 'Cloud Services Summary' },
  { key: 'external_service_provider_summary', label: 'External Service Providers' },
  { key: 'roles_and_responsibilities', label: 'Roles & Responsibilities' },
  { key: 'inherited_controls_summary', label: 'Inherited Controls' },
  { key: 'shared_responsibility_summary', label: 'Shared Responsibility' },
  { key: 'control_implementation_summary', label: 'Control Implementation Summary' },
  { key: 'linked_poam_summary', label: 'Linked POA&M Summary' },
];

const isEmpty = (v) => !v || !String(v).replace(/<[^>]+>/g, '').trim();

export function sectionCompletion(ssp) {
  const done = SSP_SECTIONS.filter((s) => !isEmpty(ssp?.[s.key])).length;
  return { done, total: SSP_SECTIONS.length, pct: Math.round((done / SSP_SECTIONS.length) * 100) };
}

// Draft an SSP from project + scoping + assets + assessments + evidence + poams.
export function buildSspDraft({ project, org, scoping, assets, assessments, evidence, poams }) {
  const inScope = assets.filter((a) => a.in_scope);
  const cloud = assets.filter((a) => a.asset_type === 'Cloud Service' || a.asset_type === 'SaaS Application');
  const esp = assets.filter((a) => a.asset_type === 'External Provider');
  const implemented = assessments.filter((a) => a.status === 'Implemented').length;
  const openPoams = poams.filter((p) => !['Closed', 'Accepted Risk'].includes(p.status));

  return {
    ssp_title: `System Security Plan — ${project.project_name}`,
    system_name: project.project_name,
    system_description: `<p>The system supports ${org?.organization_name || 'the organization'}'s ${project.target_cmmc_level} compliance objectives under the ${project.assessment_path} path.</p>`,
    system_purpose: `<p>This system processes, stores, and/or transmits ${scoping?.handles_cui ? 'Controlled Unclassified Information (CUI)' : 'Federal Contract Information (FCI)'} in support of DoD contract performance.</p>`,
    authorization_boundary: scoping?.boundary_summary || '<p><em>Define the authorization boundary in the Scoping module.</em></p>',
    environment_description: `<p>Environment type: ${scoping?.environment_type || 'Unknown'}.</p>${scoping?.included_systems_summary || ''}`,
    cui_description: scoping?.cui_description || (scoping?.handles_cui ? '' : '<p>CUI is not in scope for this system.</p>'),
    fci_description: scoping?.fci_description || '',
    user_population: `<p>${inScope.filter((a) => a.asset_type === 'User').length} in-scope users identified in the asset inventory.</p>`,
    asset_summary: `<p>${inScope.length} in-scope assets across ${new Set(inScope.map((a) => a.asset_type)).size} categories.</p>`,
    network_summary: scoping?.data_flow_summary || '',
    cloud_services_summary: scoping?.cloud_services_summary || (cloud.length ? `<p>${cloud.map((c) => c.asset_name).join(', ')}</p>` : ''),
    external_service_provider_summary: scoping?.external_service_providers || (esp.length ? `<p>${esp.map((c) => c.asset_name).join(', ')}</p>` : ''),
    roles_and_responsibilities: `<p>Project Owner: ${project.project_owner_name || '—'}. Affirming Official: ${project.affirming_official_name || '—'}.</p>`,
    inherited_controls_summary: '',
    shared_responsibility_summary: '',
    control_implementation_summary: `<p>${implemented} of ${assessments.length} in-scope controls are implemented.</p>`,
    linked_poam_summary: `<p>${openPoams.length} open POA&M item(s) tracked for this system.</p>`,
    revision_history: `<p>v1.0 — Initial draft generated ${new Date().toLocaleDateString()}.</p>`,
  };
}