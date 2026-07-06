// Static demo data for the Demo Workspace. All hardcoded — never written to the database,
// so it cannot mix with or affect real production customer records.

export const DEMO_ORG = {
  organization_name: 'Acme Defense Components',
  short_name: 'ADC',
  industry: 'Defense manufacturing supplier',
  target_cmmc_level: 'CMMC Level 2',
  assessment_path: 'Level 2 Self-Assessment',
  uei: 'DEMO123456789',
  cage_code: '1A2B3',
  subscription_tier: 'Premium L2 Readiness',
  project_name: 'ADC CMMC Level 2 Readiness Project',
  project_status: 'In Progress',
  prepared_by: 'Pacific Global Security Group',
  };

export const DEMO_BANNER_TEXT = 'Demo Workspace. Sample data only. Do not use for real client records.';

export const DEMO_EXEC = {
  overallReadiness: 68,
  controlsComplete: 72,
  controlsTotal: 110,
  controlsNeedingEvidence: 24,
  openPoam: 14,
  highRiskBlockers: 3,
  sspStatus: 'Draft, 70% complete',
  evidencePackageStatus: 'In progress',
  sprsStatus: 'Not submitted',
  nextSteps: [
    'Complete CUI scoping review',
    'Upload missing MFA and logging evidence',
    'Close high-risk POA&M items',
    'Review SSP control statements',
    'Prepare SPRS self-assessment package',
  ],
  valueStatement:
    'CMMC Command Center gives company admins one guided workspace for scoping, control assessment, evidence, SSP, POA&M, SPRS preparation, and executive reporting.',
};

export const DEMO_ONBOARDING = {
  items: [
    { label: 'Company profile confirmed', done: true },
    { label: 'CAGE and UEI entered', done: true },
    { label: 'FCI confirmed', done: true },
    { label: 'CUI confirmed', done: true },
    { label: 'DFARS 252.204-7012 indicated', done: true },
    { label: 'Recommended path: CMMC Level 2', done: true },
    { label: 'Selected path: Level 2 Self-Assessment', done: true },
  ],
  explanation:
    'The onboarding wizard helps determine the likely CMMC path and creates a project workspace with the correct modules.',
};

export const DEMO_SCOPING = {
  rows: [
    { label: 'Environment type', value: 'Hybrid enclave' },
    { label: 'CUI stored in', value: 'Microsoft 365 GCC High, SharePoint, managed endpoints, and accounting support repositories' },
    { label: 'In-scope users', value: 'Engineering, contracts, finance, IT administrators' },
    { label: 'In-scope systems', value: 'Entra ID, SharePoint, Intune-managed endpoints, Defender, NinjaOne, accounting file repository' },
    { label: 'External service providers', value: 'Pac-Sec MSP support' },
    { label: 'Out-of-scope systems', value: 'Public website, marketing tools, non-CUI HR system' },
  ],
  boundarySummary:
    "ADC's CUI environment consists of Microsoft 365 GCC High collaboration services, managed Windows endpoints, identity services, endpoint protection, and approved repositories used by personnel supporting DoD contract work.",
  valueStatement:
    'Scoping helps prevent over-including systems, missing CUI assets, or building an SSP around the wrong boundary.',
};

export const DEMO_ASSETS = {
  rows: [
    { name: 'Entra ID', type: 'Cloud Identity Service', scope: 'In Scope', category: 'Security Protection Asset' },
    { name: 'SharePoint CUI Site', type: 'Cloud Repository', scope: 'In Scope', category: 'CUI Asset' },
    { name: 'Engineering Laptop Group', type: 'Endpoint Group', scope: 'In Scope', category: 'CUI Asset' },
    { name: 'NinjaOne', type: 'RMM Tool', scope: 'In Scope', category: 'Security Protection Asset' },
    { name: 'Public Website', type: 'SaaS/Public System', scope: 'Out of Scope', category: 'Out of Scope' },
    { name: 'HR Payroll System', type: 'SaaS Application', scope: 'Out of Scope', category: 'Out of Scope' },
  ],
  valueStatement:
    'The asset inventory connects CUI handling, system scope, control implementation, and evidence collection.',
};

