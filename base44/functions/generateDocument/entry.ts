import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PLACEHOLDER_REGEX = /\[([A-Z][A-Z_0-9]{2,})\]/g;
const today = () => new Date().toISOString().split('T')[0];
const safe = (s) => (s && String(s).trim()) || '';
const notDoc = (m) => m || 'Not documented in app yet';

function findPlaceholders(text) {
  if (!text) return [];
  const m = text.match(PLACEHOLDER_REGEX);
  return m ? [...new Set(m.map(x => x.replace(/[\[\]]/g, '')))] : [];
}

// Keep this catalog in sync with lib/documentCatalog.js (functions can't import local files).
const DOCUMENT_CATALOG = [
  { key: 'scope_statement', name: 'CMMC Scope Statement', category: 'Scope Statement', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['Client', 'SystemComponent'], package: true },
  { key: 'fci_data_flow', name: 'FCI Data Flow Narrative', category: 'Data Flow', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], requiresFci: true, sources: ['DataFlow', 'Client'], package: true },
  { key: 'cui_data_flow', name: 'CUI Data Flow Narrative', category: 'Data Flow', levels: ['Level 2 Ready', 'Level 2'], requiresCui: true, sources: ['DataFlow', 'Client'], package: true },
  { key: 'cui_boundary', name: 'CUI Boundary Description', category: 'Boundary Description', levels: ['Level 2 Ready', 'Level 2'], requiresCui: true, sources: ['SystemComponent', 'Client'], package: true },
  { key: 'system_boundary', name: 'System Boundary Description', category: 'Boundary Description', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['SystemComponent', 'Client'], package: true },
  { key: 'external_connections', name: 'External Connections Summary', category: 'Boundary Description', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['ExternalConnection'], package: false },
  { key: 'service_provider_matrix', name: 'Service Provider Responsibility Matrix', category: 'Service Provider Matrix', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['ServiceProviderResponsibility'], package: true },
  { key: 'shared_responsibility', name: 'Shared Responsibility Matrix', category: 'Service Provider Matrix', levels: ['Level 2 Ready', 'Level 2'], sources: ['ServiceProviderResponsibility'], package: false },
  { key: 'control_matrix', name: 'Control Implementation Matrix', category: 'Control Matrix', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['CMMCControl', 'ControlProgress'], package: true },
  { key: 'control_validation_summary', name: 'Control Validation Summary', category: 'Assessment Summary', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['ControlValidation', 'ControlProgress'], package: false },
  { key: 'control_family_summary', name: 'Control Family Summary', category: 'Control Matrix', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['CMMCControl', 'ControlProgress'], package: false },
  { key: 'control_readiness_report', name: 'Control Readiness Report', category: 'Readiness Report', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['CMMCControl', 'ControlProgress', 'EvidenceItem'], package: false },
  { key: 'policy_access_control', name: 'Access Control Policy', category: 'Policy', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['Client'], package: true },
  { key: 'policy_identification_auth', name: 'Identification and Authentication Policy', category: 'Policy', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['Client'], package: true },
  { key: 'policy_media_protection', name: 'Media Protection Policy', category: 'Policy', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['Client'], package: true },
  { key: 'policy_physical_security', name: 'Physical Security Policy', category: 'Policy', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['Client'], package: true },
  { key: 'policy_scp', name: 'System and Communications Protection Policy', category: 'Policy', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['Client'], package: true },
  { key: 'policy_sii', name: 'System and Information Integrity Policy', category: 'Policy', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['Client'], package: true },
  { key: 'proc_incident_response', name: 'Incident Response Procedure', category: 'Procedure', levels: ['Level 2 Ready', 'Level 2'], sources: ['Client'], package: true },
  { key: 'proc_risk_management', name: 'Risk Management Procedure', category: 'Procedure', levels: ['Level 2 Ready', 'Level 2'], sources: ['RiskItem'], package: true },
  { key: 'proc_config_management', name: 'Configuration Management Procedure', category: 'Procedure', levels: ['Level 2 Ready', 'Level 2'], sources: ['Client'], package: true },
  { key: 'proc_audit_accountability', name: 'Audit and Accountability Procedure', category: 'Procedure', levels: ['Level 2 Ready', 'Level 2'], sources: ['Client'], package: true },
  { key: 'proc_awareness_training', name: 'Security Awareness and Training Procedure', category: 'Procedure', levels: ['Level 2 Ready', 'Level 2'], sources: ['TrainingRecord'], package: true },
  { key: 'proc_maintenance', name: 'Maintenance Procedure', category: 'Procedure', levels: ['Level 2 Ready', 'Level 2'], sources: ['Client'], package: false },
  { key: 'proc_personnel_security', name: 'Personnel Security Procedure', category: 'Procedure', levels: ['Level 2 Ready', 'Level 2'], sources: ['Client'], package: false },
  { key: 'proc_assessment_monitoring', name: 'Assessment and Monitoring Procedure', category: 'Procedure', levels: ['Level 2 Ready', 'Level 2'], sources: ['Client'], package: false },
  { key: 'user_inventory', name: 'User Inventory', category: 'User Inventory', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['UserInventory'], package: true },
  { key: 'device_inventory', name: 'Device Inventory', category: 'Device Inventory', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['DeviceInventory'], package: true },
  { key: 'asset_inventory', name: 'Asset Inventory', category: 'Asset Inventory', levels: ['Level 2 Ready', 'Level 2'], sources: ['DeviceInventory', 'SystemComponent'], package: true },
  { key: 'system_component_inventory', name: 'System Component Inventory', category: 'System Component Inventory', levels: ['Level 2 Ready', 'Level 2'], sources: ['SystemComponent'], package: true },
  { key: 'cloud_services_inventory', name: 'Cloud Services Inventory', category: 'Cloud Services Inventory', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['SystemComponent', 'Client'], package: false },
  { key: 'service_provider_inventory', name: 'External Service Provider Inventory', category: 'Service Provider Matrix', levels: ['Level 2 Ready', 'Level 2'], sources: ['ServiceProviderResponsibility'], package: false },
  { key: 'macos_summary', name: 'macOS Device Summary', category: 'Device Inventory', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], requiresMac: true, sources: ['DeviceInventory'], package: false },
  { key: 'evidence_index', name: 'Evidence Index', category: 'Evidence Index', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['EvidenceItem'], package: true },
  { key: 'screenshot_log', name: 'Screenshot Log', category: 'Screenshot Log', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['Screenshot'], package: true },
  { key: 'export_log', name: 'Export Log', category: 'Export Log', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['EvidenceItem'], package: false },
  { key: 'evidence_sufficiency', name: 'Evidence Sufficiency Report', category: 'Gap Report', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['EvidenceItem', 'Screenshot', 'ControlProgress'], package: false },
  { key: 'assessment_readiness', name: 'Assessment Readiness Report', category: 'Readiness Report', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['ControlProgress', 'EvidenceItem'], package: true },
  { key: 'gap_report', name: 'Gap Report', category: 'Gap Report', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['ControlProgress', 'EvidenceItem', 'Client'], package: false },
  { key: 'poam', name: 'POA&M', category: 'POAM', levels: ['Level 2 Ready', 'Level 2'], sources: ['POAMItem'], package: true },
  { key: 'risk_register', name: 'Risk Register', category: 'Risk Register', levels: ['Level 2 Ready', 'Level 2'], sources: ['RiskItem'], package: true },
  { key: 'training_summary', name: 'Training Records Summary', category: 'Training Summary', levels: ['Level 2 Ready', 'Level 2'], sources: ['TrainingRecord'], package: true },
  { key: 'policy_ack_summary', name: 'Policy Acknowledgement Summary', category: 'Policy Acknowledgement Summary', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['PolicyAcknowledgement'], package: false },
  { key: 'sprs_workpaper', name: 'SPRS Self-Assessment Workpaper', category: 'Self-Assessment', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['ControlProgress', 'SelfCertificationWalkthrough'], package: true },
  { key: 'executive_attestation', name: 'Executive Attestation Draft', category: 'Attestation', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['Client'], package: true },
  { key: 'final_assessment_summary', name: 'Final Assessment Summary', category: 'Assessment Summary', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['ControlProgress', 'EvidenceItem', 'GeneratedDocument'], package: true },
  { key: 'final_readiness_summary', name: 'Final Readiness Summary', category: 'Readiness Report', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['ControlProgress', 'EvidenceItem'], package: true },
  { key: 'c3pao_handoff', name: 'C3PAO Handoff Index', category: 'Handoff Index', levels: ['Level 2'], sources: ['GeneratedDocument', 'EvidenceItem'], package: true },
  { key: 'self_cert_walkthrough', name: 'Self-Certification Walkthrough', category: 'Self-Assessment', levels: ['Level 1'], sources: ['SelfCertificationWalkthrough'], package: true },
  { key: 'package_cover_sheet', name: 'Assessment Package Cover Sheet', category: 'Cover Sheet', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['Client', 'GeneratedDocument'], package: true },
];

