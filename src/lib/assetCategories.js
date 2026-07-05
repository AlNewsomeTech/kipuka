// Shared option lists for the org-level asset inventory. These map onto the
// existing Asset entity enums (no new entity / no schema change).

// Friendly asset types shown in the picker. Each maps to an existing
// Asset.asset_type enum value (no schema change).
export const ASSET_TYPE_OPTIONS = [
  { value: 'Endpoint', label: 'Laptop / Desktop' },
  { value: 'Server', label: 'Server' },
  { value: 'Cloud Service', label: 'Cloud Service' },
  { value: 'Endpoint', label: 'Mobile Device', key: 'mobile' },
  { value: 'Network Device', label: 'Network Equipment' },
  { value: 'External Provider', label: 'ESP / External Service Provider' },
  { value: 'SaaS Application', label: 'SaaS Application' },
  { value: 'Security Tool', label: 'Security Tool' },
  { value: 'Data Repository', label: 'Data Repository' },
  { value: 'Facility', label: 'Facility' },
  { value: 'Other', label: 'Other' },
];

// The five CMMC scope categories (plus Unknown) from the Asset entity enum.
export const SCOPE_CATEGORIES = [
  { value: 'CUI Asset', label: 'CUI Asset', color: '#dc2626',
    help: 'Processes, stores, or transmits CUI. In scope — full control set applies.' },
  { value: 'Security Protection Asset', label: 'Security Protection Asset', color: '#2563eb',
    help: 'Provides security functions to the CUI environment (e.g. firewall, SIEM, MFA).' },
  { value: 'Contractor Risk Managed Asset', label: 'Contractor Risk Managed Asset', color: '#d97706',
    help: 'Can access CUI assets but is not intended to — managed via policy and risk-based controls.' },
  { value: 'Specialized Asset', label: 'Specialized Asset', color: '#7c3aed',
    help: 'IoT, OT, GFE, restricted/test equipment — documented but assessed differently.' },
  { value: 'Out of Scope', label: 'Out-of-Scope Asset', color: '#64748b',
    help: 'No connection to CUI and physically/logically separated — outside the assessment boundary.' },
  { value: 'Unknown', label: 'Uncategorized', color: '#94a3b8',
    help: 'Not yet categorized. Categorize to finalize your assessment scope.' },
];

export const ASSET_STATUSES = ['Active', 'Planned', 'Retired', 'Unknown'];

export function scopeCategoryMeta(value) {
  return SCOPE_CATEGORIES.find((c) => c.value === value) || SCOPE_CATEGORIES.find((c) => c.value === 'Unknown');
}