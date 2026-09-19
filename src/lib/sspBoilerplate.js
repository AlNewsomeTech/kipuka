import { isToolActive, isToolImplemented } from '@/lib/securityTools';
import { CUI_HOSTING } from '@/lib/cuiHosting';

// Standard capability language, not assertions of deployment or assessment success.
// Keep this deterministic: drafting does not call AI, enable tools, or change scope.
export const SSP_TOOL_BOILERPLATE = {
  m365: {
    name: 'Microsoft 365', match: /\b(?:microsoft\s*365|m365|office\s*365)\b/i,
    role: 'Exchange email, SharePoint and OneDrive file collaboration, Teams communication, and Entra ID identity services',
    text: 'Microsoft 365 provides the productivity and collaboration services used in the standard Pac-Sec environment, including Exchange, SharePoint, Teams, and OneDrive. Entra ID supports account lifecycle management, authentication, role assignments, and access policy enforcement where configured and licensed. Administrators restrict access and sharing to authorized users and approved business purposes, with audit records retained according to the organization’s approved requirements. These capabilities support the AC, IA, and AU control families; permitted FCI and CUI handling depends on the documented tenant and authorization boundary.',
  },
  defender_o365: {
    name: 'Microsoft Defender for Office 365', match: /defender\s+for\s+(?:office\s*365|o365)/i,
    role: 'email and collaboration threat protection, malicious-link and attachment analysis',
    text: 'Microsoft Defender for Office 365 provides threat protection for supported email and collaboration workloads. The standard configuration uses applicable anti-phishing policies, Safe Links, and Safe Attachments to reduce exposure to malicious messages, links, and files, subject to the licensed plan. Designated security personnel review detections, investigate affected users and messages, and document response actions. These capabilities support the SI and IR control families; enabled policies, coverage, and investigation records must substantiate the implementation.',
  },
  defender_xdr: {
    name: 'Microsoft Defender XDR', match: /(?:microsoft\s+)?defender(?:\s+xdr|\s+for\s+(?:endpoint|identity|cloud\s+apps))?\b/i,
    role: 'correlated security detections, endpoint investigation, and incident response',
    text: 'Microsoft Defender XDR correlates security signals across the Defender services that are licensed, deployed, and connected to the environment. Defender for Endpoint supplies endpoint detection and response; Defender for Identity supplies identity-threat signals from supported identity infrastructure where its sensors are deployed, and Defender for Cloud Apps supplies cloud-application visibility where configured. Security personnel investigate correlated incidents, apply approved containment and remediation actions, and retain supporting records. These capabilities support the SI, AU, and IR control families without establishing that every Defender component is deployed or that any requirement is automatically satisfied.',
  },
  intune: {
    name: 'Microsoft Intune', match: /\b(?:microsoft\s+)?intune\b/i,
    role: 'device enrollment, configuration baselines, compliance policies, and application management',
    text: 'Microsoft Intune provides centralized management of enrolled devices and supported applications. The standard configuration applies approved device configuration profiles, compliance policies, encryption settings, and application controls appropriate to each supported operating system. Administrators review enrollment coverage, policy assignments, compliance exceptions, and remediation results, coordinating access restrictions with identity policies where configured. These capabilities support the CM, AC, IA, and SC control families; enrollment and policy evidence must confirm actual device coverage.',
  },
  ninjaone: {
    name: 'NinjaOne', match: /\bninja\s*one\b/i,
    role: 'endpoint inventory, patching, monitoring, remote support, and remediation tracking',
    text: 'NinjaOne provides remote monitoring and management for enrolled, in-scope endpoints. The standard operating procedure uses inventory, monitoring alerts, approved patch policies, and restricted remote support to maintain devices and address identified issues. Authorized personnel review patch results and exceptions, coordinate maintenance with device-management policies, and retain records of remediation and administrative activity. These capabilities support the CM, MA, and SI control families; deployment coverage, patch schedules, and access restrictions require project-specific confirmation.',
  },
  preveil: {
    name: 'PreVeil', match: /\bpre\s*veil\b/i,
    role: 'end-to-end encrypted CUI email and file sharing within the approved enclave',
    text: 'PreVeil provides end-to-end encrypted email and file sharing for the designated CUI enclave. The standard enclave approach restricts CUI exchange to authorized users and approved devices and separates approved CUI workflows from general-purpose collaboration services. Administrators maintain user access, recovery arrangements, and sharing restrictions, and document the endpoint, export, and data-flow boundaries associated with the enclave. These capabilities support the AC, IA, MP, and SC control families; provider assurances, cryptographic configuration, and customer responsibilities must be reviewed rather than inferred from the product name.',
  },
};

