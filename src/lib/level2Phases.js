// Groups the 93 CMMC Level 2 controls into Technical and Physical security domains,
// then into phases within each domain. Phases map directly to CMMC control families.

export const LEVEL2_DOMAINS = [
  {
    key: 'technical',
    label: 'Technical Security',
    description: 'Identity, access, system, and data protection controls implemented in software and configuration.',
    phases: [
      'Access Control',
      'Identification and Authentication',
      'Audit and Accountability',
      'Configuration Management',
      'System and Communications Protection',
      'System and Information Integrity',
      'Incident Response',
      'Risk Assessment',
      'Security Assessment',
      'Awareness and Training',
    ],
  },
  {
    key: 'physical',
    label: 'Physical Security',
    description: 'Facility, media, equipment maintenance, and personnel controls enforced in the physical environment.',
    phases: [
      'Physical Protection',
      'Media Protection',
      'Maintenance',
      'Personnel Security',
    ],
  },
];

// Returns the domain key ('technical' | 'physical' | 'technical' fallback) for a control family.
export function domainForFamily(family) {
  for (const domain of LEVEL2_DOMAINS) {
    if (domain.phases.includes(family)) return domain.key;
  }
  return 'technical';
}