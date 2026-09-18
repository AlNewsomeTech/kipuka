// Security Tooling configuration: tool catalog, statuses, and helpers.
// All tools support status tracking, ownership details, and control mappings.
// Step-by-step runbooks currently exist for NinjaOne and Cortex XDR only.

export const TOOL_STATUSES = ['Not Used', 'Planned', 'Enabled', 'In Review', 'Disabled'];

// A tool is "active" (shows runbook + appears on controls) when Enabled/Planned/In Review.
export const ACTIVE_TOOL_STATUSES = ['Enabled', 'Planned', 'In Review'];

export function isToolActive(status) {
  return ACTIVE_TOOL_STATUSES.includes(status);
}

export function isToolImplemented(record) {
  return record?.implementation_status === 'Implemented';
}

export const SUPPORT_TYPES = [
  'Primary Evidence Source',
  'Supporting Evidence Source',
  'Implementation Aid',
  'Monitoring Aid',
  'Remediation Aid',
  'Not Applicable',
];

// Full tool catalog shown in Tool Selection.
export const TOOL_CATALOG = [
  { name: 'NinjaOne', built: true, runbook: 'ninjaone', description: 'RMM — endpoint inventory, patching, vulnerability visibility, remote management, and remediation tracking.' },
  { name: 'Palo Alto Cortex XDR', built: true, runbook: 'cortex', description: 'Endpoint protection — malware/exploit prevention, alerting, incident investigation, and response.' },
  { name: 'PreVeil', built: true, runbook: 'preveil', description: 'CUI enclave — end-to-end encrypted email & file sharing overlaying your existing M365/Google environment. FedRAMP Moderate equivalent, FIPS 140-2 validated, DFARS 7012 (c)-(g) support. The low-cost alternative to a GCC High migration.' },
  { name: 'Microsoft Defender', built: true, runbook: 'defender', description: 'Endpoint & cloud protection.' },
  { name: 'Microsoft Intune', built: true, runbook: 'intune', description: 'Device management & configuration.' },
  { name: 'Microsoft Entra ID', built: true, runbook: null, description: 'Identity & access management.' },
  { name: 'Microsoft Purview', built: true, runbook: null, description: 'Data governance & compliance.' },
  { name: 'Other', built: true, runbook: null, description: 'Any other in-scope security tool.' },
];

export function toolByName(name) {
  return TOOL_CATALOG.find((t) => t.name === name) || null;
}

// Map runbook slug -> tool display name.
export const RUNBOOK_TO_TOOL = {
  ninjaone: 'NinjaOne',
  cortex: 'Palo Alto Cortex XDR',
  preveil: 'PreVeil',
  defender: 'Microsoft Defender',
  intune: 'Microsoft Intune',
};

// Shared disclaimer used across runbooks and tool references.
export const TOOL_SUPPORT_DISCLAIMER =
  'This tool may support evidence for selected controls. It does not satisfy the control by itself.';

export const REVIEW_DISCLAIMER =
  'All evidence must be reviewed and validated by authorized Pac-Sec or client personnel before it is accepted.';

export const TOOL_IMPLEMENTATION_SCOPE_TEXT = {
  NinjaOne: 'NinjaOne is implemented for inventory, patching, monitoring, remote support, and remediation tracking on in-scope endpoints; current console and device coverage evidence is still required.',
  'Palo Alto Cortex XDR': 'Palo Alto Cortex XDR is implemented for endpoint detection, prevention, alerting, investigation, and response on in-scope endpoints; current policy, coverage, and alert evidence is still required.',
  PreVeil: 'PreVeil is implemented as the encrypted CUI email and file enclave; current organization settings, authorized users and devices, encryption, access, and data-flow evidence is still required.',
  'Microsoft Defender': 'Microsoft Defender is implemented for endpoint protection, detection, vulnerability visibility, and security telemetry on in-scope endpoints; current policy, device coverage, update, and alert evidence is still required.',
  'Microsoft Intune': 'Microsoft Intune is implemented for enrollment, configuration, compliance, encryption, application, and device controls on in-scope endpoints; current assignments, settings, and device coverage evidence is still required.',
  'Microsoft Entra ID': 'Microsoft Entra ID is implemented for identity and access management supporting in-scope users and administrators; current role, authentication, access-policy, and assignment evidence is still required.',
  'Microsoft Purview': 'Microsoft Purview is implemented for applicable data governance and compliance functions; current configuration, scope, and activity evidence is still required.',
  Other: 'The recorded security tool is implemented for its mapped controls; current configuration, scope, and operating evidence is still required.',
};

export function toolImplementationScopeText(toolName) {
  return TOOL_IMPLEMENTATION_SCOPE_TEXT[toolName] || TOOL_IMPLEMENTATION_SCOPE_TEXT.Other;
}

export function appendUniqueScopeText(current, addition) {
  const existing = String(current || '').trim();
  const next = String(addition || '').trim();
  if (!next || existing.includes(next)) return existing;
  return existing ? `${existing}\n\n${next}` : next;
}