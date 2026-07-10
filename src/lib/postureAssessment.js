// ACOLYTE Cyber Posture Assessment — question set, weights, and scoring.
//
// 8 weighted domains. Each question is plain-English for a small-business owner
// and carries the remediation content used to auto-build the remediation plan.
//
// Answer values: 'Yes' | 'Partial' | 'No' | 'Not Applicable'
//   Yes = full points, Partial = half, No = 0, N/A excluded from denominator.
// Domain score = weighted percent of applicable points.
// Overall = weighted sum of domain scores normalized to 0-100.

export const ANSWER_OPTIONS = ['Yes', 'Partial', 'No', 'Not Applicable'];

// Domain definitions with weights (sum = 100).
export const POSTURE_DOMAINS = [
  { key: 'identity_access', label: 'Identity & Access', weight: 20 },
  { key: 'endpoint_device', label: 'Endpoint & Device Security', weight: 15 },
  { key: 'network', label: 'Network Security', weight: 10 },
  { key: 'data_protection', label: 'Data Protection & Backup', weight: 15 },
  { key: 'email_cloud', label: 'Email & Cloud Security', weight: 10 },
  { key: 'vendor', label: 'Vendor & Third-Party', weight: 10 },
  { key: 'awareness', label: 'Security Awareness & Training', weight: 10 },
  { key: 'incident', label: 'Incident Readiness', weight: 10 },
];

// One severity level lower — used when an answer is Partial rather than No.
const SEV_ORDER = ['Low', 'Medium', 'High', 'Critical'];
export function lowerSeverity(sev) {
  const i = SEV_ORDER.indexOf(sev);
  return i > 0 ? SEV_ORDER[i - 1] : SEV_ORDER[0];
}

