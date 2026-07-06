// ACOLYTE Analyst Assistant — user-triggered AI drafting helpers. Every function
// here is invoked manually by a user action. Nothing runs on a schedule; nothing
// writes to records — the calling UI shows an editable preview and only persists
// after the user clicks "Apply to Record".
import { base44 } from '@/api/base44Client';
import { roleHasPerm, isReadOnly, PERMS } from '@/lib/orgRoles';

export const ASSISTANT_BRAND = {
  name: 'ACOLYTE Analyst Assistant',
  subtitle: 'Pac-Sec Drafting Assistant',
  description:
    'The ACOLYTE Analyst Assistant helps summarize cyber readiness, draft executive language, explain findings, recommend remediation steps, and align operational issues to CMMC readiness. It supports Pac-Sec analysts and client admins but does not replace professional review.',
};

// Shown near every assistant action.
export const ASSISTANT_DISCLAIMER =
  'Generated content is for drafting and operational support only. Pac-Sec staff or authorized customer personnel must review and validate all content before client delivery, compliance use, or official submission.';

// Shown on generated previews.
export const REVIEW_NOTICE =
  'Generated content must be reviewed by Pac-Sec staff before client delivery or official use.';

// ---- Permissions ------------------------------------------------------------
// Executive Viewer and Auditor Viewer are read-only: no generation.
// Evidence Contributor cannot generate. IT Admin may only run finding/remediation
// actions. Everyone else with compliance/technical/support authority may run all.
const FINDING_ACTIONS = new Set(['explain_impact', 'draft_remediation', 'map_cmmc']);

export function canUseAssistant(orgRole, actionKey) {
  if (!orgRole) return false;
  if (isReadOnly(orgRole)) return false; // Executive Viewer / Auditor Viewer

  if (orgRole === 'IT Admin') {
    // Finding + remediation drafting only.
    return FINDING_ACTIONS.has(actionKey);
  }
  if (orgRole === 'Evidence Contributor') return false;

  // Pac-Sec Admin/Support, Org Owner/Admin, Compliance Manager.
  return (
    roleHasPerm(orgRole, PERMS.MANAGE_COMPLIANCE) ||
    roleHasPerm(orgRole, PERMS.PACSEC_SUPPORT) ||
    roleHasPerm(orgRole, PERMS.MANAGE_TECHNICAL)
  );
}

