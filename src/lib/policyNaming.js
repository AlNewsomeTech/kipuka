import { filenameSegment } from '@/lib/evidenceFilename';

const KNOWN_LOCATIONS = [
  [/intune|endpoint manager/i, 'Intune'],
  [/entra|azure ad|conditional access/i, 'Entra'],
  [/microsoft 365|office 365|m365/i, 'Microsoft365'],
  [/defender/i, 'MicrosoftDefender'],
  [/purview/i, 'MicrosoftPurview'],
  [/exchange/i, 'ExchangeOnline'],
  [/sharepoint/i, 'SharePoint'],
  [/teams/i, 'MicrosoftTeams'],
  [/ninjaone|ninja one/i, 'NinjaOne'],
  [/preveil/i, 'PreVeil'],
  [/cortex/i, 'CortexXDR'],
  [/palo alto/i, 'PaloAlto'],
  [/google workspace/i, 'GoogleWorkspace'],
];

function locationFor(variant, project) {
  const source = [
    variant?.where_to_go?.name,
    variant?.tool_name,
    variant?.source_tool,
    project?.implementation_stack,
  ].filter(Boolean).join(' ');
  const known = KNOWN_LOCATIONS.find(([pattern]) => pattern.test(source));
  return known?.[1] || filenameSegment(variant?.where_to_go?.name || project?.implementation_stack, 'ControlLocation');
}

function policyTypeFor(libEntry) {
  return filenameSegment(libEntry?.control_title, 'PolicyType').replace(/_/g, '');
}

export function shouldShowPolicyNames(libEntry, variant) {
  if (Array.isArray(variant?.policy_names) && variant.policy_names.length > 0) return true;
  if (Array.isArray(libEntry?.related_policy_templates) && libEntry.related_policy_templates.length > 0) return true;
  const instructionText = [
    ...(Array.isArray(variant?.steps) ? variant.steps : []),
    variant?.setting_to_change,
    variant?.outcome,
  ].filter(Boolean).join(' ');
  return /\b(policy|policies|procedure|plan|standard|rule|profile)\b/i.test(instructionText);
}

export function buildPolicyNames({
  organization,
  project,
  libEntry,
  variant,
  date = new Date().toISOString().slice(0, 10),
}) {
  const company = filenameSegment(
    organization?.legal_name || organization?.organization_name || organization?.short_name || project?.project_name,
    'CompanyName',
  );
  const controlId = filenameSegment(libEntry?.control_id, 'CONTROLID');
  const defaultLocation = locationFor(variant, project);
  const configured = Array.isArray(variant?.policy_names) ? variant.policy_names : [];
  const specs = configured.length > 0
    ? configured
    : [{ policy_type: policyTypeFor(libEntry), location: defaultLocation }];

  return specs.map((spec) => {
    const policyType = filenameSegment(spec?.policy_type, policyTypeFor(libEntry));
    const location = filenameSegment(spec?.location, defaultLocation);
    return {
      label: spec?.label || String(spec?.policy_type || libEntry?.control_title || 'Policy'),
      value: [company, policyType, controlId, location, date].join('_'),
    };
  });
}

export const POLICY_NAME_FORMAT =
  'CompanyName_PolicyType_CONTROLID_ControlLocation_YYYY-MM-DD';
