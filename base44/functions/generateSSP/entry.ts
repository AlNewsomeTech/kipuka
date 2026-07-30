import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PLACEHOLDER_REGEX = /\[([A-Z][A-Z_0-9]{2,})\]/g;

const LEVEL1_CORE_DOCS = [
  { name: 'Scope Statement', category: 'Scope Statement' },
  { name: 'SSP Lite', category: 'SSP' },
  { name: 'Control Matrix', category: 'Control Matrix' },
  { name: 'Evidence Index', category: 'Evidence Index' },
  { name: 'Screenshot Log', category: 'Screenshot Log' },
  { name: 'Access Control Policy', category: 'Policy', match: /access/i },
  { name: 'Identification and Authentication Policy', category: 'Policy', match: /identif|authentic/i },
  { name: 'Media Protection Policy', category: 'Policy', match: /media/i },
  { name: 'Physical Security Policy', category: 'Policy', match: /physical/i },
  { name: 'System and Communications Protection Policy', category: 'Policy', match: /system.*comm|comm.*protect/i },
  { name: 'System and Information Integrity Policy', category: 'Policy', match: /information.*integrity|integrity/i },
  { name: 'SPRS Self-Assessment Workpaper', category: 'Self-Assessment', match: /sprs|self.assess/i },
  { name: 'Executive Attestation', category: 'Attestation', match: /attest/i },
  { name: 'Final Assessment Summary', category: 'Assessment Summary', match: /assessment.*summary|final.*summary/i },
];

const LEVEL2_CORE_DOCS = [
  { name: 'Full SSP', category: 'SSP' },
  { name: 'CUI Data Flow', category: 'Other', match: /cui.*data.*flow|data.*flow/i },
  { name: 'CUI Boundary Description', category: 'Other', match: /cui.*boundary/i },
  { name: 'Asset Inventory', category: 'Asset Inventory', match: /asset/i },
  { name: 'User Inventory', category: 'User Inventory', match: /user.*inventory/i },
  { name: 'Device Inventory', category: 'Device Inventory', match: /device.*inventory/i },
  { name: 'System Component Inventory', category: 'Other', match: /system.*component|component.*inventory/i },
  { name: 'Network/Data Flow Diagram Reference', category: 'Other', match: /network|diagram/i },
  { name: 'Policy Index', category: 'Policy', match: /policy.*index/i },
  { name: 'Control Implementation Matrix', category: 'Control Matrix', match: /control.*implementation|implementation.*matrix/i },
  { name: 'Evidence Index', category: 'Evidence Index' },
  { name: 'POA&M', category: 'POAM', match: /poam|poa&m|plan.*action/i },
  { name: 'Risk Register', category: 'Risk Register', match: /risk.*register/i },
  { name: 'Training Records Summary', category: 'Training Summary', match: /training/i },
  { name: 'Incident Response Summary', category: 'Incident Response', match: /incident/i },
  { name: 'Service Provider Responsibility Matrix', category: 'Service Provider Matrix', match: /service.*provider|provider.*respons/i },
  { name: 'Final Readiness Summary', category: 'Assessment Summary', match: /readiness.*summary|final.*readiness/i },
];

function findPlaceholders(text) {
  if (!text) return [];
  const matches = text.match(PLACEHOLDER_REGEX);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.replace(/[\[\]]/g, '')))];
}