// ---- Prompt helpers ---------------------------------------------------------
const strip = (html) => (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

function projectHeader(project, orgName) {
  return [
    `Organization: ${orgName || '—'}`,
    `Project: ${project?.project_name || '—'}`,
    `Target CMMC Level: ${project?.target_cmmc_level || 'Unknown'}`,
    `Assessment Path: ${project?.assessment_path || 'Unknown'}`,
  ].join('\n');
}

function findingLines(findings = []) {
  if (!findings.length) return 'No findings recorded.';
  return findings
    .map((f) => `- [${f.severity} / ${f.finding_status}] ${f.finding_title} (${f.finding_category})${f.owner ? ` — owner ${f.owner}` : ''}`)
    .join('\n');
}

function remediationLines(items = []) {
  if (!items.length) return 'No remediation items recorded.';
  return items
    .map((r) => `- [${r.priority} / ${r.status}] ${r.remediation_title}${r.due_date ? ` — due ${r.due_date}` : ''}`)
    .join('\n');
}

const SYSTEM = `You are the ACOLYTE Analyst Assistant, a drafting aid for Pacific Global Security Group (Pac-Sec) cyber readiness analysts.
Write clear, professional, plain-language content suitable for a managed-security service context.
Be concise and factual. Do not invent data that was not provided. Do not claim compliance; frame CMMC alignment as advisory.
Return well-structured prose with short paragraphs or bullet points. Do not include a disclaimer — the application adds one.`;

async function run(prompt) {
  const text = await base44.integrations.Core.InvokeLLM({
    prompt: `${SYSTEM}\n\n${prompt}`,
  });
  return typeof text === 'string' ? text.trim() : String(text || '');
}

// ---- Generators (all user-triggered) ---------------------------------------

export async function summarizeReadiness({ project, orgName, profile, reviews = [], findings = [], remediations = [], incident }) {
  const openF = findings.filter((f) => ['Open', 'In Progress', 'Pending Validation'].includes(f.finding_status));
  const prompt = `Task: Summarize the current ACOLYTE cyber readiness in a concise briefing (150–250 words).

${projectHeader(project, orgName)}
Service Tier: ${profile?.service_tier || '—'} | Service Status: ${profile?.service_status || '—'}
Readiness Score: ${Math.round(profile?.current_readiness_score || project?.current_readiness_score || 0)}%
Posture — Endpoint: ${profile?.endpoint_posture_status || 'Unknown'}, Cloud: ${profile?.cloud_posture_status || 'Unknown'}, Identity: ${profile?.identity_access_status || 'Unknown'}, Vulnerability: ${profile?.vulnerability_status || 'Unknown'}, Incident Readiness: ${profile?.incident_readiness_status || 'Unknown'}, Compliance: ${profile?.compliance_alignment_status || 'Unknown'}
Open findings (${openF.length}):
${findingLines(openF)}
Remediation:
${remediationLines(remediations)}
Incident readiness plan status: ${incident?.ir_plan_status || 'Unknown'}; tabletop: ${incident?.tabletop_status || 'Unknown'}
Most recent reviews: ${reviews.slice(0, 3).map((r) => r.review_title).join('; ') || 'none'}

Provide: overall posture, the most significant risks, and the top priorities right now.`;
  return run(prompt);
}

export async function draftExecutiveSummary({ project, orgName, profile, findings = [], remediations = [], incident }) {
  const openF = findings.filter((f) => ['Open', 'In Progress', 'Pending Validation'].includes(f.finding_status));
  const prompt = `Task: Draft leadership-ready executive summary language for an ACOLYTE Executive Cyber Report.
Audience: organizational executives / leadership. Tone: clear, non-alarmist, decision-oriented.

${projectHeader(project, orgName)}
Readiness Score: ${Math.round(profile?.current_readiness_score || 0)}%
Open findings (${openF.length}):
${findingLines(openF)}
Remediation:
${remediationLines(remediations)}
Incident readiness: plan ${incident?.ir_plan_status || 'Unknown'}, tabletop ${incident?.tabletop_status || 'Unknown'}, backup/recovery ${incident?.backup_recovery_status || 'Unknown'}

Structure the summary with brief labeled sections: Current Posture, Major Risks, Progress, Decisions Needed, Next Steps.`;
  return run(prompt);
}

export async function explainFindingImpact({ project, orgName, finding }) {
  const prompt = `Task: Explain the impact of a single cyber finding in plain language for a business audience.

${projectHeader(project, orgName)}
Finding: ${finding?.finding_title}
Category: ${finding?.finding_category} | Severity: ${finding?.severity} | Status: ${finding?.finding_status}
Description: ${strip(finding?.description) || '—'}
Affected Systems: ${strip(finding?.affected_systems) || '—'}

Cover three short sections: Business Impact, Operational Risk, and Compliance Relevance (how it may relate to CMMC readiness, advisory only).`;
  return run(prompt);
}

export async function draftRemediationRecommendation({ project, orgName, finding }) {
  const prompt = `Task: Draft a recommended remediation approach for a single cyber finding.

${projectHeader(project, orgName)}
Finding: ${finding?.finding_title}
Category: ${finding?.finding_category} | Severity: ${finding?.severity}
Description: ${strip(finding?.description) || '—'}
Recommended Action (existing notes): ${strip(finding?.recommended_action) || '—'}

Provide: numbered remediation steps, owner guidance (who should typically own this), validation notes (how to confirm it is fixed), and possible evidence needed to demonstrate closure.`;
  return run(prompt);
}

export async function mapFindingToCmmc({ project, orgName, finding }) {
  const prompt = `Task: Suggest likely related CMMC domains or controls for a cyber finding. This is advisory and REVIEW-ONLY — a human must confirm before anything is linked.

${projectHeader(project, orgName)}
Finding: ${finding?.finding_title}
Category: ${finding?.finding_category}
Description: ${strip(finding?.description) || '—'}

List the most likely relevant CMMC domains (e.g., Access Control, Incident Response, Configuration Management) and, where reasonable, example control identifiers. For each, give a one-line rationale. Clearly state these are suggestions requiring analyst confirmation.`;
  return run(prompt);
}

export async function draftIncidentReadinessSummary({ project, orgName, incident, findings = [] }) {
  const prompt = `Task: Draft an incident readiness summary.

${projectHeader(project, orgName)}
IR Plan Status: ${incident?.ir_plan_status || 'Unknown'}
Incident Contact List: ${incident?.incident_contact_list_status || 'Unknown'}
Escalation Path: ${incident?.escalation_path_status || 'Unknown'}
Tabletop Status: ${incident?.tabletop_status || 'Unknown'} (last: ${incident?.last_tabletop_date || '—'}, next target: ${incident?.next_tabletop_target_date || '—'})
Backup / Recovery: ${incident?.backup_recovery_status || 'Unknown'}
Follow-up actions (existing): ${strip(incident?.follow_up_actions) || '—'}
Related incident-response findings: ${findingLines(findings.filter((f) => f.finding_category === 'Incident Response'))}

Summarize overall incident readiness, note the open follow-ups, and highlight any leadership concerns that need attention.`;
  return run(prompt);
}

export async function draftReviewNarrative({ project, orgName, review, findings = [], remediations = [], incident, notes }) {
  const prompt = `Task: Draft a monthly/periodic cyber readiness review narrative.

${projectHeader(project, orgName)}
Review: ${review?.review_title || '(new review)'} | Type: ${review?.review_type || 'Monthly Review'}
Period: ${review?.review_period_start || '—'} to ${review?.review_period_end || '—'}
Posture — Endpoint: ${review?.endpoint_posture_status || 'Unknown'}, Cloud: ${review?.cloud_posture_status || 'Unknown'}, Vulnerability: ${review?.vulnerability_status || 'Unknown'}, Identity: ${review?.identity_access_status || 'Unknown'}, Incident: ${review?.incident_readiness_status || 'Unknown'}, Compliance: ${review?.compliance_alignment_status || 'Unknown'}
Findings:
${findingLines(findings)}
Remediation:
${remediationLines(remediations)}
Incident readiness plan: ${incident?.ir_plan_status || 'Unknown'}
Analyst notes: ${strip(notes) || '—'}

Produce sections: Executive Summary, Key Risks, Completed Actions, Recommended Next Steps, and Leadership Decisions Needed.`;
  return run(prompt);
}