// Central source of truth for Pacific Global Security Group legal notices.
// These are the defaults used when no TermsSettings record has been configured by an admin.

export const DEFAULT_TERMS_VERSION = 'PacSec-CMMCCommandCenter-Terms-v1.0';

export const DEFAULT_TERMS_TITLE = 'Terms and Conditions of Use';
export const TERMS_SUBTITLE = 'Pacific Global Security Group — Kipuka';

export const LOGIN_MODAL_TITLE = 'Authorized Use and Confidentiality Notice';

export const LOGIN_MODAL_BODY = `This is a proprietary Pacific Global Security Group system. Access is restricted to authorized users only. By accessing this system, you acknowledge that all data, workflows, reports, templates, evidence, documentation, processes, generated content, and system functionality are confidential and proprietary to Pacific Global Security Group and/or its authorized clients.

Unauthorized access, attempted access, disclosure, copying, distribution, modification, export, misuse, or improper handling of system data is strictly prohibited. Activity in this system may be logged, reviewed, and audited. Any unauthorized access or misuse may result in account termination, contractual remedies, civil action, criminal referral, or other appropriate enforcement action.

By continuing, you agree to comply with Pacific Global Security Group policies, client confidentiality obligations, applicable contracts, applicable laws, and the Terms and Conditions of Use.`;

export const ACCEPTANCE_CHECKBOX_TEXT =
  'I have read, understand, and agree to the Terms and Conditions of Use and acknowledge that this is a confidential and proprietary Pacific Global Security Group system.';

export const FOOTER_WARNING_TEXT =
  'Confidential and Proprietary System. This system, including all data, workflows, reports, documentation, evidence, client records, processes, templates, and generated outputs, is proprietary to Pacific Global Security Group. Unauthorized access, use, disclosure, copying, distribution, or handling of system data is strictly prohibited.';

export const REPORT_FOOTER_SHORT =
  'Confidential and Proprietary. Prepared by Pacific Global Security Group. Unauthorized access, use, disclosure, copying, or distribution is prohibited.';

export const REPORT_COVER_NOTICE =
  'This report and all associated data, analysis, templates, workflows, and generated content are confidential and proprietary to Pacific Global Security Group and/or its authorized client. Use is restricted to authorized business, compliance, and cybersecurity purposes only.';

// Ordered Terms and Conditions sections rendered on the Terms page.
export const TERMS_SECTIONS = [
  {
    heading: 'A. Authorized Use Only',
    body: 'This system is provided by Pacific Global Security Group for authorized business, cybersecurity, compliance, managed services, CMMC readiness, documentation, evidence management, reporting, and client support purposes only. Access is limited to authorized users with a legitimate business need.',
  },
  {
    heading: 'B. Proprietary System and Data',
    body: 'All system functionality, workflows, templates, reports, prompts, documentation, evidence structures, client records, compliance mappings, assessment processes, generated outputs, configuration data, and related materials are confidential and proprietary to Pacific Global Security Group, its affiliates, or its authorized clients. No ownership rights are transferred to any user by virtue of system access.',
  },
  {
    heading: 'C. Confidentiality Obligations',
    body: 'Users must protect all information accessed through the system as confidential. Users may not disclose, copy, export, download, transmit, reproduce, screenshot, distribute, or otherwise use system data except as specifically authorized for legitimate business purposes.',
  },
  {
    heading: 'D. Client Data and Compliance Data',
    body: 'The system may contain sensitive client information, cybersecurity data, CMMC readiness information, system security plan content, evidence records, POA&M information, user records, project notes, assessment materials, and other non-public information. Users must handle all such data according to applicable contracts, confidentiality obligations, security policies, and legal requirements.',
  },
  {
    heading: 'E. Unauthorized Access and Misuse',
    body: 'Unauthorized access, attempted access, credential sharing, privilege misuse, data scraping, improper export, unauthorized disclosure, reverse engineering, copying of workflows, misuse of generated content, or handling data outside approved business purposes is strictly prohibited. Pacific Global Security Group reserves the right to investigate suspected misuse and take appropriate action.',
  },
  {
    heading: 'F. Monitoring and Logging',
    body: 'System activity may be logged, monitored, reviewed, retained, and audited for security, compliance, operational, legal, and administrative purposes. By using the system, users consent to such logging, monitoring, review, retention, and auditing.',
  },
  {
    heading: 'G. User Responsibilities',
    body: 'Users are responsible for maintaining the confidentiality of their credentials, using only their assigned account, protecting client and company data, reporting suspected security incidents, and following all applicable Pacific Global Security Group and client policies.',
  },
  {
    heading: 'H. No Unauthorized Reliance',
    body: 'System content, generated documentation, compliance walkthroughs, CMMC guidance, SSP content, POA&M content, evidence guidance, and related outputs are provided for operational support. Users are responsible for reviewing, validating, and approving all content before submission, client delivery, or official use. This system does not replace official DoD, CMMC Program, DFARS, SPRS, PIEE, legal, contractual, or C3PAO requirements.',
  },
  {
    heading: 'I. Intellectual Property',
    body: 'All platform design, processes, templates, workflows, prompts, report formats, documentation structures, data models, generated formats, system configurations, and related materials are proprietary intellectual property of Pacific Global Security Group unless otherwise stated in writing. Users may not copy, reproduce, reuse, adapt, resell, distribute, or create derivative works from the system or its contents without written authorization.',
  },
  {
    heading: 'J. Data Handling Restrictions',
    body: 'Users may not move, export, transmit, or store system data outside approved systems or approved client/project repositories unless specifically authorized. Users may not upload unauthorized, malicious, regulated, classified, export-controlled, or otherwise prohibited information into the system.',
  },
  {
    heading: 'K. Account Termination and Enforcement',
    body: 'Pacific Global Security Group may suspend, restrict, or terminate access at any time for security, operational, legal, contractual, or policy reasons. Unauthorized access, misuse, or improper data handling may result in account termination, removal from projects, contractual remedies, civil action, criminal referral, or other appropriate enforcement action.',
  },
  {
    heading: 'L. Changes to Terms',
    body: 'Pacific Global Security Group may update these Terms and Conditions of Use at any time. Continued access may require users to review and accept updated terms.',
  },
  {
    heading: 'M. Acceptance',
    body: 'By accessing or using the system, the user confirms that they have read, understand, and agree to these Terms and Conditions of Use and acknowledge that the system is confidential and proprietary to Pacific Global Security Group.',
  },
];

export const TERMS_LEGAL_DISCLAIMER =
  'This Terms and Conditions template is provided for operational system use and should be reviewed by legal counsel before formal adoption.';