// The seeded question bank. points default to 1 unless a question is weightier.
export const POSTURE_QUESTIONS = [
  // ---- Identity & Access (7) ----
  { key: 'ia_mfa_all', domain: 'identity_access', points: 2, severity_if_no: 'Critical', text: 'Is multi-factor authentication (MFA) required for every user when they sign in to email and business apps?', remediation_title: 'Enforce MFA for all users', remediation_description: 'Turn on and require multi-factor authentication for every user account across email and business applications. This is the single highest-impact control to stop account takeover.', related_control_ids: ['IA.L2-3.5.3', 'AC.L1-3.1.1'] },
  { key: 'ia_admin_mfa', domain: 'identity_access', points: 2, severity_if_no: 'Critical', text: 'Do administrator / owner accounts use MFA and separate credentials from everyday accounts?', remediation_title: 'Protect and separate admin accounts', remediation_description: 'Require MFA on all admin accounts and use dedicated admin credentials that are not used for daily email or browsing.', related_control_ids: ['AC.L2-3.1.5'] },
  { key: 'ia_unique_accounts', domain: 'identity_access', points: 1, severity_if_no: 'High', text: 'Does every person have their own individual login (no shared accounts or shared passwords)?', remediation_title: 'Eliminate shared accounts', remediation_description: 'Give each person a unique account so activity can be attributed. Remove shared logins and shared passwords.', related_control_ids: ['IA.L1-3.5.1'] },
  { key: 'ia_offboarding', domain: 'identity_access', points: 1, severity_if_no: 'High', text: 'When someone leaves, are their accounts and access removed the same day?', remediation_title: 'Formalize prompt offboarding', remediation_description: 'Document and follow a same-day process to disable accounts and revoke access when a person leaves or changes roles.', related_control_ids: ['AC.L1-3.1.1'] },
  { key: 'ia_least_priv', domain: 'identity_access', points: 1, severity_if_no: 'Medium', text: 'Are people given only the access they need for their job (not blanket admin rights)?', remediation_title: 'Apply least-privilege access', remediation_description: 'Review who has elevated access and reduce permissions to the minimum each role needs.', related_control_ids: ['AC.L2-3.1.5'] },
  { key: 'ia_password_policy', domain: 'identity_access', points: 1, severity_if_no: 'Medium', text: 'Is there a password standard (length/complexity) enforced by your systems, not just requested?', remediation_title: 'Enforce a password standard', remediation_description: 'Configure your identity system to enforce a minimum password length and complexity rather than relying on user goodwill.', related_control_ids: ['IA.L2-3.5.7'] },
  { key: 'ia_access_review', domain: 'identity_access', points: 1, severity_if_no: 'Low', text: 'Do you review who has access to systems at least a few times a year?', remediation_title: 'Schedule periodic access reviews', remediation_description: 'Set a recurring calendar reminder to review user access and remove accounts that are no longer needed.', related_control_ids: ['AC.L2-3.1.5'] },

  // ---- Endpoint & Device Security (6) ----
  { key: 'ep_edr', domain: 'endpoint_device', points: 2, severity_if_no: 'Critical', text: 'Is anti-malware / endpoint protection installed and active on all computers?', remediation_title: 'Deploy endpoint protection everywhere', remediation_description: 'Install and enable managed anti-malware / EDR on every laptop and desktop, and confirm it is reporting in.', related_control_ids: ['SI.L1-3.14.2'] },
  { key: 'ep_patching', domain: 'endpoint_device', points: 2, severity_if_no: 'High', text: 'Are operating systems and software updated automatically or on a regular schedule?', remediation_title: 'Establish a patching routine', remediation_description: 'Enable automatic updates or run a monthly patch cycle for operating systems and key applications.', related_control_ids: ['SI.L1-3.14.1'] },
  { key: 'ep_disk_encryption', domain: 'endpoint_device', points: 1, severity_if_no: 'High', text: 'Are laptop hard drives encrypted (e.g., BitLocker / FileVault)?', remediation_title: 'Enable full-disk encryption', remediation_description: 'Turn on full-disk encryption on all laptops so data is protected if a device is lost or stolen.', related_control_ids: ['MP.L2-3.8.1'] },
  { key: 'ep_screen_lock', domain: 'endpoint_device', points: 1, severity_if_no: 'Medium', text: 'Do devices lock automatically after a short period of inactivity?', remediation_title: 'Enforce automatic screen lock', remediation_description: 'Configure devices to lock automatically after a few minutes of inactivity and require a password to unlock.', related_control_ids: ['AC.L2-3.1.10'] },
  { key: 'ep_mdm', domain: 'endpoint_device', points: 1, severity_if_no: 'Medium', text: 'Are company devices centrally managed so you can enforce settings and wipe a lost device?', remediation_title: 'Adopt device management', remediation_description: 'Enroll company devices in a management tool (e.g., Intune) to enforce security settings and remotely wipe lost devices.', related_control_ids: ['CM.L2-3.4.2'] },
  { key: 'ep_admin_rights', domain: 'endpoint_device', points: 1, severity_if_no: 'Medium', text: 'Do everyday users run without local administrator rights on their computers?', remediation_title: 'Remove local admin rights', remediation_description: 'Remove standing local administrator rights from everyday user accounts to limit malware impact.', related_control_ids: ['AC.L2-3.1.5'] },

  // ---- Network Security (5) ----
  { key: 'net_firewall', domain: 'network', points: 2, severity_if_no: 'High', text: 'Is there a firewall protecting your office network and are default passwords changed?', remediation_title: 'Harden network firewall', remediation_description: 'Ensure a firewall is in place, its firmware is current, and any default admin passwords have been changed.', related_control_ids: ['SC.L1-3.13.1'] },
  { key: 'net_wifi', domain: 'network', points: 1, severity_if_no: 'Medium', text: 'Is your Wi-Fi secured with strong encryption and a separate guest network?', remediation_title: 'Secure Wi-Fi and separate guests', remediation_description: 'Use WPA2/WPA3 encryption on business Wi-Fi and provide a separate guest network isolated from business systems.', related_control_ids: ['SC.L1-3.13.5'] },
  { key: 'net_vpn', domain: 'network', points: 1, severity_if_no: 'Medium', text: 'Do remote workers connect through a secure method (VPN or equivalent) rather than exposing systems to the internet?', remediation_title: 'Secure remote access', remediation_description: 'Provide a VPN or zero-trust access solution for remote work and avoid exposing internal systems directly to the internet.', related_control_ids: ['AC.L2-3.1.12'] },
  { key: 'net_segmentation', domain: 'network', points: 1, severity_if_no: 'Low', text: 'Are sensitive systems separated from general office devices on the network?', remediation_title: 'Segment sensitive systems', remediation_description: 'Place sensitive systems on a separate network segment or VLAN from general-purpose devices.', related_control_ids: ['SC.L2-3.13.2'] },
  { key: 'net_no_default', domain: 'network', points: 1, severity_if_no: 'Low', text: 'Have default logins been changed on network gear (routers, switches, access points)?', remediation_title: 'Change default device credentials', remediation_description: 'Change default administrator credentials on all network equipment and store them securely.', related_control_ids: ['CM.L2-3.4.2'] },

  // ---- Data Protection & Backup (6) ----
  { key: 'dp_backups', domain: 'data_protection', points: 2, severity_if_no: 'Critical', text: 'Are important business files backed up automatically?', remediation_title: 'Automate critical backups', remediation_description: 'Set up automatic backups of critical business data on a regular schedule so you can recover from loss or ransomware.', related_control_ids: ['MP.L2-3.8.9'] },
  { key: 'dp_backup_test', domain: 'data_protection', points: 1, severity_if_no: 'High', text: 'Have you tested that you can actually restore files from a backup in the last year?', remediation_title: 'Test backup restores', remediation_description: 'Perform and document a test restore at least annually to confirm backups are usable.', related_control_ids: ['MP.L2-3.8.9'] },
  { key: 'dp_offsite', domain: 'data_protection', points: 1, severity_if_no: 'High', text: 'Is at least one backup copy kept off-site or in the cloud, isolated from your main systems?', remediation_title: 'Keep an isolated backup copy', remediation_description: 'Maintain an off-site or cloud backup copy that is isolated so ransomware cannot encrypt it along with production data.', related_control_ids: ['MP.L2-3.8.9'] },
  { key: 'dp_data_inventory', domain: 'data_protection', points: 1, severity_if_no: 'Medium', text: 'Do you know where your most sensitive information is stored?', remediation_title: 'Inventory sensitive data', remediation_description: 'Identify and document where your most sensitive information (customer, financial, contract) is stored.', related_control_ids: ['MP.L1-3.8.3'] },
  { key: 'dp_disposal', domain: 'data_protection', points: 1, severity_if_no: 'Medium', text: 'Are old devices and media wiped or destroyed securely before disposal?', remediation_title: 'Securely dispose of media', remediation_description: 'Wipe or physically destroy drives and media before disposing of or reselling devices.', related_control_ids: ['MP.L1-3.8.3'] },
  { key: 'dp_sharing', domain: 'data_protection', points: 1, severity_if_no: 'Low', text: 'Is sensitive data shared only through approved, access-controlled tools (not personal email or USB)?', remediation_title: 'Control data sharing', remediation_description: 'Restrict sharing of sensitive data to approved, access-controlled tools and discourage personal email or USB transfer.', related_control_ids: ['AC.L1-3.1.3'] },

  // ---- Email & Cloud Security (5) ----
  { key: 'ec_spam_filter', domain: 'email_cloud', points: 2, severity_if_no: 'High', text: 'Do you have spam and phishing filtering on your email?', remediation_title: 'Enable email threat filtering', remediation_description: 'Turn on spam and anti-phishing protection for your email platform to reduce malicious messages reaching users.', related_control_ids: ['SI.L1-3.14.2'] },
  { key: 'ec_email_auth', domain: 'email_cloud', points: 1, severity_if_no: 'Medium', text: 'Are email anti-spoofing protections (SPF/DKIM/DMARC) configured for your domain?', remediation_title: 'Configure email authentication', remediation_description: 'Publish SPF, DKIM, and DMARC records for your domain to prevent attackers from impersonating your business.', related_control_ids: ['SC.L2-3.13.8'] },
  { key: 'ec_cloud_admin', domain: 'email_cloud', points: 1, severity_if_no: 'High', text: 'Are your cloud/Microsoft 365/Google admin accounts protected with MFA and monitored?', remediation_title: 'Secure cloud admin accounts', remediation_description: 'Enforce MFA on cloud tenant admin accounts and review admin sign-in activity regularly.', related_control_ids: ['IA.L2-3.5.3'] },
  { key: 'ec_sharing_defaults', domain: 'email_cloud', points: 1, severity_if_no: 'Medium', text: 'Are cloud file-sharing defaults set so files are not publicly accessible by default?', remediation_title: 'Tighten cloud sharing defaults', remediation_description: 'Change cloud storage defaults so new files are private and external sharing is limited or requires approval.', related_control_ids: ['AC.L1-3.1.3'] },
  { key: 'ec_audit_logs', domain: 'email_cloud', points: 1, severity_if_no: 'Low', text: 'Are audit logs turned on in your cloud services so activity can be reviewed?', remediation_title: 'Enable cloud audit logging', remediation_description: 'Turn on audit logging in your cloud services so security activity can be reviewed after an incident.', related_control_ids: ['AU.L2-3.3.1'] },

  // ---- Vendor & Third-Party (5) ----
  { key: 'vt_inventory', domain: 'vendor', points: 1, severity_if_no: 'Medium', text: 'Do you keep a list of the outside vendors and software that access your data or systems?', remediation_title: 'Maintain a vendor inventory', remediation_description: 'Create and maintain a list of third parties and SaaS tools that access your data or systems.', related_control_ids: ['CA.L2-3.12.4'] },
  { key: 'vt_msp_security', domain: 'vendor', points: 2, severity_if_no: 'High', text: 'If you use an IT provider (MSP), do you know what security they provide and how they access your systems?', remediation_title: 'Clarify MSP security responsibilities', remediation_description: 'Document what security services your IT provider delivers, how they access your systems, and confirm their access uses MFA.', related_control_ids: ['CA.L2-3.12.4'] },
  { key: 'vt_agreements', domain: 'vendor', points: 1, severity_if_no: 'Medium', text: 'Do contracts with vendors handling your data include security expectations?', remediation_title: 'Add security terms to vendor contracts', remediation_description: 'Ensure vendor agreements include security and data-handling expectations, especially for those touching sensitive data.', related_control_ids: ['CA.L2-3.12.4'] },
  { key: 'vt_access_limit', domain: 'vendor', points: 1, severity_if_no: 'Medium', text: 'Is vendor access to your systems limited to only what they need and removed when finished?', remediation_title: 'Limit and revoke vendor access', remediation_description: 'Grant vendors least-privilege access and remove it promptly when the engagement ends.', related_control_ids: ['AC.L2-3.1.5'] },
  { key: 'vt_review', domain: 'vendor', points: 1, severity_if_no: 'Low', text: 'Do you periodically review whether your key vendors are still trustworthy and secure?', remediation_title: 'Review vendor risk periodically', remediation_description: 'Periodically reassess key vendors for continued trustworthiness and security posture.', related_control_ids: ['CA.L2-3.12.4'] },

  // ---- Security Awareness & Training (5) ----
  { key: 'aw_training', domain: 'awareness', points: 2, severity_if_no: 'High', text: 'Do employees receive security awareness training at least once a year?', remediation_title: 'Provide annual security training', remediation_description: 'Deliver security awareness training to all staff at least annually and track completion.', related_control_ids: ['AT.L2-3.2.1'] },
  { key: 'aw_phishing', domain: 'awareness', points: 1, severity_if_no: 'Medium', text: 'Are staff taught how to recognize and report phishing emails?', remediation_title: 'Train staff on phishing', remediation_description: 'Educate staff on spotting phishing and give them a simple way to report suspicious messages.', related_control_ids: ['AT.L2-3.2.1'] },
  { key: 'aw_reporting', domain: 'awareness', points: 1, severity_if_no: 'Medium', text: 'Do employees know who to contact if they think something is wrong (a security concern)?', remediation_title: 'Publish a way to report concerns', remediation_description: 'Make sure everyone knows who to contact to report a suspected security problem.', related_control_ids: ['IR.L2-3.6.2'] },
  { key: 'aw_acceptable_use', domain: 'awareness', points: 1, severity_if_no: 'Low', text: 'Is there a simple acceptable-use / security policy that staff have seen?', remediation_title: 'Adopt an acceptable-use policy', remediation_description: 'Create a short acceptable-use policy and have staff acknowledge it.', related_control_ids: ['PL.L2-3.15.2'] },
  { key: 'aw_role_training', domain: 'awareness', points: 1, severity_if_no: 'Low', text: 'Do people in sensitive roles get extra training for their responsibilities?', remediation_title: 'Provide role-based training', remediation_description: 'Give additional, role-specific security training to staff in sensitive or privileged roles.', related_control_ids: ['AT.L2-3.2.2'] },

  // ---- Incident Readiness (5) ----
  { key: 'ir_plan', domain: 'incident', points: 2, severity_if_no: 'High', text: 'Do you have a written plan for what to do if you have a security incident?', remediation_title: 'Create an incident response plan', remediation_description: 'Document a simple incident response plan covering who does what, how to contain, and who to notify.', related_control_ids: ['IR.L2-3.6.1'] },
  { key: 'ir_contacts', domain: 'incident', points: 1, severity_if_no: 'Medium', text: 'Do you know who to call (internal and external) during an incident?', remediation_title: 'Maintain incident contacts', remediation_description: 'Keep an up-to-date contact list for internal responders, your IT provider, insurer, and legal.', related_control_ids: ['IR.L2-3.6.2'] },
  { key: 'ir_reporting', domain: 'incident', points: 1, severity_if_no: 'Medium', text: 'Do you know your obligations to report incidents (e.g., to customers or the government)?', remediation_title: 'Understand reporting obligations', remediation_description: 'Identify your contractual and legal incident-reporting obligations and document the timelines.', related_control_ids: ['IR.L2-3.6.1'] },
  { key: 'ir_tabletop', domain: 'incident', points: 1, severity_if_no: 'Low', text: 'Have you practiced or walked through your incident plan at least once?', remediation_title: 'Run a tabletop exercise', remediation_description: 'Walk through a realistic incident scenario with your team to test the plan and find gaps.', related_control_ids: ['IR.L2-3.6.3'] },
  { key: 'ir_logs_retained', domain: 'incident', points: 1, severity_if_no: 'Low', text: 'Are logs kept long enough to investigate if something happened weeks ago?', remediation_title: 'Retain logs for investigation', remediation_description: 'Configure log retention so you can investigate incidents discovered weeks after they occur.', related_control_ids: ['AU.L2-3.3.1'] },
];

