// Step-by-step PIEE/SPRS submission walkthrough content. Static reference data.
export const PIEE_STEPS = [
  {
    key: 'piee_account',
    title: '1. Create a PIEE Account',
    detail: 'Go to https://piee.eb.mil and register for a Procurement Integrated Enterprise Environment (PIEE) account. You will need your company CAGE code and your business email.',
    link: 'https://piee.eb.mil',
  },
  {
    key: 'request_role',
    title: '2. Request the SPRS Role',
    detail: 'Inside PIEE, request access to the SPRS application. Select the "SPRS Cyber Vendor User" role so you can enter and affirm your CMMC self-assessment score.',
  },
  {
    key: 'cam_approval',
    title: '3. Wait for CAM Approval',
    detail: 'Your Contractor Administrator (CAM) must approve the role request. If your company has no CAM, the first user requesting the CAM role establishes it. Approval can take several business days.',
  },
  {
    key: 'enter_score',
    title: '4. Enter Your Assessment Score',
    detail: 'Once approved, open SPRS and enter your CMMC self-assessment. Record the assessment date, scope, CAGE(s), and the score (110 max for Level 2; Level 1 is met/not-met per objective).',
  },
  {
    key: 'record_uid',
    title: '5. Record the CMMC Unique Identifier (UID)',
    detail: 'After submission, SPRS issues a CMMC UID. Capture this value — it is your proof of record and is referenced on DoD contracts.',
  },
  {
    key: 'affirm',
    title: '6. Complete the Affirmation',
    detail: 'A senior affirming official must affirm continuing compliance in SPRS. Record the affirming official name, email, and the affirmation date. Affirmations must be renewed annually.',
  },
  {
    key: 'expiration',
    title: '7. Track the Expiration Date',
    detail: 'Self-assessments are valid for a limited period (typically 1 year for the affirmation, 3 years for the assessment). Set a reminder before expiration and re-affirm as required.',
  },
];

export const PIEE_STATUS_OPTIONS = ['Not Started', 'Account Created', 'Role Requested', 'Role Approved', 'Issue', 'Complete'];
export const SPRS_ROLE_OPTIONS = ['None', 'Contractor Vendor Support Role', 'SPRS Cyber Vendor User', 'Unknown'];
export const SPRS_ACCESS_OPTIONS = ['Not Started', 'Pending CAM Approval', 'Approved', 'Issue', 'Complete'];
export const ASSESSMENT_TYPE_OPTIONS = ['Level 1 Self-Assessment', 'Level 2 Self-Assessment', 'Level 2 C3PAO', 'Unknown'];
export const CMMC_STATUS_OPTIONS = ['Draft', 'Pending Affirmation', 'Conditional', 'Final', 'Expired', 'Unknown'];