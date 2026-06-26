// Shared SharePoint-ready package structure helpers.
// Used by the frontend (preview) and mirrored by the generatePackage backend
// function (Deno functions cannot import local files, so keep them in sync).

export function sanitizeName(value, fallback = 'Untitled') {
  let s = String(value == null ? '' : value).trim();
  if (!s) s = fallback;
  // Replace SharePoint-invalid characters: " * : < > ? / \ | # %
  s = s.replace(/["*:<>?/\\|#%]+/g, '_');
  // Collapse whitespace to single underscores
  s = s.replace(/\s+/g, '_');
  // Collapse repeated underscores/dashes
  s = s.replace(/_{2,}/g, '_').replace(/-{2,}/g, '-');
  // No leading/trailing spaces, dots, or underscores
  s = s.replace(/^[._\s]+|[._\s]+$/g, '');
  if (!s) s = fallback;
  // Keep path segments reasonable
  if (s.length > 90) s = s.slice(0, 90).replace(/[._-]+$/g, '');
  return s;
}

export function shortClientName(client) {
  const name = (client?.dba_name || client?.legal_name || 'Client').trim();
  const cleaned = name.replace(/\b(LLC|Inc|Incorporated|Corp|Corporation|Ltd|Co|Company|Systems|Defense)\b\.?/gi, '').trim();
  return sanitizeName(cleaned || name, 'Client');
}

export function levelTag(level) {
  if (level === 'Level 2') return 'Level2';
  if (level === 'Level 2 Ready') return 'Level2Ready';
  return 'Level1';
}

export function rootFolderName(client, level, dateStr) {
  const name = sanitizeName(client?.legal_name || 'Client', 'Client');
  return `${name}_CMMC_${levelTag(level)}_Assessment_Package_${dateStr}`;
}

// Control family code -> evidence folder name (under 04_Evidence)
export const EVIDENCE_FAMILY_FOLDERS = {
  AC: 'AC_Access_Control',
  IA: 'IA_Identification_and_Authentication',
  MP: 'MP_Media_Protection',
  PE: 'PE_Physical_Protection',
  SC: 'SC_System_and_Communications_Protection',
  SI: 'SI_System_and_Information_Integrity',
  AT: 'AT_Awareness_and_Training',
  AU: 'AU_Audit_and_Accountability',
  CA: 'CA_Assessment',
  CM: 'CM_Configuration_Management',
  IR: 'IR_Incident_Response',
  MA: 'MA_Maintenance',
  PS: 'PS_Personnel_Security',
  RA: 'RA_Risk_Assessment',
};

// Level 1 applicable family codes (FCI safeguarding families)
export const LEVEL1_FAMILY_CODES = ['AC', 'IA', 'MP', 'PE', 'SC', 'SI'];

export const SOURCE_SYSTEM_FOLDERS = {
  'Microsoft 365': 'Microsoft_365_Admin',
  'Entra ID': 'Entra_ID',
  'Intune': 'Intune',
  'Defender': 'Defender',
  'Purview': 'Purview',
  'Exchange': 'Exchange',
  'SharePoint': 'SharePoint',
  'Teams': 'Teams',
  'NinjaOne': 'NinjaOne',
  'Cortex XDR': 'Cortex_XDR',
  'Google Workspace': 'Google_Workspace',
};

export function sourceSystemFolder(system) {
  return SOURCE_SYSTEM_FOLDERS[system] || 'Other_Admin_Centers';
}

// Build the level-aware folder tree. Returns array of folder paths (relative to root).
export function buildFolderTree({ level, cuiInScope, includeEmptyFolders, includeArchive }) {
  const isL2 = level === 'Level 2' || level === 'Level 2 Ready';
  const folders = [];
  const add = (p) => folders.push(p);

  add('00_Read_Me');

  // 01 Client Profile & Scope
  add('01_Client_Profile_and_Scope');
  add('01_Client_Profile_and_Scope/CMMC_Scope_Statement');
  add('01_Client_Profile_and_Scope/FCI_CUI_Data_Flows');
  add('01_Client_Profile_and_Scope/System_Boundary');
  add('01_Client_Profile_and_Scope/External_Connections');
  add('01_Client_Profile_and_Scope/Service_Provider_Responsibility');
  if (isL2 || includeEmptyFolders) add('01_Client_Profile_and_Scope/Shared_Responsibility_Matrix');

  // 02 SSP & Control Implementation
  add('02_SSP_and_Control_Implementation');
  add('02_SSP_and_Control_Implementation/SSP');
  add('02_SSP_and_Control_Implementation/Control_Implementation_Matrix');
  add('02_SSP_and_Control_Implementation/Control_Narratives');
  add('02_SSP_and_Control_Implementation/Control_Validation_Summary');
  add('02_SSP_and_Control_Implementation/Control_Readiness_Report');

  // 03 Policies & Procedures
  add('03_Policies_and_Procedures');
  const policyFolders = [
    'Access_Control', 'Identification_and_Authentication', 'Media_Protection',
    'Physical_Protection', 'System_and_Communications_Protection', 'System_and_Information_Integrity',
  ];
  const l2PolicyFolders = [
    'Incident_Response', 'Risk_Management', 'Configuration_Management', 'Audit_and_Accountability',
    'Security_Awareness_and_Training', 'Maintenance', 'Personnel_Security', 'Assessment_and_Monitoring',
  ];
  policyFolders.forEach(f => add(`03_Policies_and_Procedures/${f}`));
  if (isL2 || includeEmptyFolders) l2PolicyFolders.forEach(f => add(`03_Policies_and_Procedures/${f}`));

  // 04 Evidence
  add('04_Evidence');
  const famCodes = isL2 ? Object.keys(EVIDENCE_FAMILY_FOLDERS) : LEVEL1_FAMILY_CODES;
  const evFams = (includeEmptyFolders ? Object.keys(EVIDENCE_FAMILY_FOLDERS) : famCodes);
  evFams.forEach(code => add(`04_Evidence/${EVIDENCE_FAMILY_FOLDERS[code]}`));
  add('04_Evidence/Other_Supporting_Evidence');

  // 05 Screenshots & Exports
  add('05_Screenshots_and_Exports');
  Object.values(SOURCE_SYSTEM_FOLDERS).forEach(f => add(`05_Screenshots_and_Exports/${f}`));
  add('05_Screenshots_and_Exports/Other_Admin_Centers');

  // 06 Inventory
  add('06_Inventory');
  ['User_Inventory', 'Device_Inventory', 'Asset_Inventory', 'System_Component_Inventory',
    'Cloud_Services_Inventory', 'External_Service_Provider_Inventory', 'Mobile_Device_Inventory',
    'macOS_Device_Summary'].forEach(f => add(`06_Inventory/${f}`));

  // 07 Assessment Workpapers
  add('07_Assessment_Workpapers');
  const wp = ['Evidence_Index', 'Screenshot_Log', 'Export_Log', 'Gap_Report', 'Assessment_Readiness_Report'];
  const l2wp = ['POAM', 'Risk_Register', 'Training_Records_Summary', 'Policy_Acknowledgement_Summary'];
  wp.forEach(f => add(`07_Assessment_Workpapers/${f}`));
  if (isL2 || includeEmptyFolders) l2wp.forEach(f => add(`07_Assessment_Workpapers/${f}`));

  // 08 Final Attestation & Submission
  add('08_Final_Attestation_and_Submission');
  add('08_Final_Attestation_and_Submission/SPRS_Self_Assessment_Workpaper');
  add('08_Final_Attestation_and_Submission/Executive_Attestation');
  add('08_Final_Attestation_and_Submission/Self_Certification_Walkthrough');
  if (isL2 || includeEmptyFolders) add('08_Final_Attestation_and_Submission/C3PAO_Handoff_Index');
  add('08_Final_Attestation_and_Submission/Final_Assessment_Summary');
  add('08_Final_Attestation_and_Submission/Final_Readiness_Summary');

  // 99 Archive
  if (includeArchive || includeEmptyFolders) {
    add('99_Archive_and_Superseded');
    add('99_Archive_and_Superseded/Superseded_Documents');
    add('99_Archive_and_Superseded/Old_Evidence');
    add('99_Archive_and_Superseded/Previous_Package_Exports');
  }

  return folders;
}

// Build a nested tree object from flat paths, for rendering.
export function nestPaths(paths) {
  const root = {};
  paths.forEach(p => {
    const parts = p.split('/');
    let node = root;
    parts.forEach(part => {
      node[part] = node[part] || {};
      node = node[part];
    });
  });
  return root;
}

// Evidence file name: <CONTROL_ID>_<Short_Description>_<SourceSystem>_<YYYY-MM-DD>.<ext>
export function evidenceFileName({ controlId, description, sourceSystem, date, ext }) {
  const parts = [
    sanitizeName(controlId || 'GEN', 'GEN'),
    sanitizeName(description || 'Evidence', 'Evidence'),
    sanitizeName(sourceSystem || 'Source', 'Source'),
    date,
  ];
  return `${parts.join('_')}.${(ext || 'png').replace(/[^a-z0-9]/gi, '')}`;
}

// Document file name: <ClientShortName>_<DocumentType>_<CMMCLevel>_v<Version>_<YYYY-MM-DD>.<ext>
export function documentFileName({ client, documentType, level, version, date, ext }) {
  const parts = [
    shortClientName(client),
    sanitizeName(documentType || 'Document', 'Document'),
    levelTag(level),
    `v${String(version || 1).replace(/[^0-9]/g, '') || '1'}`,
    date,
  ];
  return `${parts.join('_')}.${(ext || 'md').replace(/[^a-z0-9]/gi, '')}`;
}

export function fileExtFromUrl(url, fallback = 'png') {
  if (!url) return fallback;
  const clean = url.split('?')[0];
  const m = clean.match(/\.([a-z0-9]{2,5})$/i);
  return m ? m[1].toLowerCase() : fallback;
}

export const EXPORT_MODES = [
  { id: 'Ready-only', label: 'Ready-only Assessment Package', desc: 'Only Approved/Published documents and reviewed/validated evidence. Blocks if incomplete.' },
  { id: 'Draft', label: 'Draft Working Package', desc: 'Includes drafts and gaps. Labeled DRAFT_NOT_ASSESSMENT_READY.' },
  { id: 'Evidence-only', label: 'Evidence-only Package', desc: 'Evidence, screenshots, and exports only — no generated documents.' },
  { id: 'Documents-only', label: 'Documents-only Package', desc: 'Generated documents and workpapers only — no raw evidence files.' },
  { id: 'Delta', label: 'Delta Update Package', desc: 'Only items added or updated since the last export.' },
  { id: 'Full archive', label: 'Full Archive Package', desc: 'Everything including superseded documents and archived content.' },
];