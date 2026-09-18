import { CUI_HOSTING, cuiArchitectureStatement } from '@/lib/cuiHosting';
import { isToolActive } from '@/lib/securityTools';

export const PREVEIL_MANAGED_CUI_TOOLS = [
  'PreVeil',
  'NinjaOne',
  'Microsoft Intune',
  'Microsoft Defender',
];

export const SCOPING_AUTOFILL_TEXT_FIELDS = [
  'fci_description',
  'cui_description',
  'boundary_summary',
  'included_users_summary',
  'included_systems_summary',
  'excluded_systems_summary',
  'external_service_providers',
  'cloud_services_summary',
  'data_flow_summary',
];

export const SCOPING_AUTOFILL_QUESTION_KEYS = [
  'fci_location',
  'cui_location',
  'cui_access',
  'cui_systems',
  'cui_cloud',
  'cui_endpoints',
  'external_providers',
  'separate_enclave',
  'out_of_scope',
  'exclusion_reason',
  'boundary_evidence',
];

const FIELD_LABELS = {
  environment_type: 'Environment Type',
  fci_description: 'FCI Description',
  cui_description: 'CUI Description',
  boundary_summary: 'Boundary Summary',
  included_users_summary: 'Included Users Summary',
  included_systems_summary: 'Included Systems Summary',
  excluded_systems_summary: 'Excluded Systems Summary',
  external_service_providers: 'External Service Providers',
  cloud_services_summary: 'Cloud Services Summary',
  data_flow_summary: 'Data Flow Summary',
  fci_location: 'Where is FCI stored?',
  cui_location: 'Where is CUI stored?',
  cui_access: 'Who has access to CUI?',
  cui_systems: 'Which systems process, store, or transmit CUI?',
  cui_cloud: 'Which cloud services store or process CUI?',
  cui_endpoints: 'Which endpoints access CUI?',
  external_providers: 'Which external providers support the environment?',
  separate_enclave: 'Is there a separate enclave?',
  out_of_scope: 'What is intentionally out of scope?',
  exclusion_reason: 'Why is each excluded system out of scope?',
  boundary_evidence: 'What evidence supports the boundary decision?',
};

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function scopeTextPresent(value) {
  if (Array.isArray(value)) return value.some((item) => scopeTextPresent(item));
  const text = String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 0;
}

export function activeToolNames(tools = []) {
  return new Set(
    (tools || [])
      .filter((tool) => isToolActive(tool?.tool_status))
      .map((tool) => tool.tool_name)
      .filter(Boolean)
  );
}

export function preveilManagedCuiStackStatus({ profile, tools } = {}) {
  const active = activeToolNames(tools);
  const missingTools = PREVEIL_MANAGED_CUI_TOOLS.filter((name) => !active.has(name));
  const hostingOk = profile?.handles_cui === true && profile?.cui_hosting === CUI_HOSTING.PREVEIL;

  return {
    hostingOk,
    eligible: hostingOk && missingTools.length === 0,
    missingTools,
    activeToolNames: Array.from(active).sort(),
    requiredTools: PREVEIL_MANAGED_CUI_TOOLS,
  };
}

function companyNameFor(companyProfile) {
  return companyProfile?.company_name || companyProfile?.legal_name || 'the organization';
}

function environmentNameFor(project, companyProfile) {
  return companyProfile?.it_environment || project?.implementation_stack || 'the existing business environment';
}