export function escapeSspText(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
const paragraph = (text) => `<p>${escapeSspText(text)}</p>`;
const plain = (value) => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/\s+/g, ' ').trim();

// Preserve original HTML, including edits to previously generated wording.
// Compare rendered text so Quill formatting changes do not duplicate boilerplate.
export function appendSspBoilerplate(existing, generated, boilerplate = '') {
  let result = plain(existing) ? String(existing) : String(generated || '');
  const additions = (boilerplate.match(/<p>[\s\S]*?<\/p>/g) || []).filter((block) => !plain(result).includes(plain(block)));
  if (additions.length) result += `${plain(result) ? '\n\n<p><br></p>' : ''}${additions.join('\n')}`;
  return result;
}

export function resolveSspBoilerplate({ project = {}, scoping, assets = [], providers = [], client, companyProfile, securityTools = [] }) {
  // Do not trust a selected client or a tool from another workspace/project.
  client = project.organization_id && client?.organization_id === project.organization_id ? client : null;
  companyProfile = project.organization_id && companyProfile?.organization_id === project.organization_id ? companyProfile : null;
  scoping = scoping && scoping.project_id === project.id && (!scoping.organization_id || scoping.organization_id === project.organization_id) ? scoping : null;
  const belongs = (item) => item.project_id === project.id && (!item.organization_id || item.organization_id === project.organization_id);
  const records = securityTools.filter(belongs);
  const scopeAssets = assets.filter((item) => belongs(item) && item.in_scope);
  const scopeProviders = providers.filter(belongs);
  const stack = project.implementation_stack || companyProfile?.implementation_stack || companyProfile?.it_environment || 'Not recorded';
  const microsoft = SSP_TOOL_BOILERPLATE.m365.match.test(stack);
  const sourceText = plain([scoping?.cloud_services_summary, scoping?.external_service_providers, ...scopeAssets.map((item) => item.asset_name), ...scopeProviders.map((item) => item.provider_name)].filter(Boolean).join('. '));
  const hasCui = scoping?.handles_cui === true;
  const hosting = scoping?.cui_hosting;
  const otherHosting = hosting === CUI_HOSTING.GCC_HIGH || hosting === CUI_HOSTING.OTHER;
  const tools = {};
  const states = {};
  for (const [key, definition] of Object.entries(SSP_TOOL_BOILERPLATE)) {
    const matches = records.filter((item) => definition.match.test(item.tool_name === 'Other' ? item.notes || '' : item.tool_name || '')
      || (key === 'defender_o365' && item.tool_name === 'Microsoft Defender' && ['Disabled', 'Not Used'].includes(item.tool_status)));
    // Office 365 protection alone must not be mistaken for deployed endpoint/XDR services.
    const applicable = key === 'defender_xdr' ? matches.filter((item) => !SSP_TOOL_BOILERPLATE.defender_o365.match.test(item.tool_name || '')) : matches;
    const excluded = applicable.some((item) => ['Disabled', 'Not Used'].includes(item.tool_status)) || (key === 'ninjaone' && client?.ninjaone_in_scope === false);
    const explicit = applicable.some((item) => isToolActive(item.tool_status));
    const mentioned = sourceText.split(/[.;\n]/).some((sentence) => definition.match.test(sentence) && !/\b(?:not used|disabled|excluded|not in scope|no longer|without)\b/i.test(sentence));
    const baseline = ['m365', 'defender_o365', 'defender_xdr', 'intune'].includes(key) && microsoft;
    const defaultPreveil = key === 'preveil' && hasCui && !otherHosting;
    tools[key] = !excluded && (applicable.length ? explicit : mentioned || baseline || defaultPreveil || (key === 'ninjaone' && client?.ninjaone_in_scope === true));
    if (key === 'preveil' && !hasCui) tools[key] = false;
    states[key] = applicable.some(isToolImplemented) ? 'Recorded as implemented; evidence review still required'
      : explicit ? `${applicable.find((item) => isToolActive(item.tool_status)).tool_status}; deployment and coverage require review`
      : mentioned || (key === 'ninjaone' && client?.ninjaone_in_scope === true) || (key === 'preveil' && hosting === CUI_HOSTING.PREVEIL) ? 'In scope; implementation not confirmed'
      : 'Proposed standard baseline; licensing and deployment not confirmed';
  }
  const selected = Object.keys(tools).filter((key) => tools[key]);
  const names = selected.map((key) => SSP_TOOL_BOILERPLATE[key].name).join(', ');
  const describe = (keys) => keys.filter((key) => tools[key]).map((key) => paragraph(`${SSP_TOOL_BOILERPLATE[key].name}: ${SSP_TOOL_BOILERPLATE[key].role}. ${states[key]}.`)).join('');
  const capabilities = selected.map((key) => paragraph(SSP_TOOL_BOILERPLATE[key].text)).join('');
  const additionalTools = records.filter((item) => isToolActive(item.tool_status) && !Object.values(SSP_TOOL_BOILERPLATE).some((definition) => definition.match.test(item.tool_name || '')));
  const additional = additionalTools.map((item) => paragraph(`${item.tool_name}: ${item.tool_status}. Confirm configured functions, assigned ownership, and implementation evidence in Security Tooling.`)).join('');
  const cortex = client?.cortex_xdr_in_scope === true && !records.some((item) => /cortex/i.test(item.tool_name || ''))
    ? paragraph('Palo Alto Cortex XDR is recorded in the client scope for endpoint threat detection and response. Deployment coverage and configuration require confirmation.') : '';
  const review = paragraph('Standard implementation language is a draft baseline for review, not proof of deployment or compliance. Confirm licensed services, assigned policies, device coverage, responsible personnel, and supporting evidence before relying on these statements. Existing narrative remains authoritative user content and must be reconciled when the tool scope changes.');
  const boundary = hasCui
    ? hosting === CUI_HOSTING.PREVEIL ? 'The selected CUI hosting design uses the PreVeil encrypted enclave. Document authorized endpoints, users, exports, and connections; do not treat general-purpose collaboration services as part of this enclave merely because they share the same devices.'
      : otherHosting ? `The recorded CUI hosting choice is ${hosting === CUI_HOSTING.GCC_HIGH ? 'Microsoft 365 GCC High' : 'another designated FedRAMP environment'}. Confirm the system-specific boundary and provider responsibilities; a product selection alone does not establish authorization.`
      : 'CUI is in scope, but the hosting architecture still requires confirmation. Any PreVeil language in this draft describes a proposed baseline, not an already implemented or approved enclave.'
    : scoping?.handles_cui === false ? 'CUI is recorded as outside this system’s scope. Maintain the documented FCI and business-data boundaries and reassess the scope before introducing CUI.'
      : 'FCI and CUI handling must be confirmed in the project scope. This draft does not infer an approved data boundary from a technology stack selection.';
  const paragraphs = {
    system_description: paragraph(names ? `The Pac-Sec security baseline for this draft includes ${names}. Together, these services support identity, endpoint, collaboration, and information-protection functions subject to their documented scope and deployment state.` : 'The Pac-Sec security baseline combines controlled identity, endpoint management, monitoring, and approved information-handling services. Select the applicable project tools before attributing these functions to specific products.') + review,
    system_purpose: paragraph('The standard operating model supports authorized contract work through least-privilege access, managed endpoints, approved collaboration channels, and documented security responsibilities. Information is handled according to its classification and the approved authorization boundary; changes in contracts or information types require a scope review.'),
    authorization_boundary: paragraph(boundary),
    environment_description: paragraph(`Implementation stack: ${stack}. Recorded Microsoft license: ${client?.ms_license_level || 'Not recorded; verify licensed capabilities before implementation claims'}.`) + describe(['intune', 'ninjaone']) + additional + cortex + (client?.mac_heavy ? paragraph('The client identifies a macOS-heavy environment. Confirm platform-specific enrollment, configuration, protection, and patching coverage rather than assuming Windows controls apply unchanged.') : ''),
    cui_description: paragraph(boundary),
    fci_description: paragraph(scoping?.handles_fci === false ? 'FCI is recorded as outside this project’s scope. Review contract information-handling requirements before introducing FCI.' : 'The standard FCI handling procedure restricts contract information to authorized users, approved systems, and permitted external recipients. Document the applicable information types and verify that sharing settings and retention practices match the project scope.'),
    user_population: paragraph('The standard access procedure maintains an inventory of authorized users, administrative roles, and approved service identities. Joiner, mover, and leaver actions are recorded, privileges are reviewed, and unnecessary access is removed according to the approved access-control procedure.'),
    asset_summary: paragraph('The standard inventory procedure records device ownership, operating system, management coverage, and information-handling role. Each asset is classified against the assessment boundary; enrollment in a management console alone does not determine its CMMC scope category.'),
    network_summary: paragraph('The standard network and data-flow documentation identifies approved information paths, external connections, administrative access, and trust boundaries. Diagrams and connection records are reviewed against the deployed environment, including endpoint access to cloud services and any designated CUI enclave.'),
    cloud_services_summary: describe(['m365', 'defender_o365', 'defender_xdr', 'intune']) || paragraph('Cloud services must be identified from the approved project scope. For each selected service, record its business purpose, permitted information types, access restrictions, logging, and customer-managed settings.'),
    external_service_provider_summary: describe(['ninjaone', 'preveil']) + paragraph('External provider responsibilities are documented against the services actually used. The organization retains responsibility for its configuration, authorized users, endpoints, monitoring, and incident coordination unless a reviewed responsibility agreement explicitly assigns a function to a provider.'),
    roles_and_responsibilities: paragraph('The system owner approves the system boundary and risk decisions. Designated administrators maintain identities, endpoint policies, patching, and service configurations; security personnel investigate alerts and maintain response records, while the compliance owner coordinates evidence and independent review.'),
    inherited_controls_summary: paragraph('Inheritance is claimed only for specific provider-operated functions supported by current responsibility documentation and applicable assurance evidence. Use of a cloud or security product does not make an entire control family inherited, and customer endpoint and configuration responsibilities remain subject to assessment.'),
    shared_responsibility_summary: paragraph('The standard shared-responsibility model separates provider-operated infrastructure from customer-managed identities, devices, service settings, and information flows. Record the owner of each shared activity, the evidence each party supplies, and the escalation path for configuration failures or security incidents.'),
    control_implementation_summary: paragraph(names ? `The selected Pac-Sec standard stack (${names}) supplies the draft implementation baseline described below. Individual control narratives, their current implementation status, and linked evidence must substantiate how each requirement is addressed.` : 'The implementation baseline describes the operating procedures that must be tied to individual controls and supporting evidence. Tool selections and deployment details require review before product-specific claims are added.') + capabilities + review,
    linked_poam_summary: paragraph('The standard remediation process records identified weaknesses with their affected controls, responsible owners, corrective actions, and target dates. Closure requires review of the completed action and its supporting evidence; the presence of standard SSP language does not close a gap or change a control finding.'),
  };
  return { tools, paragraphs };
}