// Incident Response Plan generator. Merges the org's IR team, assets, and
// environment with the standard IR phases and the DFARS 252.204-7012 cyber
// incident reporting requirements to produce a complete IRP document body (HTML).

export const IR_PHASES = [
  'Preparation',
  'Detection & Analysis',
  'Containment',
  'Eradication & Recovery',
  'Post-Incident Activity',
];

// DFARS 252.204-7012 mandatory reporting facts — surfaced in the plan and in the UI.
export const DFARS_REQUIREMENTS = [
  'Report cyber incidents to the DoD within 72 hours of discovery via DIBNet at https://dibnet.dod.mil.',
  'A valid ECA or DoD-approved medium-assurance certificate is required to submit an incident report through DIBNet.',
  'Submit malicious software discovered and isolated in connection with a reported incident to the DoD Cyber Crime Center (DC3), separately from DIBNet.',
  'Preserve and protect images of all known affected information systems and all relevant monitoring/packet capture data for at least 90 days from the incident report to allow DoD to request the media.',
  'Provide access to additional information or equipment necessary to conduct a forensic analysis upon DoD request.',
  'Rapidly report includes, at a minimum, the information required by the Incident Collection Format (ICF) on DIBNet.',
];

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// team = [{ name, role, phone, email, escalation_order }]
function teamTable(team) {
  const sorted = [...(team || [])].sort((a, b) => (a.escalation_order ?? 99) - (b.escalation_order ?? 99));
  if (!sorted.length) return '<p><em>No incident response team members defined yet. Add team members to populate this section.</em></p>';
  const rows = sorted.map((m) => `<tr>
    <td>${esc(m.escalation_order ?? '')}</td>
    <td>${esc(m.name)}</td>
    <td>${esc(m.role)}</td>
    <td>${esc(m.phone)}</td>
    <td>${esc(m.email)}</td>
  </tr>`).join('');
  return `<table><thead><tr><th>Order</th><th>Name</th><th>Role</th><th>Phone</th><th>Email</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function buildIrpBody({ plan, org, project, assets = [] }) {
  const orgName = org?.organization_name || 'the Organization';
  const cuiAssets = assets.filter((a) => a.handles_cui || a.scope_category === 'CUI Asset');
  const detection = plan?.detection_sources || 'Endpoint detection & response (EDR), SIEM/log monitoring, user reports, and cloud security alerts.';

  return `<h1>Incident Response Plan</h1>
<p><strong>Organization:</strong> ${esc(orgName)}<br/>
<strong>System / Project:</strong> ${esc(project?.project_name || '—')}<br/>
<strong>Environment:</strong> ${esc(project?.assessment_path || '—')}<br/>
<strong>Plan Status:</strong> ${esc(plan?.plan_status || 'Draft')}<br/>
<strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>

<h2>1. Purpose &amp; Scope</h2>
<p>This Incident Response Plan (IRP) establishes ${esc(orgName)}'s process for detecting, responding to, and recovering from cybersecurity incidents affecting systems that process, store, or transmit Federal Contract Information (FCI) and Controlled Unclassified Information (CUI). It satisfies NIST SP 800-171 requirement family 3.6 (Incident Response) and the reporting obligations of DFARS clause 252.204-7012.</p>
<p>The plan applies to all in-scope systems and personnel, including ${cuiAssets.length} identified CUI-handling asset(s).</p>

<h2>2. Incident Response Team &amp; Escalation</h2>
${teamTable(plan?.team_members)}

<h2>3. Incident Response Phases</h2>
<h3>3.1 Preparation</h3>
<p>Maintain the IR plan, tools, and training. Ensure logging and monitoring are enabled across in-scope assets. Detection sources: ${esc(detection)}</p>
<h3>3.2 Detection &amp; Analysis</h3>
<p>Identify and validate potential incidents from the detection sources above. Classify severity and determine whether CUI or FCI is involved. Begin the incident log entry immediately.</p>
<h3>3.3 Containment</h3>
<p>${esc(plan?.containment_notes || 'Isolate affected systems, disable compromised accounts, and preserve forensic evidence before remediation. Preserve system images and monitoring data.')}</p>
<h3>3.4 Eradication &amp; Recovery</h3>
<p>${esc(plan?.recovery_notes || 'Remove the root cause, rebuild or restore affected systems from known-good backups, validate integrity, and return systems to production under heightened monitoring.')}</p>
<h3>3.5 Post-Incident Activity</h3>
<p>Conduct a lessons-learned review, update controls and this plan, and retain records. Confirm all required external reports were submitted.</p>

<h2>4. DFARS 252.204-7012 Cyber Incident Reporting Requirements</h2>
<p>${esc(plan?.external_reporting_notes || 'For any cyber incident affecting a covered contractor information system or covered defense information, the following DoD reporting obligations apply:')}</p>
<ul>
${DFARS_REQUIREMENTS.map((r) => `<li>${esc(r)}</li>`).join('')}
</ul>
<p><strong>Reporting portal:</strong> DIBNet — https://dibnet.dod.mil (requires an ECA / DoD-approved medium-assurance certificate).<br/>
<strong>Malicious software submission:</strong> DoD Cyber Crime Center (DC3).<br/>
<strong>Evidence preservation:</strong> retain images and monitoring/packet-capture data for at least 90 days.</p>

<h2>5. Communications</h2>
<p>${esc(plan?.communications_notes || 'Internal notifications follow the escalation order above. External notifications (DoD via DIBNet, prime contractors, law enforcement, and affected parties) are made as required by contract and regulation.')}</p>

<h2>6. Incident Log</h2>
<p>All incidents are recorded in the organization's Incident Log, including date, description, category, affected assets, actions taken, and whether the incident was reported to DIBNet (with report date and ICF number). The incident log is retained as incident-response evidence.</p>`;
}