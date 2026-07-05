// NIST SP 800-171A assessment objectives per control. This is the authoritative
// breakdown a C3PAO assesses against. Each control maps to its lettered objectives
// [a], [b], ... For each objective we describe the objective text and the
// evidence type(s) that typically satisfy it.
//
// Coverage: the 17 Level 1 practices in full, plus a representative set of
// Level 2 (NIST 800-171) controls. Controls without an explicit entry fall back
// to a single generic objective so the readiness checker still functions.

const EV = {
  screenshot: 'Screenshot',
  policy: 'Policy Section',
  config: 'Config Export',
  log: 'Log Sample',
  interview: 'Interview Topic',
  procedure: 'Procedure',
};

// objective = { id, text, evidence: [types] }
export const ASSESSMENT_OBJECTIVES = {
  // ===== Access Control (Level 1) =====
  '3.1.1': [
    { id: '3.1.1[a]', text: 'Authorized users are identified.', evidence: [EV.config, EV.screenshot] },
    { id: '3.1.1[b]', text: 'Processes acting on behalf of authorized users are identified.', evidence: [EV.config, EV.interview] },
    { id: '3.1.1[c]', text: 'Devices (and other systems) authorized to connect are identified.', evidence: [EV.config, EV.screenshot] },
    { id: '3.1.1[d]', text: 'System access is limited to authorized users.', evidence: [EV.screenshot, EV.config] },
    { id: '3.1.1[e]', text: 'System access is limited to processes acting on behalf of authorized users.', evidence: [EV.config] },
    { id: '3.1.1[f]', text: 'System access is limited to authorized devices (including other systems).', evidence: [EV.config, EV.screenshot] },
  ],
  '3.1.2': [
    { id: '3.1.2[a]', text: 'The types of transactions and functions authorized users are permitted to execute are defined.', evidence: [EV.policy, EV.config] },
    { id: '3.1.2[b]', text: 'System access is limited to the defined types of transactions and functions for authorized users.', evidence: [EV.screenshot, EV.config] },
  ],
  '3.1.20': [
    { id: '3.1.20[a]', text: 'Connections to external systems are identified.', evidence: [EV.config, EV.interview] },
    { id: '3.1.20[b]', text: 'The use of external systems is identified.', evidence: [EV.policy, EV.interview] },
    { id: '3.1.20[c]', text: 'Connections to external systems are verified/controlled/limited.', evidence: [EV.config, EV.screenshot] },
    { id: '3.1.20[d]', text: 'The use of external systems is verified/controlled/limited.', evidence: [EV.policy, EV.config] },
  ],
  '3.1.22': [
    { id: '3.1.22[a]', text: 'Individuals authorized to post or process information on publicly accessible systems are identified.', evidence: [EV.policy, EV.interview] },
    { id: '3.1.22[b]', text: 'Procedures to ensure FCI is not posted on publicly accessible systems are identified.', evidence: [EV.procedure] },
    { id: '3.1.22[c]', text: 'A review process is in place prior to posting to publicly accessible systems.', evidence: [EV.procedure, EV.interview] },
    { id: '3.1.22[d]', text: 'Content on publicly accessible systems is reviewed to ensure it does not include FCI.', evidence: [EV.screenshot, EV.interview] },
  ],
  // ===== Identification & Authentication (Level 1) =====
  '3.5.1': [
    { id: '3.5.1[a]', text: 'System users are identified.', evidence: [EV.config, EV.screenshot] },
    { id: '3.5.1[b]', text: 'Processes acting on behalf of users are identified.', evidence: [EV.config] },
    { id: '3.5.1[c]', text: 'Devices accessing the system are identified.', evidence: [EV.config, EV.screenshot] },
  ],
  '3.5.2': [
    { id: '3.5.2[a]', text: 'The identity of each user is authenticated/verified as a prerequisite to access.', evidence: [EV.screenshot, EV.config] },
    { id: '3.5.2[b]', text: 'The identity of each process acting on behalf of a user is authenticated/verified as a prerequisite to access.', evidence: [EV.config] },
    { id: '3.5.2[c]', text: 'The identity of each device is authenticated/verified as a prerequisite to access.', evidence: [EV.config, EV.screenshot] },
  ],
  // ===== Media Protection (Level 1) =====
  '3.8.3': [
    { id: '3.8.3[a]', text: 'System media containing FCI is sanitized or destroyed before disposal.', evidence: [EV.procedure, EV.log] },
    { id: '3.8.3[b]', text: 'System media containing FCI is sanitized before it is released for reuse.', evidence: [EV.procedure, EV.log] },
  ],
  // ===== Physical Protection (Level 1) =====
  '3.10.1': [
    { id: '3.10.1[a]', text: 'Authorized individuals allowed physical access are identified.', evidence: [EV.policy, EV.log] },
    { id: '3.10.1[b]', text: 'Physical access to organizational systems is limited to authorized individuals.', evidence: [EV.screenshot, EV.interview] },
    { id: '3.10.1[c]', text: 'Physical access to equipment is limited to authorized individuals.', evidence: [EV.screenshot, EV.interview] },
    { id: '3.10.1[d]', text: 'Physical access to operating environments is limited to authorized individuals.', evidence: [EV.screenshot, EV.interview] },
  ],
  '3.10.3': [
    { id: '3.10.3[a]', text: 'Visitors are escorted.', evidence: [EV.procedure, EV.log] },
    { id: '3.10.3[b]', text: 'Visitor activity is monitored.', evidence: [EV.log, EV.interview] },
  ],
  '3.10.4': [
    { id: '3.10.4[a]', text: 'Audit logs of physical access are maintained.', evidence: [EV.log] },
  ],
  '3.10.5': [
    { id: '3.10.5[a]', text: 'Physical access devices are identified.', evidence: [EV.log, EV.interview] },
    { id: '3.10.5[b]', text: 'Physical access devices are controlled.', evidence: [EV.procedure, EV.log] },
    { id: '3.10.5[c]', text: 'Physical access devices are managed.', evidence: [EV.procedure, EV.log] },
  ],
  // ===== System & Communications Protection (Level 1) =====
  '3.13.1': [
    { id: '3.13.1[a]', text: 'The external system boundary is defined.', evidence: [EV.config, EV.policy] },
    { id: '3.13.1[b]', text: 'Key internal system boundaries are defined.', evidence: [EV.config] },
    { id: '3.13.1[c]', text: 'Communications are monitored at the external boundary.', evidence: [EV.config, EV.screenshot] },
    { id: '3.13.1[d]', text: 'Communications are controlled at the external boundary.', evidence: [EV.config, EV.screenshot] },
    { id: '3.13.1[e]', text: 'Communications are protected at the external boundary.', evidence: [EV.config] },
    { id: '3.13.1[f]', text: 'Communications are monitored/controlled/protected at key internal boundaries.', evidence: [EV.config, EV.screenshot] },
  ],
  '3.13.5': [
    { id: '3.13.5[a]', text: 'Publicly accessible system components are identified.', evidence: [EV.config, EV.interview] },
    { id: '3.13.5[b]', text: 'Subnetworks for publicly accessible components are physically or logically separated from internal networks.', evidence: [EV.config, EV.screenshot] },
  ],
  // ===== System & Information Integrity (Level 1) =====
  '3.14.1': [
    { id: '3.14.1[a]', text: 'The time within which to identify system flaws is specified.', evidence: [EV.policy] },
    { id: '3.14.1[b]', text: 'System flaws are identified within the specified time frame.', evidence: [EV.screenshot, EV.log] },
    { id: '3.14.1[c]', text: 'The time within which to report system flaws is specified.', evidence: [EV.policy] },
    { id: '3.14.1[d]', text: 'System flaws are reported within the specified time frame.', evidence: [EV.log, EV.interview] },
    { id: '3.14.1[e]', text: 'The time within which to correct system flaws is specified.', evidence: [EV.policy] },
    { id: '3.14.1[f]', text: 'System flaws are corrected within the specified time frame.', evidence: [EV.screenshot, EV.log] },
  ],
  '3.14.2': [
    { id: '3.14.2[a]', text: 'Designated locations for malicious code protection are identified.', evidence: [EV.config, EV.policy] },
    { id: '3.14.2[b]', text: 'Protection from malicious code at designated locations is provided.', evidence: [EV.screenshot, EV.config] },
  ],
  '3.14.4': [
    { id: '3.14.4[a]', text: 'Malicious code protection mechanisms are updated when new releases are available.', evidence: [EV.screenshot, EV.config] },
  ],
  '3.14.5': [
    { id: '3.14.5[a]', text: 'The frequency of malicious code scans is defined.', evidence: [EV.policy, EV.config] },
    { id: '3.14.5[b]', text: 'Periodic scans of the system are performed at the defined frequency.', evidence: [EV.screenshot, EV.log] },
    { id: '3.14.5[c]', text: 'Real-time scans of files from external sources are performed as files are downloaded/opened/executed.', evidence: [EV.config, EV.screenshot] },
  ],
};

// Normalize a control_id (e.g. "AC.L1-3.1.1" or "3.1.1") to its dotted requirement number.
export function normalizeRequirementNumber(controlId = '') {
  const m = String(controlId).match(/(\d+\.\d+\.\d+)/);
  return m ? m[1] : String(controlId);
}

// Return the assessment objectives for a control. Falls back to a single generic
// objective when the control isn't in the explicit map, so the checker still works.
export function objectivesForControl(controlId, controlTitle = '') {
  const num = normalizeRequirementNumber(controlId);
  if (ASSESSMENT_OBJECTIVES[num]) return ASSESSMENT_OBJECTIVES[num];
  return [{
    id: `${num}[a]`,
    text: controlTitle
      ? `Determine if the requirement "${controlTitle}" is satisfied by the organization.`
      : 'Determine if the control requirement is satisfied by the organization.',
    evidence: [EV.screenshot, EV.policy, EV.config],
  }];
}

export const EVIDENCE_TYPES = EV;