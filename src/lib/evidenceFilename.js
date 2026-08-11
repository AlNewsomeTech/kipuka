const KNOWN_TOOL_NAMES = /** @type {Array<[RegExp, string]>} */ ([
  [/entra|azure ad|identity/i, 'EntraID'],
  [/microsoft 365|office 365|m365/i, 'Microsoft365'],
  [/intune|endpoint manager/i, 'Intune'],
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
]);

export function filenameSegment(value, fallback = '') {
  const cleaned = String(value || '')
    .trim()
    .replace(/&/g, ' And ')
    .replace(/[^a-zA-Z0-9.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_\-.]+|[_\-.]+$/g, '');
  return cleaned || fallback;
}

function toolNameFor(variant, project) {
  const source = [
    variant?.tool_name,
    variant?.source_tool,
    variant?.where_to_go?.name,
    project?.implementation_stack,
  ].filter(Boolean).join(' ');

  const known = KNOWN_TOOL_NAMES.find(([pattern]) => pattern.test(source));
  return known?.[1] || filenameSegment(variant?.where_to_go?.name || project?.implementation_stack, 'Tool');
}

function descriptionFor(variant, libEntry) {
  const firstCapture = String(variant?.screenshot_instructions || '')
    .split(/\r?\n|[;•]/)
    .map((item) => item.trim())
    .find(Boolean);

  return filenameSegment(
    variant?.evidence_description || firstCapture || libEntry?.control_title,
    'Implementation_Evidence',
  );
}

export function buildEvidenceFilePlan({
  organization,
  project,
  libEntry,
  variant,
  controlType = 'Screenshot',
  date = new Date().toISOString().slice(0, 10),
}) {
  const company = filenameSegment(
    organization?.legal_name || organization?.organization_name || organization?.short_name || project?.project_name,
    'Company',
  );
  const type = filenameSegment(controlType, 'Evidence');
  const controlId = filenameSegment(libEntry?.control_id, 'Control');
  const tool = toolNameFor(variant, project);
  const description = descriptionFor(variant, libEntry);
  const baseName = [company, type, controlId, tool, description, date].join('_');

  return { company, type, controlId, tool, description, date, baseName };
}

export function buildEvidenceFilename(options) {
  return buildEvidenceFilePlan(options).baseName;
}

export const EVIDENCE_FILENAME_FORMAT =
  'CompanyName_ControlType_CONTROLID_ToolName_Description_YYYY-MM-DD';
