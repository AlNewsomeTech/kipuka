// Executive Cyber Report draft generator — user-triggered ACOLYTE Analyst
// Assistant helper. Gathers CURRENT project/module data (strictly scoped by
// project_id, so tenant/project isolation is preserved) and drafts the report
// fields in one LLM call. Nothing is written here — the calling panel shows an
// editable preview and only persists on an explicit user action.
import { base44 } from '@/api/base44Client';
import { OPEN_FINDING_STATUSES } from '@/lib/acolyte';

const strip = (html) => (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const toHtml = (t) => {
  const s = (t || '').trim();
  if (!s) return '';
  return `<p>${s.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;
};

// Fields we can draft (key -> label). Mirrors AcolyteExecutiveReport entity.
export const DRAFT_FIELDS = [
  ['executive_summary', 'Executive Summary'],
  ['readiness_status_summary', 'Cyber Readiness Status'],
  ['major_risks', 'Current Major Risks'],
  ['open_high_priority_findings', 'Open High-Priority Findings'],
  ['remediation_progress', 'Remediation Progress'],
  ['completed_actions', 'Completed Actions'],
  ['incident_readiness_summary', 'Incident Readiness'],
  ['compliance_alignment_summary', 'CMMC Readiness Summary'],
  ['leadership_decisions_needed', 'Leadership Decisions Needed'],
  ['next_recommended_actions', 'Recommended Next Steps'],
];

function monthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const iso = (d) => d.toISOString().slice(0, 10);
  const label = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  return { start: iso(start), end: iso(end), label };
}

// Pull every relevant record for the project. All queries are filtered by
// project_id — no cross-project or cross-tenant data can be included.
export async function gatherProjectData(projectId) {
  const [
    profileRows, reviews, findings, remediations, incidentRows,
    controls, evidence, poams, tools,
  ] = await Promise.all([
    base44.entities.AcolyteProfile.filter({ project_id: projectId }).catch(() => []),
    base44.entities.CyberReadinessReview.filter({ project_id: projectId }, '-created_date').catch(() => []),
    base44.entities.CyberFinding.filter({ project_id: projectId }).catch(() => []),
    base44.entities.AcolyteRemediationItem.filter({ project_id: projectId }).catch(() => []),
    base44.entities.IncidentReadinessRecord.filter({ project_id: projectId }).catch(() => []),
    base44.entities.ControlAssessment.filter({ project_id: projectId }).catch(() => []),
    base44.entities.ProjectEvidence.filter({ project_id: projectId }).catch(() => []),
    base44.entities.ProjectPOAM.filter({ project_id: projectId }).catch(() => []),
    base44.entities.ProjectSecurityTool.filter({ project_id: projectId }).catch(() => []),
  ]);
  return {
    profile: profileRows[0] || null,
    reviews, findings, remediations,
    incident: incidentRows[0] || null,
    controls, evidence, poams, tools,
  };
}

// Count helper for a group-by on a field.
function tally(rows, field) {
  const out = {};
  for (const r of rows) {
    const k = r?.[field] || 'Unknown';
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}
const fmtTally = (t) => Object.entries(t).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none';

// Build a plain-text "source data summary" — shown to the user AND fed to the LLM.
export function buildSourceSummary(data) {
  const { profile, reviews, findings, remediations, incident, controls, evidence, poams, tools } = data;
  const openFindings = findings.filter((f) => OPEN_FINDING_STATUSES.includes(f.finding_status));
  const highFindings = openFindings.filter((f) => ['High', 'Critical'].includes(f.severity));
  const l1 = controls.filter((c) => c.cmmc_level === 'Level 1');
  const l2 = controls.filter((c) => c.cmmc_level === 'Level 2');
  const activeTools = tools.filter((t) => ['Enabled', 'In Review'].includes(t.tool_status));
  const plannedTools = tools.filter((t) => t.tool_status === 'Planned');
  const ninja = tools.find((t) => t.tool_name === 'NinjaOne' && ['Enabled', 'In Review', 'Planned'].includes(t.tool_status));
  const cortex = tools.find((t) => t.tool_name === 'Palo Alto Cortex XDR' && ['Enabled', 'In Review', 'Planned'].includes(t.tool_status));

  const lines = [];
  lines.push(`ACOLYTE Profile: ${profile ? `tier ${profile.service_tier}, status ${profile.service_status}, readiness ${Math.round(profile.current_readiness_score || 0)}%` : 'none on record'}`);
  lines.push(`Readiness Reviews: ${reviews.length} (latest: ${reviews[0]?.review_title || '—'})`);
  lines.push(`Cyber Findings: ${findings.length} total, ${openFindings.length} open, ${highFindings.length} high/critical open`);
  lines.push(`Remediation Items: ${remediations.length} (${fmtTally(tally(remediations, 'status'))})`);
  lines.push(`Incident Readiness: ${incident ? `IR plan ${incident.ir_plan_status}, tabletop ${incident.tabletop_status}, backup/recovery ${incident.backup_recovery_status}` : 'no record'}`);
  lines.push(`CMMC Level 1 Controls: ${l1.length} (${fmtTally(tally(l1, 'status'))})`);
  lines.push(`CMMC Level 2 Controls: ${l2.length} (${fmtTally(tally(l2, 'status'))})`);
  lines.push(`Evidence Items: ${evidence.length} (${fmtTally(tally(evidence, 'review_status'))})`);
  lines.push(`POA&M Items: ${poams.length} (${fmtTally(tally(poams, 'status'))})`);
  lines.push(`Security Tooling: ${activeTools.length} active [${activeTools.map((t) => t.tool_name).join(', ') || '—'}], ${plannedTools.length} planned [${plannedTools.map((t) => t.tool_name).join(', ') || '—'}]`);
  lines.push(`NinjaOne: ${ninja ? ninja.tool_status : 'not enabled/planned'}`);
  lines.push(`Cortex XDR: ${cortex ? cortex.tool_status : 'not enabled/planned'}`);

  const dataPoints =
    findings.length + remediations.length + controls.length + evidence.length +
    poams.length + reviews.length + tools.length + (profile ? 1 : 0) + (incident ? 1 : 0);

  return { summary: lines.join('\n'), dataPoints, hasNinja: !!ninja, hasCortex: !!cortex };
}

// Detailed prompt context (fuller lists for the LLM to reason over).
function detailContext(data) {
  const { findings, remediations, controls, evidence, poams } = data;
  const openFindings = findings.filter((f) => OPEN_FINDING_STATUSES.includes(f.finding_status));
  const highFindings = openFindings.filter((f) => ['High', 'Critical'].includes(f.severity));
  const lines = [];
  lines.push('HIGH/CRITICAL OPEN FINDINGS:');
  lines.push(highFindings.length
    ? highFindings.map((f) => `- [${f.severity}/${f.finding_status}] ${f.finding_title}${f.owner ? ` (owner ${f.owner})` : ''}${f.target_resolution_date ? ` due ${f.target_resolution_date}` : ''}`).join('\n')
    : '- none');
  lines.push('\nREMEDIATION ITEMS:');
  lines.push(remediations.length
    ? remediations.map((r) => `- [${r.priority}/${r.status}] ${r.remediation_title}${r.due_date ? ` due ${r.due_date}` : ''}`).join('\n')
    : '- none');
  lines.push('\nPOA&M ITEMS:');
  lines.push(poams.length
    ? poams.slice(0, 20).map((p) => `- [${p.status || 'Open'}] ${p.poam_title || p.control_id || 'POA&M item'}${p.risk_rating ? ` (${p.risk_rating})` : ''}`).join('\n')
    : '- none');
  lines.push(`\nCONTROL GAPS: ${controls.filter((c) => ['Gap Identified', 'Not Implemented', 'Partially Implemented'].includes(c.status)).length} controls with gaps.`);
  lines.push(`EVIDENCE NEEDING REVIEW: ${evidence.filter((e) => ['Needs Review', 'Draft'].includes(e.review_status)).length}; ACCEPTED: ${evidence.filter((e) => e.review_status === 'Accepted').length}; REJECTED/EXPIRED: ${evidence.filter((e) => ['Rejected', 'Expired'].includes(e.review_status)).length}.`);
  return lines.join('\n');
}

const SYSTEM = `You are the ACOLYTE Analyst Assistant for Pacific Global Security Group (Pac-Sec).
Draft clear, factual, executive-ready cyber report content from the supplied project data only.
Do NOT invent data. If a data source is empty, say so plainly or keep that field brief.
Do NOT claim compliance, certification, or assessment readiness — frame CMMC alignment as advisory/in-progress.
Each field should be concise professional prose or short bullet points. No disclaimers (the app adds one).`;

// Generate all draft fields at once. Returns { fields: {key: html}, meta }.
export async function generateReportDraft({ project, orgName, preparedBy, periodStart, periodEnd, data }) {
  const { summary, hasNinja, hasCortex } = buildSourceSummary(data);
  const period = periodStart && periodEnd ? `${periodStart} to ${periodEnd}` : monthBounds().label;

  const fieldInstructions = DRAFT_FIELDS
    .filter(([key]) => {
      // Only include tool-specific asks when relevant (handled inside prose fields).
      return true;
    })
    .map(([key, label]) => `- ${key}: ${label}`)
    .join('\n');

  const toolNote = [
    hasNinja ? 'Include a brief NinjaOne status note within Security Tooling / readiness prose.' : 'Do NOT mention NinjaOne (not enabled or planned).',
    hasCortex ? 'Include a brief Cortex XDR status note within Security Tooling / readiness prose.' : 'Do NOT mention Cortex XDR (not enabled or planned).',
  ].join(' ');

  const prompt = `${SYSTEM}

CONTEXT
Organization: ${orgName || '—'}
Project: ${project?.project_name || '—'}
Target CMMC Level: ${project?.target_cmmc_level || 'Unknown'}
Reporting Period: ${period}
Prepared By: ${preparedBy || 'Pacific Global Security Group'}

SOURCE DATA SUMMARY
${summary}

DETAIL
${detailContext(data)}

TOOL RULES: ${toolNote}

TASK
Return a JSON object with exactly these keys, each a plain-text string (no markdown headers):
${fieldInstructions}

Guidance:
- executive_summary: 120–200 words, leadership tone, covering posture, top risks, progress, next steps.
- open_high_priority_findings: list high/critical open findings with owner/status/due where available; if none, state "No high-priority findings are currently recorded for this reporting period."
- compliance_alignment_summary: summarize CMMC L1/L2 control status, gaps, evidence review needs (advisory).
- next_recommended_actions: a short numbered list of specific, actionable next steps.
Keep every field grounded ONLY in the data above.`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: Object.fromEntries(DRAFT_FIELDS.map(([key]) => [key, { type: 'string' }])),
    },
  });

  const fields = {};
  for (const [key] of DRAFT_FIELDS) {
    fields[key] = toHtml(result?.[key]);
  }
  return { fields, meta: { period, hasNinja, hasCortex } };
}

// Default header values for a fresh report.
export function defaultReportHeader({ orgName, user, existing }) {
  const mb = monthBounds();
  return {
    report_title: existing?.report_title || `Executive Cyber Report - ${orgName || 'Client'} - ${mb.label}`,
    prepared_by: existing?.prepared_by || user?.full_name || 'Pacific Global Security Group',
    report_period_start: existing?.report_period_start || mb.start,
    report_period_end: existing?.report_period_end || mb.end,
  };
}

export { strip as stripHtml, toHtml as textToHtml, monthBounds };