function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }
function safe(s) { return (s && String(s).trim()) || ''; }
function notDoc(m) { return m || 'Not documented in app yet'; }

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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const reqBody = await req.json();
    const clientId = reqBody.client_id;
    if (!clientId) return Response.json({ error: 'client_id required' }, { status: 400 });

    // Authorize BEFORE any service-role read/write/upload.
    const denied = authorizeClientAccess(user, clientId);
    if (denied) return denied;

    const sr = base44.asServiceRole;

    const [
      client, allClients, allControls, controlValidations, tasks, evidence,
      screenshots, docs, templates, devices, users, ninjaEvidence, poams, risks,
      training, policyAcks, selfCert, googleMig, folderItems, assessmentPackages,
      systemLinks, adminLinks, controlProgress, sspRecords, systemComponents, dataFlows,
      externalConnections, serviceProviders
    ] = await Promise.all([
      sr.entities.Client.get(clientId).catch(() => null),
      sr.entities.Client.list().catch(() => []),
      sr.entities.CMMCControl.list('-control_id', 500).catch(() => []),
      sr.entities.ControlValidation.filter({ client_id: clientId }).catch(() => []),
      sr.entities.DeploymentTask.filter({ client_id: clientId }).catch(() => []),
      sr.entities.EvidenceItem.filter({ client_id: clientId }).catch(() => []),
      sr.entities.Screenshot.filter({ client_id: clientId }).catch(() => []),
      sr.entities.GeneratedDocument.filter({ client_id: clientId }).catch(() => []),
      sr.entities.DocumentTemplate.list().catch(() => []),
      sr.entities.DeviceInventory.filter({ client_id: clientId }).catch(() => []),
      sr.entities.UserInventory.filter({ client_id: clientId }).catch(() => []),
      sr.entities.NinjaOneEvidence.filter({ client_id: clientId }).catch(() => []),
      sr.entities.POAMItem.filter({ client_id: clientId }).catch(() => []),
      sr.entities.RiskItem.filter({ client_id: clientId }).catch(() => []),
      sr.entities.TrainingRecord.filter({ client_id: clientId }).catch(() => []),
      sr.entities.PolicyAcknowledgement.filter({ client_id: clientId }).catch(() => []),
      sr.entities.SelfCertificationWalkthrough.filter({ client_id: clientId }).catch(() => []),
      sr.entities.GoogleMigration.filter({ client_id: clientId }).catch(() => []),
      sr.entities.FolderItem.filter({ client_id: clientId }).catch(() => []),
      sr.entities.AssessmentPackage.filter({ client_id: clientId }).catch(() => []),
      sr.entities.SystemLink.filter({ client_id: clientId }).catch(() => []),
      sr.entities.AdminCenterLink.list().catch(() => []),
      sr.entities.ControlProgress.filter({ client_id: clientId }).catch(() => []),
      sr.entities.SSPRecord.filter({ client_id: clientId }).catch(() => []),
      sr.entities.SystemComponent.filter({ client_id: clientId }).catch(() => []),
      sr.entities.DataFlow.filter({ client_id: clientId }).catch(() => []),
      sr.entities.ExternalConnection.filter({ client_id: clientId }).catch(() => []),
      sr.entities.ServiceProviderResponsibility.filter({ client_id: clientId }).catch(() => []),
    ]);

    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

    const targetLevel = reqBody.ssp_level_override || client.target_cmmc_level || 'Level 1';
    const isLevel2 = targetLevel === 'Level 2' || targetLevel === 'Level 2 Ready';
    const cuiInScope = client.cui_in_scope === true;
    const fciInScope = client.fci_in_scope === true;
    const cloudOnly = client.cloud_only === true;
    const hasPhysicalLocation = client.has_physical_location === true && !cloudOnly;

    // Overlay per-client control progress onto the shared control definitions.
    // Global CMMCControl records are definitions only; they must never imply client completion.
    const progressByCtrl = {};
    controlProgress.forEach(p => { if (p.control_id) progressByCtrl[p.control_id] = p; });
    const defaultProgress = {
      status: 'Not Started', assigned_owner: '', control_narrative: '', reviewer_notes: '',
      ready_for_assessment: false, evidence_count: 0, screenshot_count: 0, export_count: 0,
    };
    const overlay = (c) => {
      const p = progressByCtrl[c.control_id];
      return {
        ...c,
        ...defaultProgress,
        ...(p ? {
          status: p.status || defaultProgress.status,
          ready_for_assessment: p.ready_for_assessment === true,
          control_narrative: p.control_narrative || '',
          reviewer_notes: p.reviewer_notes || '',
          assigned_owner: p.assigned_owner || '',
          evidence_count: p.evidence_count || 0,
          screenshot_count: p.screenshot_count || 0,
          export_count: p.export_count || 0,
        } : {}),
      };
    };
    const l1Controls = allControls.filter(c => c.level === 'Level 1').map(overlay);
    const l2Controls = allControls.filter(c => c.level === 'Level 2').map(overlay);
    const levelControls = isLevel2 ? [...l1Controls, ...l2Controls] : l1Controls;

    // Evidence linkage helpers
    const evByCtrl = {}, ssByCtrl = {}, valByCtrl = {}, poamByCtrl = {};
    evidence.forEach(e => { if (e.control_id) (evByCtrl[e.control_id] = evByCtrl[e.control_id] || []).push(e); });
    screenshots.forEach(s => { if (s.related_control) (ssByCtrl[s.related_control] = ssByCtrl[s.related_control] || []).push(s); });
    controlValidations.forEach(v => { if (v.control_id) (valByCtrl[v.control_id] = valByCtrl[v.control_id] || []).push(v); });
    poams.forEach(p => { if (p.control_id) (poamByCtrl[p.control_id] = poamByCtrl[p.control_id] || []).push(p); });

    // Control narratives
    const controlNarratives = levelControls.map(c => {
      const ev = evByCtrl[c.control_id] || [], ss = ssByCtrl[c.control_id] || [];
      const val = valByCtrl[c.control_id] || [], poam = poamByCtrl[c.control_id] || [];
      const hasNarr = safe(c.control_narrative).length > 0;
      const hasEv = ev.length > 0 || ss.length > 0;
      const validated = val.some(v => v.status === 'Validated');
      let impl = 'Not Started';
      if (c.status === 'Complete' || c.ready_for_assessment) impl = 'Implemented';
      else if (c.status === 'Reviewed') impl = 'Implemented';
      else if (c.status === 'Ready for Review') impl = hasEv ? 'Partially Implemented' : 'Planned';
      else if (c.status === 'In Progress' || c.status === 'Evidence Needed') impl = hasEv ? 'Partially Implemented' : 'Planned';
      return {
        control_id: c.control_id, control_title: c.control_title, family: c.control_family, level: c.level,
        implementation_status: impl, implementation_narrative: hasNarr ? c.control_narrative : notDoc(''),
        responsible_owner: safe(c.assigned_owner) || 'Not assigned',
        evidence_items: ev.length, screenshots: ss.length, validations: val.length, validated,
        poam_items: poam.length, reviewer_notes: safe(c.reviewer_notes) || '',
        ready_for_assessment: c.ready_for_assessment === true, has_narrative: hasNarr, has_evidence: hasEv,
      };
    });

    const narrativesByFamily = {};
    controlNarratives.forEach(n => { (narrativesByFamily[n.family || 'Uncategorized'] = narrativesByFamily[n.family || 'Uncategorized'] || []).push(n); });

    // Scores
    const withNarr = controlNarratives.filter(c => c.has_narrative).length;
    const withEv = controlNarratives.filter(c => c.has_evidence).length;
    const controlNarrScore = pct(withNarr, levelControls.length);
    const evidenceScore = pct(withEv, levelControls.length);
    const inventoryScore = pct((users.length > 0 ? 1 : 0) + (devices.length > 0 ? 1 : 0) + (systemComponents.length > 0 ? 1 : 0), 3);
    const policyDocs = docs.filter(d => d.document_category === 'Policy' || /policy/i.test(d.title || ''));
    const reqPolicyCount = isLevel2 ? 14 : 6;
    const policyScore = pct(Math.min(policyDocs.length, reqPolicyCount), reqPolicyCount);
    const l1Complete = l1Controls.filter(c => c.status === 'Complete' || c.ready_for_assessment).length;
    const l1Ev = l1Controls.filter(c => (evByCtrl[c.control_id] || []).length > 0 || (ssByCtrl[c.control_id] || []).length > 0).length;
    const level1Readiness = pct(l1Complete + l1Ev, l1Controls.length * 2);
    let level2Readiness = 0;
    if (isLevel2) {
      const l2Complete = l2Controls.filter(c => c.status === 'Complete' || c.ready_for_assessment).length;
      const l2Ev = l2Controls.filter(c => (evByCtrl[c.control_id] || []).length > 0 || (ssByCtrl[c.control_id] || []).length > 0).length;
      const cuiScore = cuiInScope ? 1 : 0;
      const poamScore = poams.length > 0 ? 1 : 0;
      level2Readiness = pct(l2Complete + l2Ev + cuiScore + poamScore, l2Controls.length * 2 + 2);
    }
    const approvedDocs = docs.filter(d => d.status === 'Approved' || d.status === 'Published').length;
    const pkgDocs = docs.filter(d => d.include_in_final_package).length;
    let finalPkgReadiness = 0;
    const completeness = Math.round((controlNarrScore + evidenceScore + inventoryScore + policyScore) / 4);

    // Gaps
    const gaps = [];
    if (!safe(client.poc_name)) gaps.push({ category: 'Client Details', description: 'Primary point of contact name is missing', severity: 'High' });
    if (!safe(client.poc_email)) gaps.push({ category: 'Client Details', description: 'Primary point of contact email is missing', severity: 'High' });
    if (!safe(client.executive_sponsor)) gaps.push({ category: 'Client Details', description: 'Executive sponsor is missing', severity: 'Medium' });
    if (!safe(client.primary_domain)) gaps.push({ category: 'Client Details', description: 'Primary domain is missing', severity: 'High' });
    if (users.length === 0) gaps.push({ category: 'User Inventory', description: 'No users inventoried — user inventory is empty', severity: 'High' });
    if (devices.length === 0) gaps.push({ category: 'Device Inventory', description: 'No devices inventoried — device inventory is empty', severity: 'High' });
    if (evidence.length === 0) gaps.push({ category: 'Evidence', description: 'No evidence items uploaded — evidence index is empty', severity: 'Critical' });
    if (screenshots.length === 0) gaps.push({ category: 'Screenshots', description: 'No screenshots uploaded — screenshot log is empty', severity: 'Critical' });
    const noNarr = levelControls.filter(c => !safe(c.control_narrative));
    if (noNarr.length > 0) gaps.push({ category: 'Control Narratives', description: `${noNarr.length} of ${levelControls.length} controls are missing implementation narratives`, severity: 'High' });
    if (policyDocs.length === 0) gaps.push({ category: 'Policy Documents', description: 'No policy documents generated yet', severity: 'High' });
    if (controlValidations.length === 0) gaps.push({ category: 'Validation Records', description: 'No control validation records entered', severity: 'Medium' });
    if (isLevel2 && !cuiInScope) gaps.push({ category: 'CUI Scope', description: 'Target level is Level 2 but CUI is not marked in scope — CUI boundary details required', severity: 'Critical' });
    if (isLevel2 && cuiInScope && systemComponents.filter(c => c.handles_cui).length === 0) gaps.push({ category: 'CUI Boundary', description: 'CUI is in scope but no system components are marked as handling CUI', severity: 'High' });
    if (externalConnections.length === 0) gaps.push({ category: 'External Connections', description: 'No external connections documented', severity: 'Medium' });
    if (serviceProviders.length === 0) gaps.push({ category: 'Service Provider Responsibility', description: 'No service provider responsibility notes documented', severity: isLevel2 ? 'High' : 'Medium' });
    if (poams.length === 0 && isLevel2) gaps.push({ category: 'POA&M', description: 'No POA&M items documented — required for Level 2', severity: 'Medium' });
    if (systemComponents.length === 0) gaps.push({ category: 'System Components', description: 'No system components documented for authorization boundary', severity: 'High' });
    if (dataFlows.length === 0) gaps.push({ category: 'Data Flows', description: 'No data flows documented', severity: isLevel2 ? 'High' : 'Medium' });
    if (training.length === 0) gaps.push({ category: 'Training', description: 'No training records documented', severity: 'Medium' });
    if (!cloudOnly && !hasPhysicalLocation) gaps.push({ category: 'Physical Scope', description: 'Physical location scope not determined — mark client as Cloud Only or document an in-scope physical location', severity: 'High' });
    if (hasPhysicalLocation && !safe(client.physical_location_description)) gaps.push({ category: 'Physical Protection', description: 'Client has an in-scope physical location but no facility/physical protection description is documented', severity: 'High' });
    if (cloudOnly && serviceProviders.length === 0) gaps.push({ category: 'Inherited Physical Controls', description: 'Cloud-only client — Physical Protection controls must be documented as inherited from the cloud provider in the Service Provider Responsibility Matrix', severity: 'High' });

    // Placeholders
    const placeholderIssues = [];
    docs.forEach(d => {
      const phs = findPlaceholders(d.body_content);
      if (phs.length > 0 && !d.placeholder_waived) placeholderIssues.push({ document_id: d.id, title: d.title, placeholders: phs, version: d.version });
    });

    // Duplicates
    const dupGroups = {};
    docs.forEach(d => { const k = `${d.title}||${d.template_id || ''}||${d.version || ''}`; (dupGroups[k] = dupGroups[k] || []).push(d); });
    const duplicates = [];
    Object.values(dupGroups).forEach(g => { if (g.length > 1) g.forEach((d, i) => { if (i > 0) duplicates.push({ document_id: d.id, title: d.title, version: d.version, duplicate_of: g[0].id, duplicate_of_title: g[0].title }); }); });

    // Client mismatches
    const otherNames = allClients.filter(c => c.id !== clientId).map(c => safe(c.legal_name)).filter(n => n.length > 2);
    const selName = safe(client.legal_name);
    const mismatches = [];
    const checkMis = (text, entity, rid, field) => {
      if (!text) return;
      const lower = text.toLowerCase();
      otherNames.forEach(name => { if (name.length > 3 && lower.includes(name.toLowerCase()) && !selName.toLowerCase().includes(name.toLowerCase())) mismatches.push({ entity, record_id: rid, field, mismatched_name: name, expected_client: selName }); });
    };
    tasks.forEach(t => { checkMis(t.title, 'DeploymentTask', t.id, 'title'); checkMis(t.instructions, 'DeploymentTask', t.id, 'instructions'); checkMis(t.notes, 'DeploymentTask', t.id, 'notes'); });
    docs.forEach(d => { checkMis(d.title, 'GeneratedDocument', d.id, 'title'); checkMis(d.body_content, 'GeneratedDocument', d.id, 'body_content'); });

    // Final package
    const coreDocs = isLevel2 ? LEVEL2_CORE_DOCS : LEVEL1_CORE_DOCS;
    const finalPackage = coreDocs.map(req => {
      let match = req.match ? docs.find(d => req.match.test(d.title || '') || d.document_category === req.category) : docs.find(d => d.document_category === req.category);
      return { name: req.name, category: req.category, present: !!match, document_id: match?.id || null, status: match?.status || 'Missing', include_in_final_package: match?.include_in_final_package || false, has_placeholders: match ? findPlaceholders(match.body_content).length > 0 : false };
    });
    const docReadyCount = finalPackage.filter(d => d.present && (d.status === 'Approved' || d.status === 'Published') && !d.has_placeholders).length;
    const validatedControlIds = new Set(controlValidations.filter(v => v.status === 'Validated' || v.validation_status === 'Validated').map(v => v.control_id).filter(Boolean));
    const controlsMissingEvidence = levelControls.filter(c => (evByCtrl[c.control_id] || []).length === 0 && (ssByCtrl[c.control_id] || []).length === 0);
    const completedControlsMissingValidation = levelControls.filter(c => (c.status === 'Complete' || c.ready_for_assessment) && !validatedControlIds.has(c.control_id));
    const unreviewedEvidence = evidence.filter(e => e.reviewer_status !== 'Approved').length + screenshots.filter(s => s.reviewer_status !== 'Approved' && s.validation_status !== 'Validated').length;
    const packageBlockers = [];
    if (docReadyCount < finalPackage.length) packageBlockers.push(`${finalPackage.length - docReadyCount} required document(s) missing approval or not generated`);
    if (placeholderIssues.length > 0) packageBlockers.push(`${placeholderIssues.length} document(s) contain unresolved placeholders`);
    if (evidence.length + screenshots.length === 0) packageBlockers.push('No evidence or screenshots are linked to this client');
    if (controlsMissingEvidence.length > 0) packageBlockers.push(`${controlsMissingEvidence.length} applicable control(s) have no linked evidence`);
    if (unreviewedEvidence > 0) packageBlockers.push(`${unreviewedEvidence} evidence item(s) are not approved or validated`);
    if (controlValidations.length === 0) packageBlockers.push('No control validation records exist');
    if (completedControlsMissingValidation.length > 0) packageBlockers.push(`${completedControlsMissingValidation.length} completed control(s) are missing validation records`);
    const packageReady = packageBlockers.length === 0;
    finalPkgReadiness = packageReady ? pct(docReadyCount, finalPackage.length) : 0;

    // Section checklist
    const today = new Date().toISOString().split('T')[0];
    const sectionChecklist = [
      { section_name: 'System Description', category: 'Boundary', source_entities: 'Client', source_count: 1, status: safe(client.legal_name) ? 'Complete' : 'Gap', missing: '' },
      { section_name: 'FCI Scope', category: 'Scope', source_entities: 'Client', source_count: fciInScope ? 1 : 0, status: fciInScope ? 'Complete' : 'Gap', missing: fciInScope ? '' : 'FCI scope not confirmed' },
      { section_name: 'CUI Scope', category: 'Scope', source_entities: 'Client, SystemComponent', source_count: (cuiInScope ? 1 : 0) + systemComponents.filter(c => c.handles_cui).length, status: isLevel2 && cuiInScope ? (systemComponents.filter(c => c.handles_cui).length > 0 ? 'Complete' : 'Gap') : (isLevel2 ? 'Gap' : 'Complete'), missing: isLevel2 && !cuiInScope ? 'CUI not in scope for Level 2' : '' },
      { section_name: 'System Boundary', category: 'Boundary', source_entities: 'SystemComponent', source_count: systemComponents.length, status: systemComponents.length > 0 ? 'Complete' : 'Gap', missing: systemComponents.length === 0 ? 'No system components documented' : '' },
      { section_name: 'User Inventory', category: 'Inventory', source_entities: 'UserInventory', source_count: users.length, status: users.length > 0 ? 'Complete' : 'Gap', missing: users.length === 0 ? 'No users inventoried' : '' },
      { section_name: 'Device Inventory', category: 'Inventory', source_entities: 'DeviceInventory', source_count: devices.length, status: devices.length > 0 ? 'Complete' : 'Gap', missing: devices.length === 0 ? 'No devices inventoried' : '' },
      { section_name: 'Data Flows', category: 'Boundary', source_entities: 'DataFlow', source_count: dataFlows.length, status: dataFlows.length > 0 ? 'Complete' : 'Gap', missing: dataFlows.length === 0 ? 'No data flows documented' : '' },
      { section_name: 'External Connections', category: 'Boundary', source_entities: 'ExternalConnection', source_count: externalConnections.length, status: externalConnections.length > 0 ? 'Complete' : 'Gap', missing: externalConnections.length === 0 ? 'No external connections documented' : '' },
      { section_name: 'Service Provider Responsibilities', category: 'Shared Responsibility', source_entities: 'ServiceProviderResponsibility', source_count: serviceProviders.length, status: serviceProviders.length > 0 ? 'Complete' : 'Gap', missing: serviceProviders.length === 0 ? 'No service provider responsibilities documented' : '' },
      { section_name: 'Control Implementation', category: 'Controls', source_entities: 'CMMCControl', source_count: levelControls.length, status: withNarr === levelControls.length ? 'Complete' : 'Gap', missing: `${levelControls.length - withNarr} controls missing narratives` },
      { section_name: 'Evidence Index', category: 'Evidence', source_entities: 'EvidenceItem, Screenshot', source_count: evidence.length + screenshots.length, status: (evidence.length + screenshots.length) > 0 ? 'Complete' : 'Gap', missing: (evidence.length + screenshots.length) === 0 ? 'No evidence uploaded' : '' },
      { section_name: 'Policy Documents', category: 'Policies', source_entities: 'GeneratedDocument', source_count: policyDocs.length, status: policyDocs.length >= reqPolicyCount ? 'Complete' : 'Gap', missing: `${Math.max(0, reqPolicyCount - policyDocs.length)} policy documents missing` },
      { section_name: 'POA&M', category: 'POAM', source_entities: 'POAMItem', source_count: poams.length, status: poams.length > 0 ? 'Complete' : (isLevel2 ? 'Gap' : 'Complete'), missing: poams.length === 0 && isLevel2 ? 'No POA&M items' : '' },
      { section_name: 'Risk Register', category: 'Risk', source_entities: 'RiskItem', source_count: risks.length, status: risks.length > 0 ? 'Complete' : 'Gap', missing: risks.length === 0 ? 'No risk items documented' : '' },
      { section_name: 'Training Records', category: 'Training', source_entities: 'TrainingRecord', source_count: training.length, status: training.length > 0 ? 'Complete' : 'Gap', missing: training.length === 0 ? 'No training records' : '' },
      { section_name: 'Self-Certification', category: 'Attestation', source_entities: 'SelfCertificationWalkthrough', source_count: selfCert.length, status: selfCert.length > 0 ? 'Complete' : 'Gap', missing: selfCert.length === 0 ? 'No self-certification walkthrough' : '' },
      { section_name: 'Physical Protection Scope', category: 'Boundary', source_entities: 'Client', source_count: cloudOnly || hasPhysicalLocation ? 1 : 0, status: cloudOnly ? 'Complete' : (hasPhysicalLocation ? (safe(client.physical_location_description) ? 'Complete' : 'Gap') : 'Gap'), missing: cloudOnly ? '' : (hasPhysicalLocation ? (safe(client.physical_location_description) ? '' : 'No facility description') : 'Physical scope not determined') },
    ];

    const traceability = sectionChecklist.map(s => ({ section: s.section_name, source_entity: s.source_entities, records_used: s.source_count, missing_records: s.missing, status: s.status, last_updated: today }));

    // Build SSP body
    const levelLabel = isLevel2 ? 'CMMC Level 2' : 'CMMC Level 1';
    const sspType = isLevel2 ? 'System Security Plan (Full)' : 'Scope and Security Plan (SSP Lite)';
    const scopeType = cuiInScope ? 'CUI' : (fciInScope ? 'FCI' : 'Not yet determined');

    let b = `# ${levelLabel} ${sspType}\n\n`;
    b += `**Client:** ${client.legal_name}${client.dba_name ? ' (' + client.dba_name + ')' : ''}\n\n`;
    b += `**System Name:** ${safe(client.legal_name) || '[CLIENT_NAME]'} CMMC Environment\n\n`;
    b += `**Target Level:** ${targetLevel}\n\n`;
    b += `**Data Scope:** ${scopeType}${cuiInScope ? ' (CUI in scope)' : ''}${fciInScope && !cuiInScope ? ' (FCI in scope)' : ''}\n\n`;
    b += `**Version:** 1.0\n\n**Date:** ${today}\n\n**Generated By:** ${user.full_name || user.email || 'System'}\n\n---\n\n`;

    b += `## 1. System Description\n\n${notDoc(safe(client.notes) || '')}\n\n`;
    b += `**Primary Domain:** ${safe(client.primary_domain) || 'Not documented in app yet'}\n\n`;
    b += `**M365 Tenant:** ${safe(client.ms_tenant_domain) || 'Not documented in app yet'}\n\n`;
    b += `**Environment Type:** ${client.environment_type || 'Not documented in app yet'}\n\n`;
    b += `**Deployment Model:** ${cloudOnly ? 'Cloud Only — no in-scope on-premise/physical infrastructure' : (hasPhysicalLocation ? 'Includes an in-scope physical location/facility' : 'Physical location scope not yet determined')}\n\n`;

    b += `### Physical Protection & Facilities\n\n`;
    if (cloudOnly) {
      b += `This system is **Cloud Only**. There is no in-scope on-premise/physical infrastructure. Physical Protection family controls are **inherited from the cloud service provider** (e.g. Microsoft 365 / Azure data-center physical security) and are documented in the Service Provider Responsibility & Inherited Controls section rather than implemented on-site. End-user devices accessing the environment are governed by endpoint and access controls.\n\n`;
    } else if (hasPhysicalLocation) {
      b += `This system includes an **in-scope physical location**. Physical Protection family controls are implemented on-site and require local evidence.\n\n`;
      b += `**Physical Location:** ${safe(client.physical_location_description) || 'Not documented in app yet — describe the in-scope facility, access controls, and equipment.'}\n\n`;
    } else {
      b += `Physical location scope has not been determined. **Gap:** Confirm whether this client is Cloud Only or has an in-scope physical location so Physical Protection controls can be correctly scoped.\n\n`;
    }

    b += `## 2. Authorization Boundary\n\n`;
    if (systemComponents.length > 0) {
      b += `The following system components are within the authorization boundary:\n\n`;
      systemComponents.forEach(c => { b += `- **${c.component_name}** (${c.component_type || 'Unknown'}): ${safe(c.description) || 'No description'}${c.handles_cui ? ' — handles CUI' : (c.handles_fci ? ' — handles FCI' : '')}\n`; });
    } else { b += `Not documented in app yet — no system components have been entered.\n\n**Gap:** System component inventory is required to define the authorization boundary.\n`; }
    b += `\n`;

    b += `## 3. Data Scope\n\n### FCI Scope\n\n${fciInScope ? 'FCI is in scope for this system.' : 'FCI scope not confirmed.'}\n\n`;
    if (isLevel2) {
      b += `### CUI Scope\n\n${cuiInScope ? 'CUI is in scope for this system.' : 'CUI is NOT in scope. **Warning:** Level 2 SSP requires CUI scope to be defined.'}\n\n`;
      b += `### CUI Data Flow\n\n`;
      const cuiFlows = dataFlows.filter(d => d.data_type === 'CUI' || d.data_type === 'Mixed');
      if (cuiFlows.length > 0) { b += `The following CUI data flows have been documented:\n\n`; cuiFlows.forEach(d => { b += `- **${d.flow_name}:** ${safe(d.source_system) || 'Unknown'} → ${safe(d.destination_system) || 'Unknown'} via ${safe(d.protocol) || 'unspecified protocol'}${d.encryption_in_transit ? ' (encrypted)' : ''}\n`; }); }
      else b += `Not documented in app yet — no CUI data flows have been entered.\n`;
      b += `\n`;
    }

    b += `## 4. User Inventory\n\n`;
    if (users.length > 0) {
      b += `**Total Users:** ${users.length}\n\n| Name | Email | Role | MFA | Status |\n|------|-------|------|-----|--------|\n`;
      users.slice(0, 50).forEach(u => { b += `| ${safe(u.display_name)} | ${safe(u.email)} | ${safe(u.role) || '—'} | ${u.mfa_enabled ? '✅' : '❌'} | ${u.status || '—'} |\n`; });
      if (users.length > 50) b += `\n*...and ${users.length - 50} more users*\n`;
    } else { b += `Not documented in app yet — user inventory is empty.\n\n**Gap:** User inventory is required for the SSP.\n`; }
    b += `\n`;

    b += `## 5. Device Inventory\n\n`;
    if (devices.length > 0) {
      b += `**Total Devices:** ${devices.length}\n\n| Device | Type | OS | User | NinjaOne | Compliance |\n|--------|------|----|------|----------|------------|\n`;
      devices.slice(0, 50).forEach(d => { b += `| ${safe(d.device_name)} | ${d.device_type || '—'} | ${safe(d.os) || '—'} | ${safe(d.user_assigned) || '—'} | ${d.ninjaone_managed ? '✅' : '❌'} | ${d.compliance_status || '—'} |\n`; });
    } else { b += `Not documented in app yet — device inventory is empty.\n\n**Gap:** Device inventory is required for the SSP.\n`; }
    b += `\n`;

    b += `## 6. External Connections\n\n`;
    if (externalConnections.length > 0) externalConnections.forEach(c => { b += `- **${c.connection_name}:** ${safe(c.external_system) || 'Unknown'} — ${safe(c.data_exchanged) || 'No data description'}\n`; });
    else b += `Not documented in app yet — no external connections have been entered.\n`;
    b += `\n`;

    b += `## 7. Service Provider Responsibilities & Inherited Controls\n\n`;
    if (serviceProviders.length > 0) {
      serviceProviders.forEach(sp => {
        b += `### ${sp.provider_name} (${sp.service_type || 'Service Provider'})\n\n`;
        b += `**Services Used:** ${safe(sp.services_used) || 'Not documented'}\n\n`;
        b += `**CMMC Controls Supported:** ${safe(sp.cmmc_controls_supported) || 'Not documented'}\n\n`;
        b += `**Client Responsibilities:** ${safe(sp.client_responsibilities) || 'Not documented'}\n\n`;
        b += `**Provider Responsibilities:** ${safe(sp.provider_responsibilities) || 'Not documented'}\n\n`;
        b += `**Inheritance Notes:** ${safe(sp.inheritance_notes) || 'Not documented'}\n\n`;
      });
    } else {
      b += `Not documented in app yet — no service provider responsibilities have been entered.\n\n`;
      b += `**Note:** Microsoft 365, NinjaOne${client.cortex_xdr_in_scope ? ', Cortex XDR' : ''} and other third-party providers support CMMC control implementation through inherited/shared controls. These must be documented.\n`;
    }
    b += `\n`;

    let secNum = 8;
    if (isLevel2) {
      b += `## 8. Cloud Services Summary\n\nMicrosoft 365 (E5: ${client.ms_license_level || 'Not documented'}) serves as the primary cloud platform. Entra ID provides identity and access management. Exchange provides email services. SharePoint provides collaboration and evidence storage. ${client.ninjaone_in_scope ? 'NinjaOne provides endpoint management and monitoring. ' : ''}${client.cortex_xdr_in_scope ? 'Cortex XDR provides endpoint detection and response. ' : ''}\n\n`;
      secNum = 9;
      if (client.mac_heavy) { b += `## 9. macOS Environment Notes\n\nThis environment is macOS-heavy (${client.macos_devices_count || 0} macOS devices, ${client.windows_devices_count || 0} Windows devices). Mobile device management for non-Windows devices is handled via NinjaOne MDM.\n\n`; secNum = 10; }
      if (googleMig.length > 0) { b += `## ${secNum}. Google Migration Notes\n\n`; googleMig.forEach(g => { b += `Migration from ${safe(g.source_domain) || 'Google Workspace'} to ${safe(g.destination_tenant) || 'M365'}: ${g.gmail_status}, ${g.drive_status}, ${g.calendar_status}\n`; }); b += `\n`; secNum++; }
    }

    b += `## ${secNum}. Control Implementation Matrix\n\nThe following ${levelControls.length} ${levelLabel} controls are applicable to this system:\n\n`;
    Object.keys(narrativesByFamily).sort().forEach(fam => {
      b += `### ${fam}\n\n`;
      narrativesByFamily[fam].forEach(n => {
        b += `#### ${n.control_id}: ${n.control_title}\n\n`;
        b += `**Implementation Status:** ${n.implementation_status}\n\n`;
        b += `**Responsible Owner:** ${n.responsible_owner}\n\n`;
        b += `**Implementation Narrative:**\n\n${n.implementation_narrative}\n\n`;
        b += `**Evidence:** ${n.evidence_items} evidence item(s), ${n.screenshots} screenshot(s)\n\n`;
        b += `**Validation:** ${n.validations} validation record(s)${n.validated ? ' (validated ✅)' : ''}\n\n`;
        if (n.poam_items > 0) b += `**POA&M Items:** ${n.poam_items} open item(s)\n\n`;
        if (n.reviewer_notes) b += `**Reviewer Notes:** ${n.reviewer_notes}\n\n`;
        b += `**Ready for Assessment:** ${n.ready_for_assessment ? 'Yes ✅' : 'No ❌'}\n\n`;
      });
    });
    secNum++;

    b += `---\n\n## ${secNum}. Evidence Index\n\n`;
    if (evidence.length > 0) {
      b += `**Total Evidence Items:** ${evidence.length}\n\n`;
      evidence.slice(0, 30).forEach(e => { b += `- **${e.evidence_title}** (${e.evidence_type || 'Screenshot'}) — ${e.source_system || 'Unknown source'} — ${e.reviewer_status || 'Not Reviewed'}\n`; });
      if (evidence.length > 30) b += `\n*...and ${evidence.length - 30} more evidence items*\n`;
    } else { b += `Not documented in app yet — no evidence items have been uploaded.\n\n**Gap:** Evidence is required to substantiate control implementation.\n`; }
    b += `\n`; secNum++;

    b += `## ${secNum}. Screenshot Log\n\n`;
    if (screenshots.length > 0) {
      b += `**Total Screenshots:** ${screenshots.length}\n\n`;
      screenshots.slice(0, 30).forEach(s => { b += `- ${safe(s.actual_file_name) || safe(s.suggested_file_name) || 'Untitled'} — ${s.related_control || 'No control mapped'} — ${s.validation_status || 'Not Started'}\n`; });
    } else { b += `Not documented in app yet — no screenshots have been uploaded.\n\n**Gap:** Screenshots are required as primary evidence.\n`; }
    b += `\n`; secNum++;

    b += `## ${secNum}. POA&M Summary\n\n`;
    if (poams.length > 0) { b += `**Total Open POA&M Items:** ${poams.length}\n\n`; poams.forEach(p => { b += `- **${p.weakness_description}** — ${p.severity} — ${p.status}\n`; }); }
    else b += `No POA&M items documented${isLevel2 ? ' — POA&M is required for Level 2' : ''}.\n`;
    b += `\n`; secNum++;

    b += `## ${secNum}. Risk Register\n\n`;
    if (risks.length > 0) risks.forEach(r => { b += `- **${r.risk_description}** — ${r.severity} — ${r.status}\n`; });
    else b += `No risk items documented.\n`;
    b += `\n`; secNum++;

    b += `## ${secNum}. Training Records\n\n`;
    if (training.length > 0) { b += `**Total Training Records:** ${training.length}\n\n`; training.forEach(t => { b += `- ${t.user_name} — ${t.training_name} — ${t.status}\n`; }); }
    else b += `No training records documented.\n`;
    b += `\n`; secNum++;

    b += `## ${secNum}. Self-Certification Status\n\n`;
    if (selfCert.length > 0) { const sc = selfCert[0]; b += `**Assessment Level:** ${sc.assessment_level || 'Not set'}\n\n**Completion Status:** ${sc.completion_status || 'Not Started'}\n\n**PIEE User Status:** ${sc.piee_user_status || 'Not Started'}\n\n**Affirmed:** ${sc.affirmed ? 'Yes' : 'No'}\n`; }
    else b += `No self-certification walkthrough started.\n`;
    b += `\n`;

    b += `---\n\n## Completeness Summary\n\n`;
    b += `- **Overall Completeness:** ${completeness}%\n`;
    b += `- **Control Narrative Completeness:** ${controlNarrScore}%\n`;
    b += `- **Evidence Linkage:** ${evidenceScore}%\n`;
    b += `- **Inventory Completeness:** ${inventoryScore}%\n`;
    b += `- **Policy Completeness:** ${policyScore}%\n`;
    b += `- **Level 1 Readiness:** ${level1Readiness}%\n`;
    if (isLevel2) b += `- **Level 2 Readiness:** ${level2Readiness}%\n`;
    b += `- **Final Package Readiness:** ${finalPkgReadiness}%\n\n`;
    b += `**Open Gaps:** ${gaps.length}\n\n`;
    if (gaps.length > 0) { b += `| Category | Description | Severity |\n|----------|-------------|----------|\n`; gaps.forEach(g => { b += `| ${g.category} | ${g.description} | ${g.severity} |\n`; }); }
    b += `\n`;
    if (placeholderIssues.length > 0) b += `**⚠ Unresolved Placeholders:** ${placeholderIssues.length} document(s) have unresolved placeholders and cannot be approved.\n\n`;
    if (duplicates.length > 0) b += `**⚠ Duplicate Documents:** ${duplicates.length} duplicate document(s) detected.\n\n`;
    if (mismatches.length > 0) b += `**⚠ Client Mismatches:** ${mismatches.length} record(s) reference a different client name.\n\n`;

    // Upload SSP body as file (too large for entity field)
    const existingSSP = sspRecords[0];
    let bodyUrl = existingSSP?.generated_body || '';
    try {
      const file = new File([b], `SSP-${clientId}-${today}.md`, { type: 'text/markdown' });
      const uploadRes = await sr.integrations.Core.UploadFile({ file });
      bodyUrl = uploadRes.file_url || bodyUrl;
    } catch (e) { bodyUrl = bodyUrl || 'Upload failed — regenerate to retry'; }

    // Persist SSPRecord
    const sspTitle = `${levelLabel} ${sspType} — ${client.legal_name}`;
    const sspData = {
      client_id: clientId, ssp_title: sspTitle, ssp_level: targetLevel,
      version: existingSSP?.version || '1.0', status: existingSSP?.status || 'Draft',
      system_name: `${safe(client.legal_name) || '[CLIENT_NAME]'} CMMC Environment`,
      system_description: safe(client.notes) || '',
      authorization_boundary: systemComponents.map(c => c.component_name).join(', '),
      fci_boundary: fciInScope ? 'FCI in scope' : 'Not confirmed',
      cui_boundary: isLevel2 ? (cuiInScope ? 'CUI in scope' : 'CUI NOT in scope — Level 2 requires CUI') : 'N/A (Level 1)',
      generated_body: bodyUrl, last_generated_date: today, generated_by: user.full_name || user.email || 'System',
      unresolved_placeholders_count: placeholderIssues.length, missing_required_fields_count: gaps.length,
      evidence_gap_count: gaps.filter(g => g.category === 'Evidence' || g.category === 'Screenshots').length,
      control_gap_count: noNarr.length, duplicate_document_count: duplicates.length, include_in_final_package: true,
    };
    const sspRecord = existingSSP ? await sr.entities.SSPRecord.update(existingSSP.id, sspData) : await sr.entities.SSPRecord.create(sspData);

    // Persist SSPGenerationRun
    await sr.entities.SSPGenerationRun.create({
      client_id: clientId, ssp_record_id: sspRecord.id, run_level: targetLevel, run_status: 'Complete',
      completeness_score: completeness, control_narrative_completeness: controlNarrScore,
      evidence_linkage_completeness: evidenceScore, inventory_completeness: inventoryScore,
      policy_completeness: policyScore, level1_readiness: level1Readiness, level2_readiness: level2Readiness,
      final_package_readiness: finalPkgReadiness, gaps_found: JSON.stringify(gaps),
      placeholders_found: JSON.stringify(placeholderIssues), duplicates_found: JSON.stringify(duplicates),
      client_mismatches_found: JSON.stringify(mismatches), generated_by: user.full_name || user.email || 'System', run_date: today,
    });

    // Mark duplicates
    if (duplicates.length > 0) await Promise.all(duplicates.map(d => sr.entities.GeneratedDocument.update(d.document_id, { is_duplicate: true, duplicate_of_document_id: d.duplicate_of }).catch(() => {})));

    return Response.json({
      ssp_record: sspRecord, client, level: targetLevel, is_level2: isLevel2, cui_in_scope: cuiInScope, fci_in_scope: fciInScope, cloud_only: cloudOnly, has_physical_location: hasPhysicalLocation,
      scores: { completeness, control_narrative: controlNarrScore, evidence_linkage: evidenceScore, inventory: inventoryScore, policy: policyScore, level1_readiness: level1Readiness, level2_readiness: level2Readiness, final_package_readiness: finalPkgReadiness },
      gaps, placeholders: placeholderIssues, duplicates, client_mismatches: mismatches,
      control_narratives: controlNarratives, narratives_by_family: narrativesByFamily,
      section_checklist: sectionChecklist, traceability, generated_body: b,
      final_package: { level: targetLevel, required_docs: finalPackage, ready_count: packageReady ? docReadyCount : 0, doc_ready_count: docReadyCount, total_count: finalPackage.length, package_ready: packageReady, hard_blockers: packageBlockers },
      source_summary: {
        controls: levelControls.length, l1_controls: l1Controls.length, l2_controls: l2Controls.length,
        tasks: tasks.length, evidence: evidence.length, screenshots: screenshots.length, documents: docs.length,
        templates: templates.length, devices: devices.length, users: users.length, ninja_evidence: ninjaEvidence.length,
        poams: poams.length, risks: risks.length, training: training.length, policy_acks: policyAcks.length,
        system_components: systemComponents.length, data_flows: dataFlows.length, external_connections: externalConnections.length,
        service_providers: serviceProviders.length, self_cert: selfCert.length, google_migration: googleMig.length,
        folder_items: folderItems.length, assessment_packages: assessmentPackages.length, system_links: systemLinks.length, admin_links: adminLinks.length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});