// Questions grouped by domain, in domain order — the questionnaire steps.
export function questionsByDomain() {
  return POSTURE_DOMAINS.map((d) => ({
    ...d,
    questions: POSTURE_QUESTIONS.filter((q) => q.domain === d.key),
  }));
}

export function questionCountPerDomain() {
  return POSTURE_DOMAINS.map((d) => ({
    label: d.label,
    count: POSTURE_QUESTIONS.filter((q) => q.domain === d.key).length,
  }));
}

const POINT_FRACTION = { Yes: 1, Partial: 0.5, No: 0 };

// Compute per-domain scores + weighted overall (0-100) from an answers map.
export function scorePosture(answers) {
  const map = answers || {};
  const domain_scores = {};
  let weightedSum = 0;
  let weightUsed = 0;

  for (const d of POSTURE_DOMAINS) {
    const qs = POSTURE_QUESTIONS.filter((q) => q.domain === d.key);
    let points = 0;
    let max = 0;
    let applicable = 0;
    for (const q of qs) {
      const a = map[q.key]?.answer;
      if (!a || a === 'Not Applicable') continue;
      applicable += 1;
      max += q.points;
      points += q.points * (POINT_FRACTION[a] ?? 0);
    }
    const score = max > 0 ? Math.round((points / max) * 100) : 0;
    domain_scores[d.key] = { score, weight: d.weight, applicable, points, max };
    // Domains with no applicable questions drop out of the weighted average.
    if (applicable > 0) {
      weightedSum += score * d.weight;
      weightUsed += d.weight;
    }
  }

  const overall = weightUsed > 0 ? Math.round(weightedSum / weightUsed) : 0;
  return { domain_scores, overall_score: overall };
}

// Answered / total across all questions (ignores N/A vs answered — counts any selection).
export function answeredCount(answers) {
  const map = answers || {};
  const total = POSTURE_QUESTIONS.length;
  const answered = POSTURE_QUESTIONS.filter((q) => map[q.key]?.answer).length;
  return { answered, total };
}

// Red / amber / green band for a 0-100 score.
export function scoreBand(score) {
  const s = Number(score) || 0;
  if (s >= 80) return { label: 'Good', color: '#16a34a', tone: 'green' };
  if (s >= 55) return { label: 'Needs Attention', color: '#d97706', tone: 'amber' };
  return { label: 'High Risk', color: '#dc2626', tone: 'red' };
}

export function domainLabel(key) {
  return POSTURE_DOMAINS.find((d) => d.key === key)?.label || key;
}