const PLATFORM_NAME_PATTERN = /Kipuka(?:\s+by\s+Pac-Sec)?/gi;

export const CAPTURE_SAFETY_NOTE =
  'Do not capture passwords, secrets, private keys, recovery codes, full CUI content, or unrelated personal information. Redact those values before upload.';

export function neutralizeCustomerArtifactText(value, fallback = '') {
  const cleaned = String(value || '')
    .replace(PLATFORM_NAME_PATTERN, 'project')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || fallback;
}

function cleanCaptureTitle(value) {
  const original = String(value || '').replace(/^\s*\d+[.)]\s*/, '').trim();
  const replacements = [
    [/^Kipuka mobile device inventory$/i, 'Current mobile device inventory from the project Asset Inventory'],
    [/^Kipuka wireless asset\/connection register$/i, 'Current wireless asset and connection register'],
    [/^Kipuka CUI data-flow diagram and asset inventory$/i, 'Current CUI data-flow diagram and in-scope asset inventory'],
    [/^Kipuka External Connections export or screenshot$/i, 'Current external connections register export'],
    [/^Kipuka assessment records and assessor notes$/i, 'Current assessment records and assessor notes'],
    [/^Kipuka training records$/i, 'Current training records'],
    [/^Findings imported\/mapped in Kipuka$/i, 'Finding-to-control mapping record'],
  ];
  const replacement = replacements.find(([pattern]) => pattern.test(original));
  return neutralizeCustomerArtifactText(replacement?.[1] || original, 'Implementation evidence');
}

export function captureProofRequirements(title) {
  const value = String(title || '').toLowerCase();

  if (/assignment|configuration|setting|profile|rule|conditional access|rbac|permission|restriction|grant control|technical control|compliance policy|app protection|intune|entra|defender|purview|exchange|sharepoint|teams/.test(value)) {
    return 'Show the tenant or system name, policy or rule name, configured values, enabled or enforcement state, assignments or scope, exclusions, and last modified or capture date.';
  }
  if (/policy|procedure|plan|standard|guidance/.test(value)) {
    return 'Show the document title, owner, version, approval status, approver, effective date, next review date, and the section that establishes this requirement.';
  }
  if (/test|allowed|blocked|denied|attempt|validation|simulation|exercise result|test result/.test(value)) {
    return 'Show the test date, tester, user or device tested, expected result, actual result, and the related event, alert, ticket, or log entry.';
  }
  if (/diagram|data.flow|topology|architecture|boundary/.test(value)) {
    return 'Show the document title, revision date, in-scope boundary, named systems or locations, connections or data flows, legend, and approval or reviewer.';
  }
  if (/approval|authorization|decision|exception|risk acceptance/.test(value)) {
    return 'Show the affected scope, decision, business reason, approver, approval date, owner, compensating protection, and expiration or next review date.';
  }
  if (/inventory|register|matrix|roster|mapping|list/.test(value)) {
    return 'Show the report or register title, organization or project, all in-scope entries, unique identifiers where applicable, owner, status, exceptions, and export or review date.';
  }
  if (/provider|assurance|fedramp|fips|attestation/.test(value)) {
    return 'Show the provider and service, covered offering or boundary, assurance or authorization cited, document version, issue date, and applicability to the project.';
  }
  if (/log|report|export|alert|finding|scan|review|record|certificate|completion|recommendation|ticket|request/.test(value)) {
    return 'Show the source system, organization or tenant, selected scope or filters, reporting period or event date, result or status, owner or reviewer, and any exception or failure.';
  }
  return 'Show the organization or tenant, source system, affected scope, relevant setting or record, current status or result, owner where applicable, and capture or effective date.';
}

function legacyCaptureTitles(value) {
  return String(value || '')
    .split(/\r?\n|[;•]/)
    .map(cleanCaptureTitle)
    .filter(Boolean);
}

export function buildCaptureItems(variant, libEntry) {
  const configured = Array.isArray(variant?.capture_items) ? variant.capture_items : [];
  const source = configured.length > 0
    ? configured
    : legacyCaptureTitles(
      variant?.screenshot_instructions
      || `Capture evidence showing ${libEntry?.control_id || 'this control'} is implemented.`,
    ).map((title) => ({ title, instructions: captureProofRequirements(title) }));

  return source.map((item) => {
    const title = cleanCaptureTitle(typeof item === 'string' ? item : item?.title);
    const instructions = neutralizeCustomerArtifactText(
      typeof item === 'string' ? captureProofRequirements(title) : item?.instructions,
      captureProofRequirements(title),
    );
    return { title, instructions };
  });
}

export function neutralEvidenceDescription(variant, libEntry) {
  return neutralizeCustomerArtifactText(
    variant?.evidence_description,
    `${libEntry?.control_title || 'Implementation'} Evidence`,
  );
}
