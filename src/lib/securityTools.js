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