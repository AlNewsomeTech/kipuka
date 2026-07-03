// Evidence quality checklist. Manual review only — no automated scoring.
export const EVIDENCE_QUALITY_ITEMS = [
  { key: 'readable', label: 'Evidence is readable.' },
  { key: 'dated', label: 'Evidence is dated or time-bound.' },
  { key: 'identifies_org', label: 'Evidence identifies the tenant, system, tool, or organization.' },
  { key: 'supports_control', label: 'Evidence supports the mapped control.' },
  { key: 'no_sensitive', label: 'Evidence does not expose unnecessary sensitive information.' },
  { key: 'current', label: 'Evidence is current enough for review.' },
  { key: 'has_owner', label: 'Evidence has an owner.' },
];

export const EVIDENCE_TYPES = [
  'Screenshot', 'Policy', 'Procedure', 'Configuration Export', 'Report',
  'Ticket', 'Interview Note', 'Diagram', 'Log', 'Attestation', 'Other',
];

export const EVIDENCE_REVIEW_STATUSES = ['Draft', 'Needs Review', 'Accepted', 'Rejected', 'Expired'];

// True when an item is past its expiration date (stale).
export function isExpired(item) {
  if (!item?.expiration_date) return false;
  return new Date(item.expiration_date) < new Date();
}