// Scoping Wizard questions. Each answer is stored in ScopingProfile.wizard_answers
// keyed by `key`. Pure data.
export const SCOPING_QUESTIONS = [
  { key: 'fci_location', label: 'Where is FCI stored?', hint: 'Identify the systems, cloud services, or locations where Federal Contract Information lives.' },
  { key: 'cui_location', label: 'Where is CUI stored?', hint: 'Identify every system or repository that stores Controlled Unclassified Information.' },
  { key: 'cui_access', label: 'Who has access to CUI?', hint: 'List the roles, groups, or individuals with access to CUI.' },
  { key: 'cui_systems', label: 'Which systems process, store, or transmit CUI?', hint: 'Name the in-scope systems that touch CUI in any way.' },
  { key: 'cui_cloud', label: 'Which cloud services store or process CUI?', hint: 'e.g. Microsoft 365 GCC High, SharePoint, Azure, etc.' },
  { key: 'cui_endpoints', label: 'Which endpoints access CUI?', hint: 'Laptops, desktops, mobile devices, or virtual desktops used to access CUI.' },
  { key: 'external_providers', label: 'Which external providers support the environment?', hint: 'MSPs, MSSPs, hosting, or other external service providers.' },
  { key: 'separate_enclave', label: 'Is there a separate enclave?', hint: 'Describe any segmented enclave used to isolate CUI from the wider enterprise.' },
  { key: 'out_of_scope', label: 'What is intentionally out of scope?', hint: 'Systems, locations, or business units excluded from the assessment boundary.' },
  { key: 'exclusion_reason', label: 'Why is each excluded system out of scope?', hint: 'Justify each exclusion — no CUI, physically separated, etc.' },
  { key: 'boundary_evidence', label: 'What evidence supports the boundary decision?', hint: 'Diagrams, data flow maps, or documentation backing the scope decision.' },
];