export function buildPreveilManagedCuiAutofill({ profile = {}, project = {}, companyProfile = null } = {}) {
  const companyName = companyNameFor(companyProfile);
  const businessEnvironment = environmentNameFor(project, companyProfile);
  const architecture = cuiArchitectureStatement(CUI_HOSTING.PREVEIL, profile.cui_hosting_notes || '');
  const endpointManagement = 'All endpoint devices that access CUI are expected to be enrolled in Microsoft Intune, monitored and protected by Microsoft Defender, and managed in NinjaOne for inventory, patching, remote support, and remediation tracking.';
  const fciDescription = profile.handles_fci === false
    ? 'FCI is not identified as in scope based on the current questionnaire answers. If FCI is later identified, update this scope before approval.'
    : `FCI is handled in ${companyName}'s ordinary business systems and project records when that information is not CUI. FCI may reside in Microsoft 365 and related business systems, subject to the access, identity, and endpoint safeguards documented in this project.`;

  return {
    environment_type: 'Enclave',
    fci_description: fciDescription,
    cui_description: `CUI consists of contract-related controlled technical information, export-controlled material, specifications, drawings, or other CUI identified through the onboarding questionnaire and project scoping. ${architecture}`,
    boundary_summary: `The assessment boundary is a CUI enclave centered on PreVeil. In scope are authorized CUI users, the PreVeil encrypted email and file enclave, administrator roles that can affect the enclave, and every endpoint used to access CUI. ${endpointManagement} ${businessEnvironment} remains available for FCI and general business activity, but CUI content is not stored, processed, or transmitted there unless the scope is formally revised.`,
    included_users_summary: 'Included users are personnel and administrators who are authorized to access CUI in PreVeil, plus support personnel whose privileged access can affect CUI users, CUI endpoints, PreVeil administration, NinjaOne, Intune, Defender, or supporting identity controls.',
    included_systems_summary: 'Included systems are the PreVeil encrypted enclave, all endpoints used to access CUI, NinjaOne RMM for endpoint inventory/patching/remediation, Microsoft Intune for device compliance and configuration, Microsoft Defender for endpoint/cloud protection and telemetry, and supporting identity/access controls used by authorized CUI users and administrators.',
    excluded_systems_summary: 'Excluded systems are business systems, users, locations, and devices that do not store, process, or transmit CUI, cannot access the PreVeil enclave, and are not used to administer in-scope CUI users or CUI devices. Microsoft 365 Commercial is excluded from CUI storage and processing when PreVeil is the enclave, but may remain in scope for FCI and supporting identity/evidence activities.',
    external_service_providers: 'External service providers and supporting platforms include PreVeil for the CUI enclave, NinjaOne for endpoint management and patch/remediation support, Microsoft Intune and Microsoft Defender for device compliance and protection, Microsoft Entra ID/Microsoft 365 for identity and supporting business services, and Pac-Sec or any assigned MSP/MSSP according to the shared responsibility records.',
    cloud_services_summary: 'PreVeil is the cloud enclave used to store, process, and transmit CUI. Microsoft 365 supports identity, collaboration, evidence collection, and non-CUI/FCI business workflows as applicable; CUI content remains in PreVeil. Intune, Defender, and NinjaOne provide management, compliance, security telemetry, and remediation evidence for devices that access CUI.',
    data_flow_summary: 'Authorized users access CUI through PreVeil from managed endpoints. CUI is received, stored, shared, and transmitted inside the PreVeil encrypted enclave. Endpoint posture and configuration are enforced through Intune and Defender, while NinjaOne supports inventory, patching, monitoring, and remediation. CUI is not intentionally exported to Microsoft 365 Commercial, unmanaged devices, personal storage, or other out-of-scope systems without a documented scope change and approval.',
    wizard_answers: {
      fci_location: profile.handles_fci === false
        ? 'FCI is not currently identified as in scope. Update this answer if contract or project records later confirm FCI handling.'
        : 'FCI may be stored in approved business systems, including Microsoft 365 and project records, when the information is not CUI.',
      cui_location: 'CUI is stored in the PreVeil encrypted enclave. CUI is not intentionally stored in Microsoft 365 Commercial or other non-enclave systems.',
      cui_access: 'Access is limited to authorized CUI users and administrators with a business need to use or administer PreVeil, managed CUI endpoints, identity controls, NinjaOne, Intune, or Defender.',
      cui_systems: 'The CUI systems are PreVeil, all endpoints used to access CUI, and the supporting management/security systems that control or monitor those endpoints: NinjaOne, Microsoft Intune, Microsoft Defender, and relevant identity services.',
      cui_cloud: 'PreVeil is the CUI cloud service/enclave. Microsoft 365 supports identity and non-CUI/FCI workflows as applicable, while Intune and Defender support device compliance and protection.',
      cui_endpoints: 'All endpoints that access CUI must be managed devices covered by NinjaOne, Microsoft Intune, and Microsoft Defender. Unmanaged personal devices are not authorized for CUI access.',
      external_providers: 'PreVeil, NinjaOne, Microsoft, Pac-Sec, and any assigned MSP/MSSP support the environment according to documented shared responsibility and evidence responsibilities.',
      separate_enclave: 'Yes. The CUI enclave is PreVeil. It is logically separated from the broader business environment, and CUI is kept within the enclave unless a scope change is documented and approved.',
      out_of_scope: 'Out of scope are users, systems, devices, and locations that do not access PreVeil, do not store/process/transmit CUI, and do not administer in-scope CUI systems or CUI endpoints.',
      exclusion_reason: 'Excluded systems are outside the boundary because they have no CUI access path, are not used to administer the CUI enclave or managed CUI endpoints, and are restricted from storing or transmitting CUI.',
      boundary_evidence: 'Boundary evidence should include the onboarding questionnaire, the PreVeil CUI hosting decision, PreVeil configuration/evidence, NinjaOne device inventory and patch evidence, Intune compliance/configuration reports, Defender protection/telemetry evidence, access control records, and network or data-flow diagrams.',
    },
  };
}

export function mergeScopingAutofill(profile = {}, autofill = {}) {
  const next = { ...profile };
  const appliedFields = [];

  if ((!next.environment_type || next.environment_type === 'Unknown') && autofill.environment_type) {
    next.environment_type = autofill.environment_type;
    appliedFields.push(FIELD_LABELS.environment_type);
  }

  for (const key of SCOPING_AUTOFILL_TEXT_FIELDS) {
    if (!scopeTextPresent(next[key]) && scopeTextPresent(autofill[key])) {
      next[key] = autofill[key];
      appliedFields.push(FIELD_LABELS[key] || key);
    }
  }

  const currentAnswers = isPlainObject(next.wizard_answers) ? next.wizard_answers : {};
  const autofillAnswers = isPlainObject(autofill.wizard_answers) ? autofill.wizard_answers : {};
  const nextAnswers = { ...currentAnswers };
  let answersChanged = false;

  for (const key of SCOPING_AUTOFILL_QUESTION_KEYS) {
    if (!scopeTextPresent(nextAnswers[key]) && scopeTextPresent(autofillAnswers[key])) {
      nextAnswers[key] = autofillAnswers[key];
      appliedFields.push(`Scoping question: ${FIELD_LABELS[key] || key}`);
      answersChanged = true;
    }
  }

  if (answersChanged) next.wizard_answers = nextAnswers;

  return {
    profile: next,
    appliedFields,
    changed: appliedFields.length > 0,
  };
}
