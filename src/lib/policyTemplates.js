// Default policy template catalog. Each becomes a master PolicyTemplate record
// (is_master_template: true, no project_id) that users clone into a project.
// Bodies use {{merge}} tokens resolved at clone time.
export const POLICY_CATEGORIES = {
  'Access Control': ['Access Control Policy', 'Account Management Procedure', 'MFA and Authentication Policy', 'Acceptable Use Policy'],
  'Media & Physical': ['Media Protection Policy', 'Physical Security Policy', 'Visitor Management Procedure'],
  'Operations': ['Incident Response Policy', 'Configuration Management Policy', 'Change Management Procedure', 'Vulnerability Management Policy', 'Patch Management Policy'],
  'Monitoring & Awareness': ['Audit Logging Policy', 'Security Awareness Training Policy', 'Risk Assessment Policy'],
  'Protection & Data': ['System and Communications Protection Policy', 'Data Backup and Recovery Policy', 'CUI Handling Policy', 'Mobile Device and BYOD Policy'],
  'Governance': ['Vendor and External Service Provider Policy', 'Personnel Screening and Termination Procedure', 'SSP Maintenance Procedure', 'POA&M Management Procedure'],
};

// Control mapping hints per policy (CMMC L1 practice IDs where relevant).
const CONTROL_MAP = {
  'Access Control Policy': ['AC.L1-3.1.1', 'AC.L1-3.1.2'],
  'Account Management Procedure': ['AC.L1-3.1.1'],
  'MFA and Authentication Policy': ['IA.L1-3.5.1', 'IA.L1-3.5.2'],
  'Acceptable Use Policy': ['AC.L1-3.1.1', 'AC.L1-3.1.20'],
  'Media Protection Policy': ['MP.L1-3.8.3'],
  'Physical Security Policy': ['PE.L1-3.10.1', 'PE.L1-3.10.3', 'PE.L1-3.10.4', 'PE.L1-3.10.5'],
  'Visitor Management Procedure': ['PE.L1-3.10.3', 'PE.L1-3.10.4'],
  'Incident Response Policy': [],
  'Configuration Management Policy': [],
  'Change Management Procedure': [],
  'Vulnerability Management Policy': [],
  'Patch Management Policy': ['SI.L1-3.14.1'],
  'Audit Logging Policy': [],
  'Security Awareness Training Policy': [],
  'Risk Assessment Policy': [],
  'System and Communications Protection Policy': ['SC.L1-3.13.1', 'SC.L1-3.13.5'],
  'Data Backup and Recovery Policy': [],
  'CUI Handling Policy': [],
  'Mobile Device and BYOD Policy': [],
  'Vendor and External Service Provider Policy': [],
  'Personnel Screening and Termination Procedure': [],
  'SSP Maintenance Procedure': [],
  'POA&M Management Procedure': [],
};

function templateBody(name) {
  return `<h2>${name}</h2>
<p><strong>Organization:</strong> {{organization_name}}<br/>
<strong>Project:</strong> {{project_name}}<br/>
<strong>Policy Owner:</strong> {{owner}}<br/>
<strong>Effective Date:</strong> {{effective_date}}<br/>
<strong>Next Review Date:</strong> {{review_date}}<br/>
<strong>Version:</strong> {{version}}</p>
<h3>1. Purpose</h3>
<p>This ${name.toLowerCase()} establishes the requirements for {{organization_name}} to protect Federal Contract Information (FCI) and, where applicable, Controlled Unclassified Information (CUI) in accordance with the organization's CMMC objectives.</p>
<h3>2. Scope</h3>
<p>This policy applies to all personnel, systems, and facilities within the defined assessment boundary of {{project_name}}.</p>
<h3>3. Policy</h3>
<p><em>[Document the specific control requirements, responsibilities, and procedures for this policy area. Replace this placeholder with your organization's actual practices.]</em></p>
<h3>4. Roles and Responsibilities</h3>
<p><em>[Define who is accountable for implementing and enforcing this policy.]</em></p>
<h3>5. Enforcement and Review</h3>
<p>This policy is reviewed at least annually or upon significant change. Non-compliance may result in corrective action.</p>`;
}

export function buildPolicySeed() {
  const list = [];
  Object.entries(POLICY_CATEGORIES).forEach(([category, names]) => {
    names.forEach((policy_name) => {
      list.push({
        policy_name,
        policy_category: category,
        mapped_control_ids: CONTROL_MAP[policy_name] || [],
        policy_body: templateBody(policy_name),
        version: '1.0',
        approval_status: 'Template',
        is_master_template: true,
      });
    });
  });
  return list;
}

// Resolve {{merge}} tokens when cloning a template into a project.
export function mergePolicyBody(body, merge) {
  return (body || '').replace(/\{\{(\w+)\}\}/g, (_, key) => merge[key] ?? `{{${key}}}`);
}