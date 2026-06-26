// Shared, level-aware document catalog used by the Document Builder UI.
// The backend generateDocument function carries its own copy of this catalog
// (Deno functions cannot import local files), so keep the two in sync.

// Each spec: key, name, category, level applicability, scope flags, source entities, final-package requirement.
export const DOCUMENT_CATALOG = [
  // A. Scoping & boundary
  { key: 'scope_statement', name: 'CMMC Scope Statement', category: 'Scope Statement', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['Client', 'SystemComponent'], package: true },
  { key: 'fci_data_flow', name: 'FCI Data Flow Narrative', category: 'Data Flow', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], requiresFci: true, sources: ['DataFlow', 'Client'], package: true },
  { key: 'cui_data_flow', name: 'CUI Data Flow Narrative', category: 'Data Flow', levels: ['Level 2 Ready', 'Level 2'], requiresCui: true, sources: ['DataFlow', 'Client'], package: true },
  { key: 'cui_boundary', name: 'CUI Boundary Description', category: 'Boundary Description', levels: ['Level 2 Ready', 'Level 2'], requiresCui: true, sources: ['SystemComponent', 'Client'], package: true },
  { key: 'system_boundary', name: 'System Boundary Description', category: 'Boundary Description', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['SystemComponent', 'Client'], package: true },
  { key: 'external_connections', name: 'External Connections Summary', category: 'Boundary Description', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['ExternalConnection'], package: false },
  { key: 'service_provider_matrix', name: 'Service Provider Responsibility Matrix', category: 'Service Provider Matrix', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['ServiceProviderResponsibility'], package: true },
  { key: 'shared_responsibility', name: 'Shared Responsibility Matrix', category: 'Service Provider Matrix', levels: ['Level 2 Ready', 'Level 2'], sources: ['ServiceProviderResponsibility'], package: false },

  // B. SSP & control implementation
  { key: 'control_matrix', name: 'Control Implementation Matrix', category: 'Control Matrix', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['CMMCControl', 'ControlProgress'], package: true },
  { key: 'control_validation_summary', name: 'Control Validation Summary', category: 'Assessment Summary', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['ControlValidation', 'ControlProgress'], package: false },
  { key: 'control_family_summary', name: 'Control Family Summary', category: 'Control Matrix', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['CMMCControl', 'ControlProgress'], package: false },
  { key: 'control_readiness_report', name: 'Control Readiness Report', category: 'Readiness Report', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['CMMCControl', 'ControlProgress', 'EvidenceItem'], package: false },

  // C. Policies & procedures
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

  // D. Inventory
  { key: 'user_inventory', name: 'User Inventory', category: 'User Inventory', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['UserInventory'], package: true },
  { key: 'device_inventory', name: 'Device Inventory', category: 'Device Inventory', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['DeviceInventory'], package: true },
  { key: 'asset_inventory', name: 'Asset Inventory', category: 'Asset Inventory', levels: ['Level 2 Ready', 'Level 2'], sources: ['DeviceInventory', 'SystemComponent'], package: true },
  { key: 'system_component_inventory', name: 'System Component Inventory', category: 'System Component Inventory', levels: ['Level 2 Ready', 'Level 2'], sources: ['SystemComponent'], package: true },
  { key: 'cloud_services_inventory', name: 'Cloud Services Inventory', category: 'Cloud Services Inventory', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['SystemComponent', 'Client'], package: false },
  { key: 'service_provider_inventory', name: 'External Service Provider Inventory', category: 'Service Provider Matrix', levels: ['Level 2 Ready', 'Level 2'], sources: ['ServiceProviderResponsibility'], package: false },
  { key: 'macos_summary', name: 'macOS Device Summary', category: 'Device Inventory', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], requiresMac: true, sources: ['DeviceInventory'], package: false },

  // E. Evidence & assessment
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

  // F. Final package
  { key: 'sprs_workpaper', name: 'SPRS Self-Assessment Workpaper', category: 'Self-Assessment', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['ControlProgress', 'SelfCertificationWalkthrough'], package: true },
  { key: 'executive_attestation', name: 'Executive Attestation Draft', category: 'Attestation', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['Client'], package: true },
  { key: 'final_assessment_summary', name: 'Final Assessment Summary', category: 'Assessment Summary', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['ControlProgress', 'EvidenceItem', 'GeneratedDocument'], package: true },
  { key: 'final_readiness_summary', name: 'Final Readiness Summary', category: 'Readiness Report', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['ControlProgress', 'EvidenceItem'], package: true },
  { key: 'c3pao_handoff', name: 'C3PAO Handoff Index', category: 'Handoff Index', levels: ['Level 2'], sources: ['GeneratedDocument', 'EvidenceItem'], package: true },
  { key: 'self_cert_walkthrough', name: 'Self-Certification Walkthrough', category: 'Self-Assessment', levels: ['Level 1'], sources: ['SelfCertificationWalkthrough'], package: true },
  { key: 'package_cover_sheet', name: 'Assessment Package Cover Sheet', category: 'Cover Sheet', levels: ['Level 1', 'Level 2 Ready', 'Level 2'], sources: ['Client', 'GeneratedDocument'], package: true },
];

export const CATEGORY_GROUPS = [
  { group: 'Scoping & Boundary', categories: ['Scope Statement', 'Data Flow', 'Boundary Description', 'Service Provider Matrix'] },
  { group: 'SSP & Control Implementation', categories: ['SSP', 'Control Matrix', 'Readiness Report', 'Assessment Summary'] },
  { group: 'Policies & Procedures', categories: ['Policy', 'Procedure'] },
  { group: 'Inventory', categories: ['User Inventory', 'Device Inventory', 'Asset Inventory', 'System Component Inventory', 'Cloud Services Inventory'] },
  { group: 'Evidence & Assessment', categories: ['Evidence Index', 'Screenshot Log', 'Export Log', 'Gap Report', 'POAM', 'Risk Register', 'Training Summary', 'Policy Acknowledgement Summary'] },
  { group: 'Final Package', categories: ['Self-Assessment', 'Attestation', 'Handoff Index', 'Cover Sheet'] },
];

// Return the document specs applicable to a given client (level + scope aware).
export function applicableDocuments(client) {
  if (!client) return [];
  const level = client.target_cmmc_level || 'Level 1';
  return DOCUMENT_CATALOG.filter(spec => {
    if (!spec.levels.includes(level)) return false;
    if (spec.requiresCui && !client.cui_in_scope) return false;
    if (spec.requiresFci && !client.fci_in_scope) return false;
    if (spec.requiresMac && !client.mac_heavy && (client.macos_devices_count || 0) === 0) return false;
    return true;
  });
}

export function specByKey(key) {
  return DOCUMENT_CATALOG.find(s => s.key === key);
}