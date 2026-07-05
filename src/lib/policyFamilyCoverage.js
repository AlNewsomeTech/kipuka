// Full policy + procedure coverage audit for the 14 NIST 800-171 families.
// Ensures EVERY family has both a Policy and a Procedure document generatable,
// with control mappings and merge variables. Extends the existing PolicyTemplate
// system (does not replace policyTemplates.js — this adds the family-complete set).

// 14 families (code, name, L1 flag = has Level 1 practices).
export const NIST_FAMILIES = [
  { code: 'AC', name: 'Access Control', l1: true, l1Controls: ['AC.L1-3.1.1', 'AC.L1-3.1.2', 'AC.L1-3.1.20', 'AC.L1-3.1.22'] },
  { code: 'AT', name: 'Awareness and Training', l1: false, l1Controls: [] },
  { code: 'AU', name: 'Audit and Accountability', l1: false, l1Controls: [] },
  { code: 'CM', name: 'Configuration Management', l1: false, l1Controls: [] },
  { code: 'IA', name: 'Identification and Authentication', l1: true, l1Controls: ['IA.L1-3.5.1', 'IA.L1-3.5.2'] },
  { code: 'IR', name: 'Incident Response', l1: false, l1Controls: [] },
  { code: 'MA', name: 'Maintenance', l1: false, l1Controls: [] },
  { code: 'MP', name: 'Media Protection', l1: true, l1Controls: ['MP.L1-3.8.3'] },
  { code: 'PS', name: 'Personnel Security', l1: false, l1Controls: [] },
  { code: 'PE', name: 'Physical Protection', l1: true, l1Controls: ['PE.L1-3.10.1', 'PE.L1-3.10.3', 'PE.L1-3.10.4', 'PE.L1-3.10.5'] },
  { code: 'RA', name: 'Risk Assessment', l1: false, l1Controls: [] },
  { code: 'CA', name: 'Security Assessment', l1: false, l1Controls: [] },
  { code: 'SC', name: 'System and Communications Protection', l1: true, l1Controls: ['SC.L1-3.13.1', 'SC.L1-3.13.5'] },
  { code: 'SI', name: 'System and Information Integrity', l1: true, l1Controls: ['SI.L1-3.14.1', 'SI.L1-3.14.2', 'SI.L1-3.14.4', 'SI.L1-3.14.5'] },
];

function docBody(kind, family, merge) {
  const isPolicy = kind === 'Policy';
  const title = `${family.name} ${kind}`;
  const controls = family.l1Controls.length ? family.l1Controls.join(', ') : 'All Level 2 controls in the ' + family.code + ' family';
  return `<h2>${title}</h2>
<p><strong>Organization:</strong> ${merge.organization_name}<br/>
<strong>Environment:</strong> ${merge.environment || 'Not specified'}<br/>
<strong>Owner:</strong> ${merge.owner}<br/>
<strong>Effective Date:</strong> ${merge.effective_date}<br/>
<strong>Version:</strong> ${merge.version}</p>
<h3>1. Purpose</h3>
<p>This ${title.toLowerCase()} defines how ${merge.organization_name} ${isPolicy ? 'governs' : 'operationally implements'} the ${family.name} (${family.code}) requirements of NIST SP 800-171 to protect FCI and CUI.</p>
<h3>2. Controls Satisfied</h3>
<p>This document supports: <strong>${controls}</strong>.</p>
<h3>3. ${isPolicy ? 'Policy Statements' : 'Procedure Steps'}</h3>
<p><em>[${isPolicy ? 'Document the governing requirements and responsibilities for this family.' : 'Document the step-by-step operational procedure staff follow to satisfy this family.'} Replace with your organization's actual practices.]</em></p>
<h3>4. Roles and Responsibilities</h3>
<p><em>[Define who is accountable for this family.]</em></p>
<h3>5. Review</h3>
<p>Reviewed at least annually or upon significant change.</p>`;
}

// Build the family-complete Policy + Procedure master template set.
// level: 'Level 1' -> only families with L1 practices; else all 14.
export function buildFamilyDocSeed(level = 'Level 2') {
  const families = level === 'Level 1' ? NIST_FAMILIES.filter((f) => f.l1) : NIST_FAMILIES;
  const merge = {
    organization_name: '{{organization_name}}', environment: '{{environment}}',
    owner: '{{owner}}', effective_date: '{{effective_date}}', version: '{{version}}',
  };
  const list = [];
  families.forEach((family) => {
    ['Policy', 'Procedure'].forEach((kind) => {
      list.push({
        policy_name: `${family.name} ${kind}`,
        policy_category: family.name,
        mapped_control_ids: family.l1Controls,
        policy_body: docBody(kind, family, merge),
        version: '1.0',
        approval_status: 'Template',
        is_master_template: true,
        family_code: family.code,
        doc_kind: kind,
      });
    });
  });
  return list;
}

// Audit which families are missing a Policy and/or Procedure in a given set of
// project policy records. Returns [{ code, name, hasPolicy, hasProcedure }].
export function auditFamilyCoverage(policies, level = 'Level 2') {
  const families = level === 'Level 1' ? NIST_FAMILIES.filter((f) => f.l1) : NIST_FAMILIES;
  return families.map((f) => {
    const forFamily = policies.filter((p) =>
      p.family_code === f.code || (p.policy_category || '').toLowerCase() === f.name.toLowerCase());
    const hasPolicy = forFamily.some((p) => (p.doc_kind === 'Policy') || /policy/i.test(p.policy_name));
    const hasProcedure = forFamily.some((p) => (p.doc_kind === 'Procedure') || /procedure/i.test(p.policy_name));
    return { code: f.code, name: f.name, hasPolicy, hasProcedure };
  });
}