export const DEMO_ASSESSMENT = {
  summary: [
    { label: 'Implemented', count: 72, tone: 'green' },
    { label: 'Partially Implemented', count: 21, tone: 'amber' },
    { label: 'Not Implemented', count: 9, tone: 'red' },
    { label: 'Not Applicable', count: 8, tone: 'slate' },
    { label: 'Needs Review', count: 11, tone: 'blue' },
  ],
  cards: [
    {
      control_id: 'AC.L2-3.1.1',
      control_title: 'Authorized Access Control',
      status: 'Partially Implemented',
      owner: 'IT Admin',
      evidence_status: 'Needs Better Evidence',
      linked_poam: true,
      notes: 'Need updated access review export and role assignment evidence.',
    },
    {
      control_id: 'IA.L2-3.5.3',
      control_title: 'Multifactor Authentication',
      status: 'Implemented',
      owner: 'IT Admin',
      evidence_status: 'Accepted',
      linked_poam: false,
      notes: 'MFA enforced through Conditional Access for all users.',
    },
    {
      control_id: 'AU.L2-3.3.1',
      control_title: 'Audit Logging',
      status: 'Partially Implemented',
      owner: 'Security Lead',
      evidence_status: 'Evidence Uploaded',
      linked_poam: false,
      notes: 'Need retention validation and alerting evidence.',
    },
  ],
  valueStatement:
    'The control assessment ties each requirement to implementation notes, evidence, SSP language, and remediation.',
};

export const DEMO_EVIDENCE = {
  items: [
    { title: 'MFA Conditional Access Policy Screenshot', type: 'Screenshot', controls: 'IA.L2-3.5.3', owner: 'IT Admin', review_status: 'Accepted', evidence_date: '2026-05-12', expiration_date: '2027-05-12' },
    { title: 'Entra ID User MFA Registration Export', type: 'Configuration Export', controls: 'IA.L2-3.5.3', owner: 'IT Admin', review_status: 'Accepted', evidence_date: '2026-05-12', expiration_date: '2027-05-12' },
    { title: 'Defender Endpoint Configuration Screenshot', type: 'Screenshot', controls: 'SI.L2-3.14.2', owner: 'Security Lead', review_status: 'Needs Review', evidence_date: '2026-05-20', expiration_date: '2027-05-20' },
    { title: 'NinjaOne Patch Compliance Report', type: 'Report', controls: 'SI.L2-3.14.1', owner: 'IT Admin', review_status: 'Accepted', evidence_date: '2026-06-01', expiration_date: '2026-09-01' },
    { title: 'SharePoint External Sharing Configuration', type: 'Configuration Export', controls: 'AC.L2-3.1.3', owner: 'IT Admin', review_status: 'Needs Review', evidence_date: '2026-06-02', expiration_date: '2027-06-02' },
    { title: 'Security Awareness Training Completion Report', type: 'Report', controls: 'AT.L2-3.2.1', owner: 'Compliance Manager', review_status: 'Accepted', evidence_date: '2026-04-15', expiration_date: '2027-04-15' },
    { title: 'Visitor Log Template', type: 'Policy', controls: 'PE.L2-3.10.4', owner: 'Compliance Manager', review_status: 'Draft', evidence_date: '2026-03-30', expiration_date: '2027-03-30' },
    { title: 'Incident Response Plan Approval', type: 'Attestation', controls: 'IR.L2-3.6.1', owner: 'Security Lead', review_status: 'Accepted', evidence_date: '2026-05-05', expiration_date: '2027-05-05' },
  ],
  valueStatement:
    'The evidence vault keeps artifacts mapped to controls so the company can build an organized assessment package instead of hunting through folders.',
};

export const DEMO_SSP = {
  sections: [
    { label: 'System Overview', status: 'Complete' },
    { label: 'Boundary Description', status: 'Draft' },
    { label: 'Asset Summary', status: 'Complete' },
    { label: 'Roles and Responsibilities', status: 'Complete' },
    { label: 'Control Implementation Statements', status: '65% complete' },
    { label: 'Evidence References', status: 'In progress' },
    { label: 'Revision History', status: 'Complete' },
  ],
  sampleStatement:
    'ADC limits system access to authorized users based on assigned roles, business need, and approved account provisioning procedures. Access is managed through Entra ID groups, role-based access assignments, MFA enforcement, and periodic access reviews.',
  valueStatement:
    'The SSP builder turns project data, scope, asset inventory, control responses, and evidence into a structured system security plan.',
};

export const DEMO_POAM = {
  items: [
    { title: 'Complete quarterly access review evidence', control: 'AC.L2-3.1.1', risk: 'Moderate', owner: 'IT Admin', status: 'In Progress', target: '30 days' },
    { title: 'Document centralized audit log retention', control: 'AU.L2-3.3.1', risk: 'High', owner: 'Security Lead', status: 'Open', target: '45 days' },
    { title: 'Update incident response tabletop records', control: 'IR.L2-3.6.3', risk: 'Moderate', owner: 'Compliance Manager', status: 'Pending Validation', target: '15 days' },
  ],
  valueStatement:
    'The POA&M tracker converts gaps into accountable remediation work with owners, milestones, and closure evidence.',
};