function specByKey(key) { return DOCUMENT_CATALOG.find(s => s.key === key); }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { client_id: clientId, document_key: docKey, mode = 'Generate New', existing_document_id } = body;
    if (!clientId || !docKey) return Response.json({ error: 'client_id and document_key required' }, { status: 400 });
    const spec = specByKey(docKey);
    if (!spec) return Response.json({ error: 'Unknown document_key' }, { status: 400 });

    const sr = base44.asServiceRole;
    const [
      client, allClients, controls, controlProgress, controlValidations, evidence, screenshots,
      users, devices, components, dataFlows, externalConns, serviceProviders, poams, risks,
      training, policyAcks, selfCert, existingDocs,
    ] = await Promise.all([
      sr.entities.Client.get(clientId).catch(() => null),
      sr.entities.Client.list().catch(() => []),
      sr.entities.CMMCControl.list('-control_id', 500).catch(() => []),
      sr.entities.ControlProgress.filter({ client_id: clientId }).catch(() => []),
      sr.entities.ControlValidation.filter({ client_id: clientId }).catch(() => []),
      sr.entities.EvidenceItem.filter({ client_id: clientId }).catch(() => []),
      sr.entities.Screenshot.filter({ client_id: clientId }).catch(() => []),
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
      sr.entities.GeneratedDocument.filter({ client_id: clientId }).catch(() => []),
    ]);
    if (!client) return Response.json({ error: 'Client not found' }, { status: 404 });

    const level = client.target_cmmc_level || 'Level 1';
    const isLevel2 = level === 'Level 2' || level === 'Level 2 Ready';
    const cui = client.cui_in_scope === true;
    const fci = client.fci_in_scope === true;

    // Client-isolated control progress overlay (definitions only on CMMCControl).
    const progressByCtrl = {};
    controlProgress.forEach(p => { if (p.control_id) progressByCtrl[p.control_id] = p; });
    const overlay = (c) => {
      const p = progressByCtrl[c.control_id] || {};
      return { ...c, status: p.status || 'Not Started', ready_for_assessment: p.ready_for_assessment === true,
        control_narrative: p.control_narrative || '', assigned_owner: p.assigned_owner || '', reviewer_notes: p.reviewer_notes || '' };
    };
    const l1Controls = controls.filter(c => c.level === 'Level 1').map(overlay);
    const l2Controls = controls.filter(c => c.level === 'Level 2').map(overlay);
    const levelControls = isLevel2 ? [...l1Controls, ...l2Controls] : l1Controls;

    const evByCtrl = {}, ssByCtrl = {};
    evidence.forEach(e => { if (e.control_id) (evByCtrl[e.control_id] = evByCtrl[e.control_id] || []).push(e); });
    screenshots.forEach(s => { if (s.related_control) (ssByCtrl[s.related_control] = ssByCtrl[s.related_control] || []).push(s); });

    // --- Build body + collect missing source data + traceability ---
    const missing = [];
    const traceability = [];
    const trace = (section, entity, count, miss) => traceability.push({ section, source_entity: entity, records_used: count, missing: miss || '', status: count > 0 ? 'Complete' : 'Gap', last_updated: today() });

    const levelLine = `**CMMC Level:** ${level}\n\n**Data Scope:** ${cui ? 'CUI in scope' : (fci ? 'FCI in scope' : 'Scope not confirmed')}\n\n`;
    const header = (title) => `# ${title}\n\n**Client:** ${client.legal_name}${client.dba_name ? ' (' + client.dba_name + ')' : ''}\n\n${levelLine}**Version:** 1.0\n\n**Date:** ${today()}\n\n**Generated By:** ${user.full_name || user.email || 'System'}\n\n---\n\n`;

    let bodyContent = header(spec.name);

    const policyBody = (familyDesc) => {
      bodyContent += `## Purpose\n\nThis policy establishes ${client.legal_name}'s requirements for ${familyDesc} in support of CMMC ${level} (${cui ? 'CUI' : 'FCI'}-handling system).\n\n`;
      bodyContent += `## Scope\n\nApplies to all users, devices, and systems within the ${client.legal_name} CMMC authorization boundary (${client.ms_tenant_domain || client.primary_domain || '[TENANT_DOMAIN]'}).\n\n`;
      bodyContent += `## Policy Statements\n\nNot documented in app yet — policy statements should be authored and reviewed. Use the editor to complete this section.\n\n`;
      bodyContent += `## Roles & Responsibilities\n\n**Policy Owner:** ${safe(client.executive_sponsor) || '[EXECUTIVE_SPONSOR]'}\n\n**Point of Contact:** ${safe(client.poc_name) || '[POC_NAME]'}\n\n`;
      if (!safe(client.executive_sponsor)) missing.push('Executive sponsor not set on client');
      if (!safe(client.poc_name)) missing.push('Point of contact not set on client');
      trace('Policy Header', 'Client', 1, '');
    };

    const inventoryTable = (rows, label, cols, rowFn, entityName) => {
      if (rows.length === 0) { bodyContent += `Not documented in app yet — ${label} is empty.\n\n**Gap:** ${label} is required.\n\n`; missing.push(`${label} is empty`); trace(label, entityName, 0, `${label} empty`); return; }
      bodyContent += `**Total:** ${rows.length}\n\n| ${cols.join(' | ')} |\n|${cols.map(() => '---').join('|')}|\n`;
      rows.slice(0, 100).forEach(r => { bodyContent += `| ${rowFn(r).join(' | ')} |\n`; });
      bodyContent += `\n`; trace(label, entityName, rows.length, '');
    };

    switch (docKey) {
      case 'scope_statement':
        bodyContent += `## System Description\n\n${notDoc(safe(client.notes))}\n\n**Environment Type:** ${client.environment_type || 'Not documented'}\n\n**Primary Domain:** ${safe(client.primary_domain) || '[PRIMARY_DOMAIN]'}\n\n`;
        bodyContent += `## Data Scope\n\nFCI: ${fci ? 'In scope' : 'Not confirmed'}\n\n`;
        if (isLevel2) bodyContent += `CUI: ${cui ? 'In scope' : 'NOT in scope — Level 2 requires CUI scope'}\n\n`;
        bodyContent += `## Authorization Boundary\n\n`;
        inventoryTable(components, 'System Components', ['Component', 'Type', 'Handles CUI'], c => [safe(c.component_name), c.component_type || '—', c.handles_cui ? 'Yes' : 'No'], 'SystemComponent');
        if (!safe(client.primary_domain)) missing.push('Primary domain not set');
        trace('System Description', 'Client', 1, '');
        break;
      case 'fci_data_flow':
      case 'cui_data_flow': {
        const wantCui = docKey === 'cui_data_flow';
        const flows = dataFlows.filter(d => wantCui ? (d.data_type === 'CUI' || d.data_type === 'Mixed') : (d.data_type === 'FCI' || d.data_type === 'Mixed'));
        bodyContent += `## ${wantCui ? 'CUI' : 'FCI'} Data Flow\n\n`;
        if (flows.length === 0) { bodyContent += `Not documented in app yet — no ${wantCui ? 'CUI' : 'FCI'} data flows have been entered.\n\n**Gap:** Data flows are required.\n\n`; missing.push(`No ${wantCui ? 'CUI' : 'FCI'} data flows documented`); }
        else flows.forEach(d => { bodyContent += `- **${d.flow_name}:** ${safe(d.source_system) || 'Unknown'} → ${safe(d.destination_system) || 'Unknown'} via ${safe(d.protocol) || 'unspecified'}${d.encryption_in_transit ? ' (encrypted)' : ''}\n`; });
        bodyContent += `\n`; trace('Data Flows', 'DataFlow', flows.length, flows.length === 0 ? 'No data flows' : '');
        break;
      }
      case 'cui_boundary':
        bodyContent += `## CUI Boundary\n\n${cui ? 'CUI is in scope for this system.' : '**Warning:** CUI is not marked in scope but a CUI boundary document was requested.'}\n\n`;
        inventoryTable(components.filter(c => c.handles_cui), 'CUI-Handling Components', ['Component', 'Type', 'Location'], c => [safe(c.component_name), c.component_type || '—', safe(c.location) || '—'], 'SystemComponent');
        if (cui && components.filter(c => c.handles_cui).length === 0) missing.push('No components marked as handling CUI');
        break;
      case 'system_boundary':
        bodyContent += `## Authorization Boundary\n\n`;
        inventoryTable(components, 'System Components', ['Component', 'Type', 'In Boundary', 'Handles FCI', 'Handles CUI'], c => [safe(c.component_name), c.component_type || '—', c.in_authorization_boundary ? 'Yes' : 'No', c.handles_fci ? 'Yes' : 'No', c.handles_cui ? 'Yes' : 'No'], 'SystemComponent');
        break;
      case 'external_connections':
        bodyContent += `## External Connections\n\n`;
        inventoryTable(externalConns, 'External Connections', ['Connection', 'External System', 'Data Exchanged', 'Status'], c => [safe(c.connection_name), safe(c.external_system) || '—', safe(c.data_exchanged) || '—', c.status || '—'], 'ExternalConnection');
        break;
      case 'service_provider_matrix':
      case 'shared_responsibility':
      case 'service_provider_inventory':
        bodyContent += `## Service Provider Responsibilities\n\n`;
        if (serviceProviders.length === 0) { bodyContent += `Not documented in app yet — no service providers entered.\n\n**Note:** Microsoft 365, NinjaOne${client.cortex_xdr_in_scope ? ', Cortex XDR' : ''} support inherited/shared controls and must be documented.\n\n`; missing.push('No service provider responsibilities documented'); }
        else serviceProviders.forEach(sp => { bodyContent += `### ${sp.provider_name} (${sp.service_type || 'Provider'})\n\n- **Services:** ${safe(sp.services_used) || 'Not documented'}\n- **Controls Supported:** ${safe(sp.cmmc_controls_supported) || 'Not documented'}\n- **Client Responsibilities:** ${safe(sp.client_responsibilities) || 'Not documented'}\n- **Provider Responsibilities:** ${safe(sp.provider_responsibilities) || 'Not documented'}\n- **Inheritance Notes:** ${safe(sp.inheritance_notes) || 'Not documented'}\n\n`; });
        trace('Service Providers', 'ServiceProviderResponsibility', serviceProviders.length, serviceProviders.length === 0 ? 'None documented' : '');
        break;
      case 'control_matrix':
      case 'control_family_summary':
      case 'control_readiness_report': {
        const byFam = {};
        levelControls.forEach(c => { (byFam[c.control_family || 'Uncategorized'] = byFam[c.control_family || 'Uncategorized'] || []).push(c); });
        bodyContent += `## ${spec.name}\n\nApplicable controls: ${levelControls.length}\n\n`;
        let noNarr = 0;
        Object.keys(byFam).sort().forEach(fam => {
          bodyContent += `### ${fam}\n\n`;
          byFam[fam].forEach(c => {
            const ev = (evByCtrl[c.control_id] || []).length, ss = (ssByCtrl[c.control_id] || []).length;
            const hasNarr = safe(c.control_narrative).length > 0; if (!hasNarr) noNarr++;
            if (docKey === 'control_family_summary') { bodyContent += `- **${c.control_id}**: ${c.status}${c.ready_for_assessment ? ' (ready)' : ''}\n`; }
            else { bodyContent += `#### ${c.control_id}: ${c.control_title}\n\n**Status:** ${c.status}\n\n**Narrative:** ${hasNarr ? c.control_narrative : notDoc('')}\n\n**Evidence:** ${ev} item(s), ${ss} screenshot(s)\n\n**Ready for Assessment:** ${c.ready_for_assessment ? 'Yes' : 'No'}\n\n`; }
          });
        });
        if (noNarr > 0) missing.push(`${noNarr} of ${levelControls.length} controls missing narratives`);
        trace('Controls', 'CMMCControl + ControlProgress', levelControls.length, noNarr > 0 ? `${noNarr} missing narratives` : '');
        break;
      }
      case 'control_validation_summary':
        bodyContent += `## Control Validation\n\n`;
        if (controlValidations.length === 0) { bodyContent += `Validation not completed yet — no control validation records exist.\n\n`; missing.push('No control validation records'); }
        else controlValidations.forEach(v => { bodyContent += `- **${v.control_id || 'Unmapped'}**: ${v.status || v.validation_status || 'Unknown'}\n`; });
        bodyContent += `\n`; trace('Validations', 'ControlValidation', controlValidations.length, controlValidations.length === 0 ? 'None' : '');
        break;
      case 'policy_access_control': policyBody('access control'); break;
      case 'policy_identification_auth': policyBody('identification and authentication'); break;
      case 'policy_media_protection': policyBody('media protection'); break;
      case 'policy_physical_security': policyBody('physical security'); break;
      case 'policy_scp': policyBody('system and communications protection'); break;
      case 'policy_sii': policyBody('system and information integrity'); break;
      case 'proc_incident_response': policyBody('incident response'); break;
      case 'proc_risk_management': policyBody('risk management'); break;
      case 'proc_config_management': policyBody('configuration management'); break;
      case 'proc_audit_accountability': policyBody('audit and accountability'); break;
      case 'proc_awareness_training': policyBody('security awareness and training'); break;
      case 'proc_maintenance': policyBody('maintenance'); break;
      case 'proc_personnel_security': policyBody('personnel security'); break;
      case 'proc_assessment_monitoring': policyBody('assessment and monitoring'); break;
      case 'user_inventory':
        bodyContent += `## User Inventory\n\n`;
        inventoryTable(users, 'User Inventory', ['Name', 'Email', 'Role', 'MFA', 'Status'], u => [safe(u.display_name), safe(u.email) || '—', safe(u.role) || '—', u.mfa_enabled ? 'Yes' : 'No', u.status || '—'], 'UserInventory');
        break;
      case 'device_inventory':
      case 'asset_inventory':
        bodyContent += `## ${spec.name}\n\n`;
        inventoryTable(devices, 'Device Inventory', ['Device', 'Type', 'OS', 'User', 'NinjaOne', 'Compliance'], d => [safe(d.device_name), d.device_type || '—', safe(d.os) || '—', safe(d.user_assigned) || '—', d.ninjaone_managed ? 'Yes' : 'No', d.compliance_status || '—'], 'DeviceInventory');
        break;
      case 'macos_summary':
        bodyContent += `## macOS Device Summary\n\nmacOS devices: ${client.macos_devices_count || 0}, Windows: ${client.windows_devices_count || 0}\n\n`;
        inventoryTable(devices.filter(d => d.device_type === 'macOS'), 'macOS Devices', ['Device', 'OS', 'User', 'Compliance'], d => [safe(d.device_name), safe(d.os) || '—', safe(d.user_assigned) || '—', d.compliance_status || '—'], 'DeviceInventory');
        break;
      case 'system_component_inventory':
      case 'cloud_services_inventory':
        bodyContent += `## ${spec.name}\n\n`;
        inventoryTable(components, 'System Components', ['Component', 'Type', 'Vendor', 'Boundary'], c => [safe(c.component_name), c.component_type || '—', safe(c.vendor) || '—', c.in_authorization_boundary ? 'Yes' : 'No'], 'SystemComponent');
        break;
      case 'evidence_index':
      case 'export_log':
        bodyContent += `## Evidence Index\n\n`;
        inventoryTable(evidence, 'Evidence Items', ['Title', 'Type', 'Source', 'Control', 'Reviewer Status'], e => [safe(e.evidence_title), e.evidence_type || '—', e.source_system || '—', e.control_id || '—', e.reviewer_status || 'Not Reviewed'], 'EvidenceItem');
        break;
      case 'screenshot_log':
        bodyContent += `## Screenshot Log\n\n`;
        inventoryTable(screenshots, 'Screenshots', ['File', 'Control', 'Validation', 'Reviewer'], s => [safe(s.actual_file_name) || safe(s.suggested_file_name) || 'Untitled', s.related_control || '—', s.validation_status || '—', s.reviewer_status || '—'], 'Screenshot');
        break;
      case 'evidence_sufficiency':
      case 'assessment_readiness':
      case 'gap_report':
      case 'control_readiness_report_dup': {
        const noEv = levelControls.filter(c => (evByCtrl[c.control_id] || []).length === 0 && (ssByCtrl[c.control_id] || []).length === 0);
        const complete = levelControls.filter(c => c.status === 'Complete' || c.ready_for_assessment).length;
        bodyContent += `## Readiness Overview\n\n- Controls complete: ${complete}/${levelControls.length}\n- Controls without evidence: ${noEv.length}\n- Evidence items: ${evidence.length}, Screenshots: ${screenshots.length}\n- Validation records: ${controlValidations.length}\n\n`;
        if (noEv.length > 0) { bodyContent += `### Controls Missing Evidence\n\n${noEv.map(c => `- ${c.control_id}: ${c.control_title}`).join('\n')}\n\n`; missing.push(`${noEv.length} controls missing evidence`); }
        if (controlValidations.length === 0) missing.push('No validation records');
        if (evidence.length + screenshots.length === 0) missing.push('No evidence uploaded');
        trace('Readiness', 'ControlProgress + EvidenceItem', levelControls.length, noEv.length > 0 ? `${noEv.length} missing evidence` : '');
        break;
      }
      case 'poam':
        bodyContent += `## Plan of Action & Milestones\n\n`;
        inventoryTable(poams, 'POA&M Items', ['Weakness', 'Control', 'Severity', 'Status', 'Due'], p => [safe(p.weakness_description), p.control_id || '—', p.severity || '—', p.status || '—', p.scheduled_completion || '—'], 'POAMItem');
        break;
      case 'risk_register':
        bodyContent += `## Risk Register\n\n`;
        inventoryTable(risks, 'Risk Items', ['Risk', 'Severity', 'Likelihood', 'Status'], r => [safe(r.risk_description), r.severity || '—', r.likelihood || '—', r.status || '—'], 'RiskItem');
        break;
      case 'training_summary':
        bodyContent += `## Training Records\n\n`;
        inventoryTable(training, 'Training Records', ['User', 'Training', 'Status', 'Completed'], t => [safe(t.user_name), safe(t.training_name), t.status || '—', t.completion_date || '—'], 'TrainingRecord');
        break;
      case 'policy_ack_summary':
        bodyContent += `## Policy Acknowledgements\n\n`;
        inventoryTable(policyAcks, 'Policy Acknowledgements', ['Record'], a => [safe(a.user_name) || safe(a.policy_name) || a.id], 'PolicyAcknowledgement');
        break;
      case 'sprs_workpaper':
      case 'self_cert_walkthrough': {
        const complete = levelControls.filter(c => c.status === 'Complete' || c.ready_for_assessment).length;
        bodyContent += `## SPRS Self-Assessment\n\n- Applicable controls: ${levelControls.length}\n- Implemented: ${complete}\n- Score basis: ${complete}/${levelControls.length}\n\n`;
        if (selfCert.length > 0) { const sc = selfCert[0]; bodyContent += `**Assessment Level:** ${sc.assessment_level || 'Not set'}\n\n**Completion:** ${sc.completion_status || 'Not Started'}\n\n**Affirmed:** ${sc.affirmed ? 'Yes' : 'No'}\n\n`; }
        else { bodyContent += `Self-certification walkthrough not started.\n\n`; missing.push('Self-certification walkthrough not started'); }
        break;
      }
      case 'executive_attestation':
        bodyContent += `## Executive Attestation\n\nI, ${safe(client.executive_sponsor) || '[EXECUTIVE_SPONSOR]'}, as the senior official of ${client.legal_name}, affirm that the controls described in this assessment package are accurately represented for CMMC ${level}.\n\n**Signature:** _______________________\n\n**Date:** _______________________\n\n`;
        if (!safe(client.executive_sponsor)) missing.push('Executive sponsor not set on client');
        break;
      case 'final_assessment_summary':
      case 'final_readiness_summary': {
        const complete = levelControls.filter(c => c.status === 'Complete' || c.ready_for_assessment).length;
        const approvedDocs = existingDocs.filter(d => d.status === 'Approved' || d.status === 'Published').length;
        bodyContent += `## Final Summary\n\n- Controls complete: ${complete}/${levelControls.length}\n- Evidence items: ${evidence.length + screenshots.length}\n- Approved documents: ${approvedDocs}/${existingDocs.length}\n- Validation records: ${controlValidations.length}\n\n`;
        if (complete < levelControls.length) missing.push(`${levelControls.length - complete} controls not complete`);
        if (approvedDocs === 0) missing.push('No approved documents');
        break;
      }
      case 'c3pao_handoff':
      case 'package_cover_sheet':
        bodyContent += `## ${spec.name}\n\n**Client:** ${client.legal_name}\n\n**Level:** ${level}\n\n**Documents in package:**\n\n`;
        existingDocs.filter(d => d.include_in_final_package).forEach(d => { bodyContent += `- ${d.title} (v${d.version}, ${d.status})\n`; });
        if (existingDocs.filter(d => d.include_in_final_package).length === 0) { bodyContent += `No documents included in final package yet.\n`; missing.push('No documents marked for final package'); }
        bodyContent += `\n`;
        break;
      default:
        bodyContent += `## ${spec.name}\n\nNot documented in app yet.\n\n`;
    }

    // --- Placeholders, gaps, completeness, duplicate, mismatch ---
    const placeholders = findPlaceholders(bodyContent);
    const sourceRecordsUsed = traceability.reduce((a, t) => a + t.records_used, 0);
    const relatedControlIds = (spec.sources.includes('CMMCControl') ? levelControls : []).map(c => c.control_id).slice(0, 50).join(', ');
    const relatedEvidence = evidence.length, relatedScreens = screenshots.length;

    // Completeness scoring
    let scoreParts = [];
    scoreParts.push(safe(client.legal_name) ? 1 : 0);
    scoreParts.push(missing.length === 0 ? 1 : 0);
    scoreParts.push(placeholders.length === 0 ? 1 : 0);
    scoreParts.push(sourceRecordsUsed > 0 ? 1 : 0);
    const completeness = Math.round((scoreParts.reduce((a, b) => a + b, 0) / scoreParts.length) * 100);

    // Duplicate detection (same doc_key/title for this client)
    const dupOf = existingDocs.find(d => d.document_type === docKey && d.id !== existing_document_id && d.status !== 'Superseded' && d.status !== 'Archived');

    // Client mismatch: other client names appearing in body
    const otherNames = allClients.filter(c => c.id !== clientId).map(c => safe(c.legal_name)).filter(n => n.length > 3);
    const mismatch = otherNames.find(n => bodyContent.toLowerCase().includes(n.toLowerCase()) && !safe(client.legal_name).toLowerCase().includes(n.toLowerCase()));

    // Readiness blockers
    const blockers = [];
    if (placeholders.length > 0) blockers.push(`${placeholders.length} unresolved placeholder(s)`);
    if (missing.length > 0) blockers.push(`${missing.length} source gap(s)`);
    if (mismatch) blockers.push(`Possible client mismatch: "${mismatch}"`);

    // --- Versioning / mode handling ---
    const existing = existing_document_id ? existingDocs.find(d => d.id === existing_document_id) : (mode === 'Generate New' ? null : dupOf);

    // Preserve human edits: don't overwrite silently
    if (existing && existing.human_edited && mode !== 'New Version' && mode !== 'Preserve Edits' && !body.force_overwrite) {
      return Response.json({ needs_confirmation: true, reason: 'human_edited', existing_document: existing,
        message: 'This document has human edits. Choose: preserve edits (new version), overwrite draft, or cancel.' });
    }

    const docFields = {
      client_id: clientId, title: spec.name, document_type: docKey, document_category: spec.category,
      cmmc_level: level, body_content: bodyContent, source_scope: cui ? 'CUI' : (fci ? 'FCI' : 'Undetermined'),
      source_entities_used: spec.sources.join(', '), source_records_used: sourceRecordsUsed,
      related_controls: relatedControlIds, related_evidence_count: relatedEvidence, related_screenshot_count: relatedScreens,
      related_poam_count: poams.length, related_risk_count: risks.length,
      unresolved_placeholders: placeholders.join(', '), unresolved_placeholders_count: placeholders.length,
      missing_source_data: missing.join(' | '), gap_count: missing.length, completeness_score: completeness,
      readiness_blockers: blockers.join(' | '), final_package_required: spec.package === true,
      client_mismatch_warning: mismatch ? `References "${mismatch}"` : '',
      generated_from_source_snapshot: `Generated ${today()} from ${spec.sources.join(', ')} (${sourceRecordsUsed} records)`,
      generated_by: user.full_name || user.email || 'System', generated_date: today(),
      generation_mode: mode, human_edited: false,
    };

    let result;
    if (mode === 'New Version' && existing) {
      const newVersionNum = (existing.version_number || 1) + 1;
      result = await sr.entities.GeneratedDocument.create({
        ...docFields, version: `${newVersionNum}.0`, version_number: newVersionNum, status: 'Draft',
        supersedes_document_id: existing.id, changelog: `Version ${newVersionNum} regenerated from live data on ${today()}`,
        include_in_final_package: existing.include_in_final_package === true,
      });
      await sr.entities.GeneratedDocument.update(existing.id, { status: 'Superseded', superseded_by_document_id: result.id }).catch(() => {});
    } else if (existing) {
      result = await sr.entities.GeneratedDocument.update(existing.id, {
        ...docFields, version: existing.version || '1.0', version_number: existing.version_number || 1,
        status: existing.status === 'Approved' || existing.status === 'Published' ? 'Changes Requested' : (existing.status || 'Draft'),
      });
    } else {
      result = await sr.entities.GeneratedDocument.create({ ...docFields, version: '1.0', version_number: 1, status: 'Draft', include_in_final_package: false });
    }

    if (dupOf && (!existing || dupOf.id !== existing.id)) {
      await sr.entities.GeneratedDocument.update(result.id, { is_duplicate: true, duplicate_of_document_id: dupOf.id }).catch(() => {});
    }

    return Response.json({
      document: result, completeness, placeholders, missing_source_data: missing, readiness_blockers: blockers,
      traceability, duplicate_of: dupOf ? { id: dupOf.id, title: dupOf.title, version: dupOf.version } : null,
      client_mismatch: mismatch || null, level, is_level2: isLevel2,
      source_summary: { controls: levelControls.length, evidence: evidence.length, screenshots: screenshots.length,
        users: users.length, devices: devices.length, components: components.length, poams: poams.length, risks: risks.length,
        validations: controlValidations.length, service_providers: serviceProviders.length, data_flows: dataFlows.length, records_used: sourceRecordsUsed },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});