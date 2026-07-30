import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import JSZip from 'npm:jszip@3.10.1';

// ---- Mirrored from lib/packageStructure.js (Deno can't import local files) ----
const PLACEHOLDER_REGEX = /\[([A-Z][A-Z_0-9]{2,})\]/g;

function sanitizeName(value, fallback = 'Untitled') {
  let s = String(value == null ? '' : value).trim();
  if (!s) s = fallback;
  s = s.replace(/["*:<>?/\\|#%]+/g, '_').replace(/\s+/g, '_').replace(/_{2,}/g, '_').replace(/-{2,}/g, '-');
  s = s.replace(/^[._\s]+|[._\s]+$/g, '');
  if (!s) s = fallback;
  if (s.length > 90) s = s.slice(0, 90).replace(/[._-]+$/g, '');
  return s;
}
function shortClientName(client) {
  const name = (client?.dba_name || client?.legal_name || 'Client').trim();
  const cleaned = name.replace(/\b(LLC|Inc|Incorporated|Corp|Corporation|Ltd|Co|Company|Systems|Defense)\b\.?/gi, '').trim();
  return sanitizeName(cleaned || name, 'Client');
}
function levelTag(level) {
  if (level === 'Level 2') return 'Level2';
  if (level === 'Level 2 Ready') return 'Level2Ready';
  return 'Level1';
}
function rootFolderName(client, level, dateStr) {
  return `${sanitizeName(client?.legal_name || 'Client', 'Client')}_CMMC_${levelTag(level)}_Assessment_Package_${dateStr}`;
}
const EVIDENCE_FAMILY_FOLDERS = {
  AC: 'AC_Access_Control', IA: 'IA_Identification_and_Authentication', MP: 'MP_Media_Protection',
  PE: 'PE_Physical_Protection', SC: 'SC_System_and_Communications_Protection', SI: 'SI_System_and_Information_Integrity',
  AT: 'AT_Awareness_and_Training', AU: 'AU_Audit_and_Accountability', CA: 'CA_Assessment',
  CM: 'CM_Configuration_Management', IR: 'IR_Incident_Response', MA: 'MA_Maintenance',
  PS: 'PS_Personnel_Security', RA: 'RA_Risk_Assessment',
};
const LEVEL1_FAMILY_CODES = ['AC', 'IA', 'MP', 'PE', 'SC', 'SI'];
const SOURCE_SYSTEM_FOLDERS = {
  'Microsoft 365': 'Microsoft_365_Admin', 'Entra ID': 'Entra_ID', 'Intune': 'Intune', 'Defender': 'Defender',
  'Purview': 'Purview', 'Exchange': 'Exchange', 'SharePoint': 'SharePoint', 'Teams': 'Teams',
  'NinjaOne': 'NinjaOne', 'Cortex XDR': 'Cortex_XDR', 'Google Workspace': 'Google_Workspace',
};
function sourceSystemFolder(system) { return SOURCE_SYSTEM_FOLDERS[system] || 'Other_Admin_Centers'; }

function buildFolderTree({ level, includeEmptyFolders, includeArchive }) {
  const isL2 = level === 'Level 2' || level === 'Level 2 Ready';
  const folders = [];
  const add = (p) => folders.push(p);
  add('00_Read_Me');
  add('01_Client_Profile_and_Scope');
  add('01_Client_Profile_and_Scope/CMMC_Scope_Statement');
  add('01_Client_Profile_and_Scope/FCI_CUI_Data_Flows');
  add('01_Client_Profile_and_Scope/System_Boundary');
  add('01_Client_Profile_and_Scope/External_Connections');
  add('01_Client_Profile_and_Scope/Service_Provider_Responsibility');
  if (isL2 || includeEmptyFolders) add('01_Client_Profile_and_Scope/Shared_Responsibility_Matrix');
  add('02_SSP_and_Control_Implementation');
  add('02_SSP_and_Control_Implementation/SSP');
  add('02_SSP_and_Control_Implementation/Control_Implementation_Matrix');
  add('02_SSP_and_Control_Implementation/Control_Narratives');
  add('02_SSP_and_Control_Implementation/Control_Validation_Summary');
  add('02_SSP_and_Control_Implementation/Control_Readiness_Report');
  add('03_Policies_and_Procedures');
  ['Access_Control', 'Identification_and_Authentication', 'Media_Protection', 'Physical_Protection',
    'System_and_Communications_Protection', 'System_and_Information_Integrity'].forEach(f => add(`03_Policies_and_Procedures/${f}`));
  if (isL2 || includeEmptyFolders) ['Incident_Response', 'Risk_Management', 'Configuration_Management',
    'Audit_and_Accountability', 'Security_Awareness_and_Training', 'Maintenance', 'Personnel_Security',
    'Assessment_and_Monitoring'].forEach(f => add(`03_Policies_and_Procedures/${f}`));
  add('04_Evidence');
  const evFams = (includeEmptyFolders || isL2) ? Object.keys(EVIDENCE_FAMILY_FOLDERS) : LEVEL1_FAMILY_CODES;
  evFams.forEach(code => add(`04_Evidence/${EVIDENCE_FAMILY_FOLDERS[code]}`));
  add('04_Evidence/Other_Supporting_Evidence');
  add('05_Screenshots_and_Exports');
  Object.values(SOURCE_SYSTEM_FOLDERS).forEach(f => add(`05_Screenshots_and_Exports/${f}`));
  add('05_Screenshots_and_Exports/Other_Admin_Centers');
  add('06_Inventory');
  ['User_Inventory', 'Device_Inventory', 'Asset_Inventory', 'System_Component_Inventory', 'Cloud_Services_Inventory',
    'External_Service_Provider_Inventory', 'Mobile_Device_Inventory', 'macOS_Device_Summary'].forEach(f => add(`06_Inventory/${f}`));
  add('07_Assessment_Workpapers');
  ['Evidence_Index', 'Screenshot_Log', 'Export_Log', 'Gap_Report', 'Assessment_Readiness_Report'].forEach(f => add(`07_Assessment_Workpapers/${f}`));
  if (isL2 || includeEmptyFolders) ['POAM', 'Risk_Register', 'Training_Records_Summary', 'Policy_Acknowledgement_Summary'].forEach(f => add(`07_Assessment_Workpapers/${f}`));
  add('08_Final_Attestation_and_Submission');
  add('08_Final_Attestation_and_Submission/SPRS_Self_Assessment_Workpaper');
  add('08_Final_Attestation_and_Submission/Executive_Attestation');
  add('08_Final_Attestation_and_Submission/Self_Certification_Walkthrough');
  if (isL2 || includeEmptyFolders) add('08_Final_Attestation_and_Submission/C3PAO_Handoff_Index');
  add('08_Final_Attestation_and_Submission/Final_Assessment_Summary');
  add('08_Final_Attestation_and_Submission/Final_Readiness_Summary');
  if (includeArchive || includeEmptyFolders) {
    add('99_Archive_and_Superseded');
    add('99_Archive_and_Superseded/Superseded_Documents');
    add('99_Archive_and_Superseded/Old_Evidence');
    add('99_Archive_and_Superseded/Previous_Package_Exports');
  }
  return folders;
}

function evidenceFileName({ controlId, description, sourceSystem, date, ext }) {
  return `${[sanitizeName(controlId || 'GEN', 'GEN'), sanitizeName(description || 'Evidence', 'Evidence'), sanitizeName(sourceSystem || 'Source', 'Source'), date].join('_')}.${(ext || 'png').replace(/[^a-z0-9]/gi, '')}`;
}
function documentFileName({ client, documentType, level, version, date, ext }) {
  return `${[shortClientName(client), sanitizeName(documentType || 'Document', 'Document'), levelTag(level), `v${String(version || 1).replace(/[^0-9]/g, '') || '1'}`, date].join('_')}.${(ext || 'md').replace(/[^a-z0-9]/gi, '')}`;
}
function fileExtFromUrl(url, fallback = 'png') {
  if (!url) return fallback;
  const m = url.split('?')[0].match(/\.([a-z0-9]{2,5})$/i);
  return m ? m[1].toLowerCase() : fallback;
}
function findPlaceholders(text) {
  if (!text) return [];
  const matches = text.match(PLACEHOLDER_REGEX);
  return matches ? [...new Set(matches.map(m => m.replace(/[\[\]]/g, '')))] : [];
}
function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function controlFamilyCode(controlId, family) {
  const m = (controlId || '').match(/^([A-Z]{2})\./);
  if (m) return m[1];
  const fm = (family || '').match(/\b([A-Z]{2})\b/);
  return fm ? fm[1] : null;
}
function isApproved(status) { return status === 'Approved' || status === 'Published'; }

// ---- Internal Pac-Sec authorization (duplicated locally on purpose) ----
// Legacy Client/client_id workflows are internal tools: app-role admin may act on
// any client; app-role technician only on clients listed in their assignment
// string; every other role (including client) is refused before any data read.
function isAssignedClient(user, clientId) {
  const raw = user?.assigned_client_ids;
  const tokens = Array.isArray(raw) ? raw : String(raw == null ? '' : raw).split(',');
  return tokens.map((t) => String(t == null ? '' : t).trim()).filter(Boolean).includes(clientId);
}
function authorizeClientAccess(user, clientId) {
  if (user?.role === 'admin') return null;
  if (user?.role !== 'technician') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  // Unassigned technician → 404 so the endpoint never reveals client existence.
  if (!isAssignedClient(user, clientId)) {
    return Response.json({ error: 'Client not found' }, { status: 404 });
  }
  return null;
}

// Map a generated document to a destination folder within the package.
function docFolder(category) {
  const map = {
    'SSP': '02_SSP_and_Control_Implementation/SSP',
    'Control Matrix': '02_SSP_and_Control_Implementation/Control_Implementation_Matrix',
    'Readiness Report': '02_SSP_and_Control_Implementation/Control_Readiness_Report',
    'Scope Statement': '01_Client_Profile_and_Scope/CMMC_Scope_Statement',
    'Data Flow': '01_Client_Profile_and_Scope/FCI_CUI_Data_Flows',
    'Boundary Description': '01_Client_Profile_and_Scope/System_Boundary',
    'Service Provider Matrix': '01_Client_Profile_and_Scope/Service_Provider_Responsibility',
    'Policy': '03_Policies_and_Procedures',
    'Procedure': '03_Policies_and_Procedures',
    'Evidence Index': '07_Assessment_Workpapers/Evidence_Index',
    'Screenshot Log': '07_Assessment_Workpapers/Screenshot_Log',
    'Export Log': '07_Assessment_Workpapers/Export_Log',
    'Gap Report': '07_Assessment_Workpapers/Gap_Report',
    'POAM': '07_Assessment_Workpapers/POAM',
    'Risk Register': '07_Assessment_Workpapers/Risk_Register',
    'Training Summary': '07_Assessment_Workpapers/Training_Records_Summary',
    'Policy Acknowledgement Summary': '07_Assessment_Workpapers/Policy_Acknowledgement_Summary',
    'Asset Inventory': '06_Inventory/Asset_Inventory',
    'User Inventory': '06_Inventory/User_Inventory',
    'Device Inventory': '06_Inventory/Device_Inventory',
    'System Component Inventory': '06_Inventory/System_Component_Inventory',
    'Cloud Services Inventory': '06_Inventory/Cloud_Services_Inventory',
    'Self-Assessment': '08_Final_Attestation_and_Submission/SPRS_Self_Assessment_Workpaper',
    'Attestation': '08_Final_Attestation_and_Submission/Executive_Attestation',
    'Assessment Summary': '08_Final_Attestation_and_Submission/Final_Assessment_Summary',
    'Handoff Index': '08_Final_Attestation_and_Submission/C3PAO_Handoff_Index',
    'Cover Sheet': '00_Read_Me',
  };
  return map[category] || '07_Assessment_Workpapers/Evidence_Index';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const clientId = body.client_id;
    if (!clientId) return Response.json({ error: 'client_id required' }, { status: 400 });

    // Authorize BEFORE any service-role read/write/upload.
    const denied = authorizeClientAccess(user, clientId);
    if (denied) return denied;

    const level = body.level || 'Level 1';
    const exportMode = body.export_mode || 'Ready-only';
    const includeDrafts = exportMode === 'Draft' || exportMode === 'Full archive' || body.include_drafts === true;
    const includeEmptyFolders = body.include_empty_folders === true;
    const includeArchive = exportMode === 'Full archive' || body.include_archive === true;
    const previewOnly = body.preview_only === true;

    const isL2 = level === 'Level 2' || level === 'Level 2 Ready';
    const sr = base44.asServiceRole;
    const date = new Date().toISOString().split('T')[0];

    const [
      client, allClients, allControls, controlProgress, controlValidations, evidence, screenshots,
      docs, users, devices, systemComponents, dataFlows, externalConnections, serviceProviders,
      poams, risks, training, policyAcks, selfCert, priorExports,
    ] = await Promise.all([
      sr.entities.Client.get(clientId).catch(() => null),
      sr.entities.Client.list().catch(() => []),
      sr.entities.CMMCControl.list('-control_id', 500).catch(() => []),
      sr.entities.ControlProgress.filter({ client_id: clientId }).catch(() => []),
      sr.entities.ControlValidation.filter({ client_id: clientId }).catch(() => []),
      sr.entities.EvidenceItem.filter({ client_id: clientId }).catch(() => []),
      sr.entities.Screenshot.filter({ client_id: clientId }).catch(() => []),
      sr.entities.GeneratedDocument.filter({ client_id: clientId }).catch(() => []),
      sr.entities.UserInventory.filter({ client_id: clientId }).catch(() => []),
      sr.entities.DeviceInventory.filter({ client_id: clientId }).catch(() => []),
      sr.entities.SystemComponent.filter({ client_id: clientId }).catch(() => []),
      sr.entities.DataFlow.filter({ client_id: clientId }).catch(() => []),
      sr.entities.ExternalConnection.filter({ client_id: clientId }).catch(() => []),
      sr.entities.ServiceProviderResponsibility.filter({ client_id: clientId }).catch(() => []),
      sr.entities.POAMItem.filter({ client_id: clientId }).catch(() => []),
      sr.entities.RiskItem.filter({ client_id: clientId }).catch(() => []),
      sr.entities.TrainingRecord.filter({ client_id: clientId }).catch(() => []),
      sr.entities.PolicyAcknowledgement.filter({ client_id: clientId }).catch(() => []),
      sr.entities.SelfCertificationWalkthrough.filter({ client_id: clientId }).catch(() => []),
      sr.entities.PackageExport.filter({ client_id: clientId }, '-generated_date').catch(() => []),
    ]);

    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

    const cuiInScope = client.cui_in_scope === true;
    const otherClientNames = allClients.filter(c => c.id !== clientId).map(c => (c.legal_name || '').toLowerCase().trim()).filter(n => n.length > 3);
    const selName = (client.legal_name || '').toLowerCase();

    // ---- Client isolation: filter out any record whose client_id mismatches ----
    const isolationWarnings = [];
    const mine = (arr, label) => arr.filter(r => {
      if (r.client_id && r.client_id !== clientId) { isolationWarnings.push(`Excluded ${label} record ${r.id} — belongs to a different client`); return false; }
      return true;
    });
    const evItems = mine(evidence, 'evidence');
    const ssItems = mine(screenshots, 'screenshot');
    const docItems = mine(docs, 'document');
    const cpItems = mine(controlProgress, 'control progress');

    // Delta cutoff
    const lastExport = priorExports[0];
    const deltaCutoff = exportMode === 'Delta' && lastExport ? new Date(lastExport.generated_date || lastExport.created_date || 0) : null;
    const afterCutoff = (r) => !deltaCutoff || new Date(r.updated_date || r.created_date || 0) > deltaCutoff;

    // ---- Control families & evidence routing ----
    const progressByCtrl = {};
    cpItems.forEach(p => { if (p.control_id) progressByCtrl[p.control_id] = p; });
    const levelControls = allControls.filter(c => isL2 ? true : c.level === 'Level 1');
    const familyByControl = {};
    allControls.forEach(c => { familyByControl[c.control_id] = controlFamilyCode(c.control_id, c.control_family); });

    // ---- Determine included files ----
    const files = []; // { path, name, kind, meta, fetchUrl?, content? }
    const indexRows = [];

    const documentsAllowed = exportMode !== 'Evidence-only';
    const evidenceAllowed = exportMode !== 'Documents-only';

    // Generated documents
    if (documentsAllowed) {
      docItems.forEach(d => {
        const superseded = d.status === 'Superseded' || d.status === 'Archived' || !!d.superseded_by_document_id;
        if (superseded && !includeArchive) return;
        if (!afterCutoff(d)) return;
        const phs = findPlaceholders(d.body_content);
        const hasPlaceholder = phs.length > 0 && !d.placeholder_waived;
        const approved = isApproved(d.status);
        const clientMismatch = otherClientNames.some(n => (d.body_content || '').toLowerCase().includes(n) && !selName.includes(n));
        let blockerReason = '';
        if (!approved) blockerReason = `Status is ${d.status}, not Approved/Published`;
        else if (hasPlaceholder) blockerReason = `Unresolved placeholders: ${phs.join(', ')}`;
        if (exportMode === 'Ready-only' && blockerReason) return; // excluded from ready-only

        const version = d.version_number || d.version || 1;
        const folder = superseded ? '99_Archive_and_Superseded/Superseded_Documents' : docFolder(d.document_category);
        const name = documentFileName({ client, documentType: d.document_type || d.document_category || d.title, level: d.cmmc_level || level, version, date, ext: 'md' });
        files.push({
          path: `${folder}/${name}`, name, kind: 'document',
          content: `# ${d.title}\n\n${d.body_content || '(no content)'}\n`,
          meta: {
            document_title: d.title, document_type: d.document_type || d.document_category, category: d.document_category,
            control_id: '', control_family: '', source_system: '', source_entity: 'GeneratedDocument', source_record_id: d.id,
            status: d.status, version, approved_by: d.approved_by || '', approval_date: d.approval_date || '',
            generated_date: d.generated_date || '', evidence_review_status: '', placeholder_status: hasPlaceholder ? 'Unresolved' : (d.placeholder_waived && phs.length ? 'Waived' : 'Clean'),
            duplicate_status: d.is_duplicate ? 'Duplicate' : 'Unique', final_package_required: !!d.final_package_required,
            blocker_reason: clientMismatch ? 'Client mismatch detected' : blockerReason, notes: clientMismatch ? 'Body references another client name' : '',
          },
        });
        if (clientMismatch) isolationWarnings.push(`Document "${d.title}" references another client name`);
      });
    }

    // Evidence items
    if (evidenceAllowed) {
      evItems.forEach(e => {
        if (!afterCutoff(e)) return;
        const reviewed = e.reviewer_status === 'Approved';
        if (exportMode === 'Ready-only' && !reviewed) return;
        const fam = familyByControl[e.control_id];
        const folder = fam && EVIDENCE_FAMILY_FOLDERS[fam] ? `04_Evidence/${EVIDENCE_FAMILY_FOLDERS[fam]}` : '04_Evidence/Other_Supporting_Evidence';
        const ext = fileExtFromUrl(e.file_url, 'pdf');
        const name = evidenceFileName({ controlId: e.control_id, description: e.evidence_title, sourceSystem: e.source_system, date: e.upload_date || date, ext });
        files.push({
          path: `${folder}/${name}`, name, kind: 'evidence', fetchUrl: e.file_url,
          meta: {
            document_title: e.evidence_title, document_type: e.evidence_type, category: 'Evidence', control_id: e.control_id || '',
            control_family: fam || '', source_system: e.source_system || '', source_entity: 'EvidenceItem', source_record_id: e.id,
            status: e.reviewer_status, version: 1, approved_by: e.reviewed_by || '', approval_date: '', generated_date: e.upload_date || '',
            evidence_review_status: e.reviewer_status, placeholder_status: 'N/A', duplicate_status: 'Unique',
            final_package_required: !!e.include_in_final_package, blocker_reason: reviewed ? '' : 'Evidence not approved', notes: e.file_url ? '' : 'No file attached',
          },
        });
      });

      // Screenshots & exports
      ssItems.forEach(s => {
        if (!afterCutoff(s)) return;
        const reviewed = s.reviewer_status === 'Approved' || s.validation_status === 'Validated';
        if (exportMode === 'Ready-only' && !reviewed) return;
        const folder = `05_Screenshots_and_Exports/${sourceSystemFolder(s.related_system)}`;
        const ext = fileExtFromUrl(s.file_url, 'png');
        const name = evidenceFileName({ controlId: s.related_control, description: s.description || s.actual_file_name || s.suggested_file_name || 'Screenshot', sourceSystem: s.related_system || 'Admin', date: s.screenshot_date || date, ext });
        files.push({
          path: `${folder}/${name}`, name, kind: 'screenshot', fetchUrl: s.file_url,
          meta: {
            document_title: s.description || s.actual_file_name || 'Screenshot', document_type: 'Screenshot', category: 'Screenshot/Export',
            control_id: s.related_control || '', control_family: familyByControl[s.related_control] || '', source_system: s.related_system || '',
            source_entity: 'Screenshot', source_record_id: s.id, status: s.reviewer_status, version: 1, approved_by: '', approval_date: '',
            generated_date: s.screenshot_date || '', evidence_review_status: s.reviewer_status, placeholder_status: 'N/A', duplicate_status: 'Unique',
            final_package_required: !!s.include_in_final_package, blocker_reason: reviewed ? '' : 'Screenshot not reviewed/validated', notes: s.file_url ? '' : 'No file attached',
          },
        });
      });
    }

    // ---- Generated workpaper tables (always documents side) ----
    if (documentsAllowed && exportMode !== 'Delta') {
      const tableDoc = (folder, type, content, count, srcEntity) => {
        const name = documentFileName({ client, documentType: type, level, version: 1, date, ext: 'csv' });
        files.push({ path: `${folder}/${name}`, name, kind: 'table', content,
          meta: { document_title: type, document_type: type, category: 'Workpaper', control_id: '', control_family: '', source_system: '', source_entity: srcEntity, source_record_id: '', status: 'Generated', version: 1, approved_by: '', approval_date: '', generated_date: date, evidence_review_status: '', placeholder_status: 'Clean', duplicate_status: 'Unique', final_package_required: true, blocker_reason: '', notes: `${count} source record(s)` } });
      };
      // User inventory
      let uc = 'display_name,email,role,mfa_enabled,license_assigned,status\n' + users.map(u => [u.display_name, u.email, u.role, u.mfa_enabled, u.license_assigned, u.status].map(csvCell).join(',')).join('\n');
      tableDoc('06_Inventory/User_Inventory', 'User_Inventory', uc, users.length, 'UserInventory');
      let dc = 'device_name,device_type,os,user_assigned,ninjaone_managed,compliance_status,last_seen\n' + devices.map(d => [d.device_name, d.device_type, d.os, d.user_assigned, d.ninjaone_managed, d.compliance_status, d.last_seen].map(csvCell).join(',')).join('\n');
      tableDoc('06_Inventory/Device_Inventory', 'Device_Inventory', dc, devices.length, 'DeviceInventory');
      let scc = 'component_name,component_type,vendor,handles_fci,handles_cui,in_boundary\n' + systemComponents.map(c => [c.component_name, c.component_type, c.vendor, c.handles_fci, c.handles_cui, c.in_authorization_boundary].map(csvCell).join(',')).join('\n');
      tableDoc('06_Inventory/System_Component_Inventory', 'System_Component_Inventory', scc, systemComponents.length, 'SystemComponent');
      if (isL2) {
        let pc = 'control_id,weakness,remediation,severity,scheduled_completion,status,owner\n' + poams.map(p => [p.control_id, p.weakness_description, p.remediation_plan, p.severity, p.scheduled_completion, p.status, p.owner].map(csvCell).join(',')).join('\n');
        tableDoc('07_Assessment_Workpapers/POAM', 'POAM', pc, poams.length, 'POAMItem');
        let rc = 'risk_description,severity,likelihood,mitigation,status,owner\n' + risks.map(r => [r.risk_description, r.severity, r.likelihood, r.mitigation, r.status, r.owner].map(csvCell).join(',')).join('\n');
        tableDoc('07_Assessment_Workpapers/Risk_Register', 'Risk_Register', rc, risks.length, 'RiskItem');
        let tc = 'user_name,training_name,completion_date,status\n' + training.map(t => [t.user_name, t.training_name, t.completion_date, t.status].map(csvCell).join(',')).join('\n');
        tableDoc('07_Assessment_Workpapers/Training_Records_Summary', 'Training_Records_Summary', tc, training.length, 'TrainingRecord');
        let ac = 'user_name,policy_name,acknowledged,acknowledged_date\n' + policyAcks.map(a => [a.user_name, a.policy_name, a.acknowledged, a.acknowledged_date].map(csvCell).join(',')).join('\n');
        tableDoc('07_Assessment_Workpapers/Policy_Acknowledgement_Summary', 'Policy_Acknowledgement_Summary', ac, policyAcks.length, 'PolicyAcknowledgement');
      }
    }

    // ---- Build index rows from files ----
    files.forEach(f => {
      indexRows.push({
        package_path: f.path, file_name: f.name, document_title: f.meta.document_title || '', document_type: f.meta.document_type || '',
        category: f.meta.category || '', client_name: client.legal_name, client_id: clientId, CMMC_level: level,
        control_id: f.meta.control_id || '', control_family: f.meta.control_family || '', source_system: f.meta.source_system || '',
        source_entity: f.meta.source_entity || '', source_record_id: f.meta.source_record_id || '', status: f.meta.status || '',
        version: f.meta.version || '', approved_by: f.meta.approved_by || '', approval_date: f.meta.approval_date || '',
        generated_date: f.meta.generated_date || '', evidence_review_status: f.meta.evidence_review_status || '',
        placeholder_status: f.meta.placeholder_status || '', duplicate_status: f.meta.duplicate_status || '',
        final_package_required: f.meta.final_package_required ? 'Yes' : 'No', included_in_package: 'Yes',
        blocker_reason: f.meta.blocker_reason || '', notes: f.meta.notes || '',
      });
    });

    // ---- Hard blockers & warnings ----
    const hardBlockers = [];
    const warnings = [];
    const coreDocCategories = isL2
      ? ['SSP', 'Control Matrix', 'Evidence Index', 'Scope Statement', 'POAM', 'Risk Register']
      : ['Scope Statement', 'SSP', 'Control Matrix', 'Evidence Index', 'Self-Assessment'];
    coreDocCategories.forEach(cat => {
      const present = docItems.find(d => d.document_category === cat && isApproved(d.status) && findPlaceholders(d.body_content).filter(() => true).length === 0);
      if (!present) hardBlockers.push(`Required document missing or not approved: ${cat}`);
    });
    const unresolvedPh = docItems.filter(d => findPlaceholders(d.body_content).length > 0 && !d.placeholder_waived);
    if (unresolvedPh.length) hardBlockers.push(`${unresolvedPh.length} document(s) have unresolved placeholders without waiver`);
    const dupConflicts = docItems.filter(d => d.is_duplicate && !d.superseded_by_document_id);
    if (dupConflicts.length) hardBlockers.push(`${dupConflicts.length} unresolved duplicate document conflict(s)`);
    if (isolationWarnings.some(w => w.includes('references another client'))) hardBlockers.push('Client mismatch warnings detected — resolve before assessment export');
    if (evItems.length + ssItems.length === 0) hardBlockers.push('No evidence or screenshots linked to this client');
    const completedControls = levelControls.filter(c => { const p = progressByCtrl[c.control_id]; return p && (p.status === 'Complete' || p.ready_for_assessment); });
    const validatedIds = new Set(controlValidations.filter(v => v.status === 'Validated' || v.validation_status === 'Validated').map(v => v.control_id));
    const completedMissingValidation = completedControls.filter(c => !validatedIds.has(c.control_id));
    if (completedMissingValidation.length) hardBlockers.push(`${completedMissingValidation.length} completed control(s) missing validation records`);
    if (isL2 && cuiInScope) {
      const cuiBoundary = docItems.find(d => /cui.*boundary/i.test(d.title || '') || d.document_category === 'Boundary Description');
      const cuiFlow = dataFlows.find(d => d.data_type === 'CUI' || d.data_type === 'Mixed');
      if (!cuiBoundary) hardBlockers.push('Level 2 with CUI in scope is missing a CUI boundary description');
      if (!cuiFlow) hardBlockers.push('Level 2 with CUI in scope is missing a CUI data flow');
    }

    // Warnings (draft mode)
    if (includeDrafts) warnings.push('Package includes draft documents and unreviewed items');
    const evGaps = levelControls.filter(c => !evItems.some(e => e.control_id === c.control_id) && !ssItems.some(s => s.related_control === c.control_id));
    if (evGaps.length) warnings.push(`${evGaps.length} applicable control(s) have no linked evidence`);
    if (controlValidations.length === 0) warnings.push('No control validation records exist');
    const waivedPh = docItems.filter(d => findPlaceholders(d.body_content).length > 0 && d.placeholder_waived);
    if (waivedPh.length) warnings.push(`${waivedPh.length} document(s) have waived placeholders`);
    if (includeArchive) warnings.push('Package includes superseded/archived content');
    const readyDocs = docItems.filter(d => isApproved(d.status)).length;
    const readinessScore = docItems.length ? Math.round((readyDocs / Math.max(docItems.length, coreDocCategories.length)) * 100) : 0;
    if (readinessScore < 50) warnings.push(`Low readiness score (${readinessScore}%)`);
    isolationWarnings.forEach(w => warnings.push(w));

    const assessmentReady = exportMode === 'Ready-only' && hardBlockers.length === 0;
    const draftLabel = !assessmentReady && exportMode !== 'Ready-only' ? 'DRAFT_NOT_ASSESSMENT_READY' : (hardBlockers.length > 0 ? 'DRAFT_NOT_ASSESSMENT_READY' : '');

    // ---- Folder tree ----
    const folderTree = buildFolderTree({ level, includeEmptyFolders, includeArchive });
    const folderCount = folderTree.length;
    const rootName = rootFolderName(client, level, date);

    // Difference from last package
    const prevFileCount = lastExport?.included_file_count || 0;
    const delta = { prev_file_count: prevFileCount, new_file_count: files.length, difference: files.length - prevFileCount, last_export_date: lastExport?.generated_date || null };

    // ---- Preview short-circuit ----
    const previewPayload = {
      client_name: client.legal_name, client_id: clientId, level, export_mode: exportMode, root_folder_name: rootName,
      folder_tree: folderTree, folder_count: folderCount, files: files.map(f => ({ path: f.path, name: f.name, kind: f.kind, status: f.meta.status, control_id: f.meta.control_id, blocker_reason: f.meta.blocker_reason })),
      estimated_file_count: files.length, hard_blockers: hardBlockers, warnings, assessment_ready: assessmentReady,
      readiness_score: readinessScore, draft_label: draftLabel, isolation_warnings: isolationWarnings, delta,
      index_rows: indexRows.length, cui_in_scope: cuiInScope,
    };
    if (previewOnly) return Response.json(previewPayload);

    if (exportMode === 'Ready-only' && hardBlockers.length > 0) {
      return Response.json({ ...previewPayload, error: 'Ready-only export blocked by hard blockers', blocked: true }, { status: 200 });
    }

    // ---- Build the ZIP ----
    const zip = new JSZip();
    const root = zip.folder(rootName);
    folderTree.forEach(p => root.folder(p)); // ensures empty folders exist (with .keep)
    folderTree.forEach(p => root.file(`${p}/.keep`, ''));

    // README
    const readme = buildReadme({ client, level, date, user, exportMode, includeDrafts, waivedPhCount: waivedPh.length, evGapCount: evGaps.length, draftLabel });
    root.file('00_Read_Me/README_Package_Instructions.md', readme);

    // Change Log
    const changelog = buildChangelog({ date, version: (lastExport?.package_version || 0) + 1, files, docItems, evItems, ssItems, hardBlockers, readinessScore, delta });
    root.file('00_Read_Me/Change_Log.md', changelog);

    // Package Contents Index (CSV)
    const indexCols = ['package_path', 'file_name', 'document_title', 'document_type', 'category', 'client_name', 'client_id', 'CMMC_level', 'control_id', 'control_family', 'source_system', 'source_entity', 'source_record_id', 'status', 'version', 'approved_by', 'approval_date', 'generated_date', 'evidence_review_status', 'placeholder_status', 'duplicate_status', 'final_package_required', 'included_in_package', 'blocker_reason', 'notes'];
    const indexCsv = indexCols.join(',') + '\n' + indexRows.map(r => indexCols.map(c => csvCell(r[c])).join(',')).join('\n');
    root.file('00_Read_Me/Package_Contents_Index.csv', indexCsv);

    // Place generated content + fetched binary files
    let placedFiles = 0;
    for (const f of files) {
      try {
        if (f.content != null) { root.file(f.path, f.content); placedFiles++; }
        else if (f.fetchUrl) {
          const resp = await fetch(f.fetchUrl);
          if (resp.ok) { const buf = await resp.arrayBuffer(); root.file(f.path, buf); placedFiles++; }
          else { root.file(`${f.path}.MISSING.txt`, `Original file could not be retrieved from ${f.fetchUrl}`); }
        } else { root.file(`${f.path}.MISSING.txt`, 'No file attached to this record.'); }
      } catch (err) {
        root.file(`${f.path}.ERROR.txt`, `Failed to include file: ${err.message}`);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipFile = new File([zipBlob], `${rootName}.zip`, { type: 'application/zip' });
    const readmeFile = new File([readme], 'README_Package_Instructions.md', { type: 'text/markdown' });
    const changelogFile = new File([changelog], 'Change_Log.md', { type: 'text/markdown' });
    const indexFile = new File([indexCsv], 'Package_Contents_Index.csv', { type: 'text/csv' });

    const [zipUp, readmeUp, changelogUp, indexUp] = await Promise.all([
      sr.integrations.Core.UploadFile({ file: zipFile }),
      sr.integrations.Core.UploadFile({ file: readmeFile }),
      sr.integrations.Core.UploadFile({ file: changelogFile }),
      sr.integrations.Core.UploadFile({ file: indexFile }),
    ]);

    const exportRecord = await sr.entities.PackageExport.create({
      client_id: clientId, package_name: `${client.legal_name} ${level} ${exportMode} Package`, package_type: level,
      cmmc_level: level, export_mode: exportMode, package_version: (lastExport?.package_version || 0) + 1,
      generated_by: user.full_name || user.email || 'System', generated_date: date,
      zip_file_url: zipUp.file_url, root_folder_name: rootName, included_file_count: placedFiles, included_folder_count: folderCount,
      readiness_score: readinessScore, assessment_ready: assessmentReady, hard_blockers: JSON.stringify(hardBlockers),
      warnings: JSON.stringify(warnings), package_index_url: indexUp.file_url, readme_url: readmeUp.file_url,
      changelog_url: changelogUp.file_url, source_snapshot: JSON.stringify({ documents: docItems.length, evidence: evItems.length, screenshots: ssItems.length, controls: levelControls.length }),
      notes: draftLabel,
    });

    return Response.json({ ...previewPayload, blocked: false, package_export: exportRecord, zip_file_url: zipUp.file_url, readme_url: readmeUp.file_url, changelog_url: changelogUp.file_url, package_index_url: indexUp.file_url, placed_file_count: placedFiles });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

const REPORT_COVER_NOTICE = 'This report and all associated data, analysis, templates, workflows, and generated content are confidential and proprietary to Pacific Global Security Group and/or its authorized client. Use is restricted to authorized business, compliance, and cybersecurity purposes only.';
const REPORT_FOOTER_SHORT = 'Confidential and Proprietary. Prepared by Pacific Global Security Group. Unauthorized access, use, disclosure, copying, or distribution is prohibited.';

function buildReadme({ client, level, date, user, exportMode, includeDrafts, waivedPhCount, evGapCount, draftLabel }) {
  let r = `# CMMC Assessment Package — ${client.legal_name}\n\n`;
  r += `> **CONFIDENTIAL AND PROPRIETARY** — ${REPORT_COVER_NOTICE}\n\n`;
  if (draftLabel) r += `> ⚠️ **${draftLabel}** — This package is a working draft and is NOT ready for formal assessment submission.\n\n`;
  r += `**Client:** ${client.legal_name}${client.dba_name ? ` (${client.dba_name})` : ''}\n\n`;
  r += `**CMMC Target Level:** ${level}\n\n`;
  r += `**Package Generated:** ${date}\n\n`;
  r += `**Generated By:** ${user.full_name || user.email || 'System'}\n\n`;
  r += `**Export Mode:** ${exportMode}\n\n---\n\n`;
  r += `## SharePoint Upload Instructions\n\n`;
  r += `1. Download and unzip this package.\n2. In SharePoint, open the target document library for this client.\n3. Drag the unzipped package root folder directly into the library — the folder structure is already SharePoint-safe.\n4. Do not rename folders; file and folder names follow assessor-friendly naming conventions.\n5. Use **Package_Contents_Index.csv** to verify every included item.\n\n`;
  r += `## Folder Structure\n\n`;
  r += `- **00_Read_Me** — this file, the contents index, and the change log\n- **01_Client_Profile_and_Scope** — scope statement, data flows, system boundary, external connections, service provider responsibility\n- **02_SSP_and_Control_Implementation** — SSP, control implementation matrix, narratives, validation, readiness\n- **03_Policies_and_Procedures** — policy and procedure documents by family\n- **04_Evidence** — evidence organized by CMMC control family\n- **05_Screenshots_and_Exports** — admin-center screenshots and exports by source system\n- **06_Inventory** — user, device, asset, system component, and cloud inventories\n- **07_Assessment_Workpapers** — evidence index, logs, gap report, POA&M, risk register, training\n- **08_Final_Attestation_and_Submission** — SPRS workpaper, attestation, self-certification, final summaries\n- **99_Archive_and_Superseded** — superseded documents and previous exports (if included)\n\n`;
  if (includeDrafts) r += `> ⚠️ **Warning:** This package includes draft documents and/or unreviewed evidence. Review before relying on it for assessment.\n\n`;
  if (waivedPhCount > 0) r += `> ⚠️ **Warning:** ${waivedPhCount} document(s) include waived placeholders. Confirm waivers are appropriate.\n\n`;
  if (evGapCount > 0) r += `> ⚠️ **Warning:** ${evGapCount} applicable control(s) have evidence or validation gaps.\n\n`;
  r += `---\n\n*This package supports CMMC implementation and assessment preparation. It does not replace an independent assessor's review or a C3PAO assessment.*\n\n`;
  r += `---\n\n${REPORT_FOOTER_SHORT}\n`;
  return r;
}

function buildChangelog({ date, version, files, docItems, evItems, ssItems, hardBlockers, readinessScore, delta }) {
  const added = files.filter(f => f.kind === 'document' || f.kind === 'table').map(f => f.name);
  const superseded = docItems.filter(d => d.status === 'Superseded' || d.status === 'Archived').map(d => d.title);
  let c = `# Change Log\n\n`;
  c += `> **CONFIDENTIAL AND PROPRIETARY** — ${REPORT_COVER_NOTICE}\n\n`;
  c += `**Package Generation Date:** ${date}\n\n`;
  c += `**Package Version:** v${version}\n\n`;
  c += `**Readiness Score at Export:** ${readinessScore}%\n\n`;
  c += `**Files in this package:** ${files.length}${delta.last_export_date ? ` (previous export had ${delta.prev_file_count}; difference ${delta.difference >= 0 ? '+' : ''}${delta.difference})` : ''}\n\n---\n\n`;
  c += `## Documents Included (${added.length})\n\n${added.length ? added.map(n => `- ${n}`).join('\n') : '- None'}\n\n`;
  c += `## Evidence Added\n\n- ${evItems.length} evidence item(s)\n- ${ssItems.length} screenshot/export item(s)\n\n`;
  c += `## Superseded Documents (${superseded.length})\n\n${superseded.length ? superseded.map(n => `- ${n}`).join('\n') : '- None'}\n\n`;
  c += `## Blockers at Time of Export (${hardBlockers.length})\n\n${hardBlockers.length ? hardBlockers.map(b => `- ${b}`).join('\n') : '- None'}\n\n`;
  c += `---\n\n${REPORT_FOOTER_SHORT}\n`;
  return c;
}