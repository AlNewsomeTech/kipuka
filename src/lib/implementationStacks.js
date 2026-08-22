// Implementation-stack variants for the guided DO step (item 2 & 4).
// Keys match ControlLibrary.how_to_implement variant keys.

export const STACK_VARIANTS = [
  { key: 'm365_commercial', label: 'Microsoft 365 Commercial' },
  { key: 'm365_gcc', label: 'Microsoft 365 GCC' },
  { key: 'm365_gcc_high', label: 'Microsoft 365 GCC High' },
  { key: 'google_workspace', label: 'Google Workspace' },
  { key: 'generic', label: 'Microsoft 365 Recommended Baseline' },
];

// Map a Project.implementation_stack enum value to a how_to_implement variant key.
export function stackKeyForProject(project) {
  const s = project?.implementation_stack || '';
  if (s === 'Microsoft 365 Commercial') return 'm365_commercial';
  if (s === 'Microsoft 365 GCC') return 'm365_gcc';
  if (s === 'Microsoft 365 GCC High') return 'm365_gcc_high';
  if (s === 'Google Workspace') return 'google_workspace';
  return 'generic';
}

// Resolve the best available variant for a library record, falling back to generic.
// Returns { variant, usedKey, requestedKey, fellBack }.
export function resolveVariant(libEntry, requestedKey) {
  const how = libEntry?.how_to_implement || {};
  if (requestedKey && how[requestedKey]) {
    return { variant: how[requestedKey], usedKey: requestedKey, requestedKey, fellBack: false };
  }
  if (how.generic) {
    return { variant: how.generic, usedKey: 'generic', requestedKey, fellBack: !!requestedKey && requestedKey !== 'generic' };
  }
  // Last resort — first available variant.
  const firstKey = Object.keys(how)[0];
  if (firstKey) return { variant: how[firstKey], usedKey: firstKey, requestedKey, fellBack: true };
  return { variant: null, usedKey: null, requestedKey, fellBack: true };
}

export function stackLabel(key) {
  return STACK_VARIANTS.find((v) => v.key === key)?.label || 'Microsoft 365 Recommended Baseline';
}