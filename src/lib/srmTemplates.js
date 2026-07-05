// Shared Responsibility Matrix (SRM) prefill templates. Applying a template
// seeds a ServiceProvider's per-control responsibility rows, which the user
// then edits. Responsibility values: Customer | Provider | Shared | Not Applicable.

export const SRM_TEMPLATES = [
  'Microsoft 365 GCC High',
  'Microsoft 365 GCC',
  'Microsoft 365 Commercial',
  'Google Workspace',
  'Generic MSP',
];

// Family-level default responsibility guidance per template. Rather than
// enumerate all 110 controls, we default by NIST family and let the user
// refine per control. Keys are two-letter family codes.
const FAMILY_DEFAULTS = {
  'Microsoft 365 GCC High': {
    provider: ['SC', 'MA', 'PE'],
    shared: ['AC', 'IA', 'AU', 'CM', 'MP', 'SI', 'RA', 'CA'],
    note: 'Microsoft 365 GCC High is designed for ITAR/CUI workloads and provides FedRAMP High / DoD IL4-IL5 infrastructure. Physical, environmental, and underlying platform controls are inherited from Microsoft; identity, access, configuration, and data-handling controls are the customer\'s responsibility within the tenant.',
  },
  'Microsoft 365 GCC': {
    provider: ['SC', 'MA', 'PE'],
    shared: ['AC', 'IA', 'AU', 'CM', 'MP', 'SI', 'RA', 'CA'],
    note: 'Microsoft 365 GCC provides FedRAMP Moderate infrastructure. Note: GCC (not GCC High) may not meet all requirements for certain CUI/ITAR data — verify data type suitability. Platform and physical controls inherited from Microsoft; tenant configuration is the customer\'s responsibility.',
  },
  'Microsoft 365 Commercial': {
    provider: ['MA', 'PE'],
    shared: ['SC', 'AC', 'IA', 'AU', 'CM', 'MP', 'SI', 'RA', 'CA'],
    note: 'Microsoft 365 Commercial provides commercial cloud infrastructure. It is generally NOT sufficient on its own for CUI — confirm your CUI data type permits commercial cloud. Physical/maintenance of datacenters inherited; most security controls are shared or customer-owned.',
  },
  'Google Workspace': {
    provider: ['MA', 'PE'],
    shared: ['SC', 'AC', 'IA', 'AU', 'CM', 'MP', 'SI', 'RA', 'CA'],
    note: 'Google Workspace provides cloud infrastructure with FedRAMP authorization for certain tiers. Confirm the specific Workspace tier and its authorization level for your CUI. Datacenter physical/maintenance inherited; identity and configuration are customer-owned.',
  },
  'Generic MSP': {
    provider: ['MA'],
    shared: ['AC', 'IA', 'AU', 'CM', 'SI', 'RA', 'CA', 'IR'],
    note: 'A Managed Service Provider typically operates and monitors portions of the environment on the customer\'s behalf. Responsibility is heavily shared and MUST be governed by a documented customer responsibility matrix and contract/SLA. The MSP itself is an External Service Provider whose CMMC posture should be assessed.',
  },
};

function familyOf(controlId = '') {
  const m = String(controlId).match(/^([A-Z]{2})/);
  return m ? m[1] : '';
}

// Build responsibility rows for a template, given the set of controls in scope.
// controls = [{ control_id, control_title }]
export function buildSrmResponsibilities(templateName, controls) {
  const def = FAMILY_DEFAULTS[templateName];
  if (!def) return [];
  return controls.map((c) => {
    const fam = familyOf(c.control_id);
    let responsibility = 'Customer';
    if (def.provider.includes(fam)) responsibility = 'Provider';
    else if (def.shared.includes(fam)) responsibility = 'Shared';
    return {
      control_id: c.control_id,
      control_title: c.control_title || '',
      responsibility,
      inheritance_notes: responsibility === 'Provider'
        ? `Inherited from ${templateName}.`
        : responsibility === 'Shared'
          ? `Shared with ${templateName} — customer configures within the tenant/service.`
          : 'Customer-implemented.',
    };
  });
}

export function templateNote(templateName) {
  return FAMILY_DEFAULTS[templateName]?.note || '';
}

export const RESPONSIBILITY_OPTIONS = ['Customer', 'Provider', 'Shared', 'Not Applicable'];