export const DEMO_POLICIES = {
  items: [
    { name: 'Access Control Policy', status: 'Approved' },
    { name: 'MFA and Authentication Policy', status: 'Approved' },
    { name: 'Incident Response Policy', status: 'In Review' },
    { name: 'Vulnerability Management Policy', status: 'Draft' },
    { name: 'CUI Handling Policy', status: 'In Review' },
    { name: 'Media Protection Policy', status: 'Draft' },
    { name: 'SSP Maintenance Procedure', status: 'Approved' },
  ],
  valueStatement:
    'The policy library gives admins editable, mapped policy templates that support CMMC documentation and evidence requirements.',
};

export const DEMO_SPRS = {
  rows: [
    { label: 'PIEE Account Status', value: 'Role Approved' },
    { label: 'SPRS Role', value: 'SPRS Cyber Vendor User' },
    { label: 'Assessment Type', value: 'Level 2 Self-Assessment' },
    { label: 'Assessment Score', value: '94' },
    { label: 'CMMC Status', value: 'Pending Affirmation' },
    { label: 'Affirming Official', value: 'Jamie Carter' },
    { label: 'Submitted Date', value: 'Not submitted' },
    { label: 'Expiration Date', value: 'Not available' },
  ],
  valueStatement:
    'The SPRS tracker guides admins through PIEE access, SPRS role approval, self-assessment entry, AO affirmation, and evidence capture.',
};

export const DEMO_REPORTS = {
  available: [
    'Executive Readiness Report',
    'Gap Assessment Report',
    'SSP Export',
    'POA&M Export',
    'Evidence Index',
    'Policy Package',
    'SPRS Package',
    'C3PAO Handoff Package',
  ],
  previews: [
    { title: 'Executive Readiness Report', desc: 'Summarizes readiness status, blockers, open gaps, and next decisions for leadership.' },
    { title: 'Gap Assessment Report', desc: 'Shows implemented, partially implemented, and missing requirements with evidence status.' },
    { title: 'C3PAO Handoff Package', desc: 'Packages scope, SSP, POA&M, evidence index, policies, SPRS artifacts, and open risk summary.' },
  ],
  valueStatement:
    'Reports turn the workspace into client-ready deliverables for executives, internal reviews, SPRS preparation, and assessor handoff.',
};

export const DEMO_ACOLYTE = {
  profile: {
    service_tier: 'ACOLYTE CMMC Premium',
    service_status: 'Active',
    readiness_score: 74,
    review_cadence: 'Quarterly',
    pacsec_service_lead: 'Pac-Sec Cyber Operations',
    last_review_date: '2026-06-15',
    next_review_target_date: '2026-09-15',
  },
  posture: [
    { label: 'Endpoint Posture', status: 'Needs Attention' },
    { label: 'Cloud Posture', status: 'Good' },
    { label: 'Identity and Access', status: 'Needs Attention' },
    { label: 'Vulnerability Tracking', status: 'High Risk' },
    { label: 'Incident Readiness', status: 'Needs Attention' },
    { label: 'Compliance Alignment', status: 'Good' },
  ],
  findings: [
    { title: 'Privileged access review evidence is incomplete', category: 'Identity and Access', severity: 'High', status: 'Open' },
    { title: 'Critical endpoint patches pending on engineering laptops', category: 'Vulnerability', severity: 'Critical', status: 'In Progress' },
    { title: 'Audit log retention not fully documented', category: 'Logging and Monitoring', severity: 'Moderate', status: 'Open' },
    { title: 'Incident response tabletop follow-up actions not closed', category: 'Incident Response', severity: 'Moderate', status: 'Pending Validation' },
  ],
  incident: [
    { label: 'IR Plan', value: 'In Review' },
    { label: 'Contact List', value: 'Current' },
    { label: 'Escalation Path', value: 'Draft' },
    { label: 'Tabletop', value: 'Needs Follow-Up' },
    { label: 'Backup & Recovery', value: 'Good' },
  ],
  valueStatement:
    'ACOLYTE is Pac-Sec\u2019s managed cyber readiness service — continuous posture review, vulnerability tracking, remediation coordination, incident readiness, and executive cyber reporting alongside CMMC evidence.',
};

export const DEMO_TOUR_STEPS = [
  'Start with onboarding to determine the CMMC path.',
  'Define the preliminary CUI and FCI scope.',
  'Implement controls and enable supporting security tooling.',
  'Collect and map evidence to each control.',
  'Validate control implementation and close gaps.',
  'Finalize the asset inventory and scope after implementation.',
  'Generate the final SSP once readiness checks pass.',
  'Track remediation in the POA&M.',
  'Prepare PIEE and SPRS self-certification.',
  'Export executive and assessment-ready reports.',
];

export const DEMO_CTA =
  'CMMC Command Center helps defense contractors organize CMMC readiness, evidence, SSP, POA&M, SPRS preparation, and executive reporting in one guided workspace.';