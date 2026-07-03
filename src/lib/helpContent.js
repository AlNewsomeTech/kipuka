// Help Center article content. Static reference data, rendered as markdown.
import {
  Rocket, ShieldCheck, Layers, ListChecks, FileStack, AlertTriangle,
  BadgeCheck, BarChart3, Users, HelpCircle, Mail,
} from 'lucide-react';

export const HELP_ARTICLES = [
  {
    slug: 'getting-started', title: 'Getting Started', icon: Rocket,
    summary: 'Set up your organization, create a project, and navigate the Command Center.',
    body: `## Getting Started

Welcome to the CMMC Command Center by Pacific Global Security Group.

### 1. Confirm your organization
Open **Organization Settings** to review your company profile, CAGE code(s), UEI, and subscription tier.

### 2. Create a project
Go to **Projects → New Project**. The wizard walks you through company profile, contract data, and CMMC level determination, then recommends your assessment path.

### 3. Work the project modules
Each project has a left-hand workspace: Scoping, Asset Inventory, Assessment, Evidence, SSP, POA&M, Policies, SPRS/PIEE, Maintenance, and Reports. Work them in order for the smoothest path to readiness.

### 4. Track progress
The project dashboard and **Role Dashboards** roll up readiness, evidence gaps, open POA&M items, and upcoming dates.`,
  },
  {
    slug: 'level-1-guide', title: 'CMMC Level 1 Guide', icon: ShieldCheck,
    summary: 'The 15 practices for protecting Federal Contract Information (FCI).',
    body: `## CMMC Level 1 Guide

Level 1 covers **17 practices** (FAR 52.204-21) for safeguarding Federal Contract Information (FCI). It is met through an **annual self-assessment**.

### What FCI is
FCI is information provided by or generated for the Government under a contract that is **not intended for public release**.

### How to complete Level 1 here
1. **Scoping** — confirm you handle FCI and define the boundary.
2. **Asset Inventory** — list the assets in scope.
3. **Assessment** — mark each Level 1 control Implemented / Not Implemented and add an implementation summary.
4. **Evidence** — upload a screenshot or export for each practice.
5. **SPRS / PIEE** — enter your self-assessment result and affirm.`,
  },
  {
    slug: 'level-2-guide', title: 'CMMC Level 2 Guide', icon: Layers,
    summary: 'The 110 NIST SP 800-171 controls and the C3PAO path.',
    body: `## CMMC Level 2 Guide

Level 2 covers the **110 controls in NIST SP 800-171** for protecting Controlled Unclassified Information (CUI). Depending on the contract, it is met by **self-assessment** or a **C3PAO assessment**.

### Full Level 2 workflow
The full Level 2 workflow — CUI scoping, full evidence vault, the complete SSP builder, and the C3PAO handoff package — is available on **Professional L2** and above. C3PAO handoff export requires **Premium L2 Readiness** or **Pac-Sec Managed**.

### Recommended order
Scoping (CUI) → Asset Inventory → Assessment (110 controls) → Evidence → SSP → POA&M → Policies → SPRS/PIEE → Reports.`,
  },
  {
    slug: 'evidence-guide', title: 'Evidence Collection Guide', icon: ListChecks,
    summary: 'How to capture, tag, and review defensible evidence.',
    body: `## Evidence Collection Guide

Good evidence is **specific, dated, and mapped to a control**.

### In the Evidence module
- Upload the file (screenshot, config export, policy, log).
- Give it a clear title and set the evidence date.
- Map it to one or more controls.
- Set a review status (Draft → Needs Review → Accepted).

### Tips
- Prefer configuration exports over screenshots where possible.
- Set expiration dates on time-sensitive evidence so the Maintenance module can prompt a refresh.
- Every tracked control should have at least one accepted piece of evidence before assessment.`,
  },
  {
    slug: 'ssp-guide', title: 'SSP Builder Guide', icon: FileStack,
    summary: 'Draft, edit, and export your System Security Plan.',
    body: `## SSP Builder Guide

The **System Security Plan (SSP)** describes your system, boundary, and how each control is implemented.

### Build it
1. Open the **SSP** module and click **Build SSP**. The builder drafts each section from your project, scoping, asset, control, evidence, and POA&M data.
2. Edit each section inline. Sections save as you go.
3. Review control implementation statements and fill any gaps flagged.
4. Export a branded PDF with revision history and an approval block.

The SSP builder is drafting assistance — always review generated content for accuracy.`,
  },
  {
    slug: 'poam-guide', title: 'POA&M Guide', icon: AlertTriangle,
    summary: 'Track and close gaps with a Plan of Action & Milestones.',
    body: `## POA&M Guide

A **Plan of Action & Milestones (POA&M)** documents each gap, the plan to fix it, and the timeline.

### Create items
For each gap, record the control, gap statement, remediation plan, milestones, owner, due date, and risk rating.

### Close items
Move items through Open → In Progress → Pending Validation → Closed. Link closure evidence.

> **Important:** Not all gaps may be allowable for your target assessment path. Validate official requirements before submission.`,
  },
  {
    slug: 'sprs-guide', title: 'PIEE / SPRS Guide', icon: BadgeCheck,
    summary: 'Register in PIEE, request the SPRS role, and affirm your score.',
    body: `## PIEE / SPRS Guide

Your CMMC self-assessment score is reported in **SPRS**, accessed through **PIEE**.

### Steps
1. Create a PIEE account at piee.eb.mil.
2. Request the **SPRS Cyber Vendor User** role.
3. Wait for your CAM to approve the role.
4. Enter your assessment score and record the **CMMC UID**.
5. Have a senior affirming official complete the affirmation.
6. Track the expiration date and re-affirm annually.

Use the project **SPRS / PIEE** module to track each step, upload screenshots, and generate client instructions.`,
  },
  {
    slug: 'reports-guide', title: 'Reports and Exports Guide', icon: BarChart3,
    summary: 'Generate readiness, gap, evidence, policy, and handoff reports.',
    body: `## Reports and Exports Guide

The **Reports** module generates branded, user-triggered exports:
- **Executive Readiness Report** — status, blockers, next steps.
- **Gap Assessment Report** — control status and evidence gaps.
- **Evidence Index (CSV)** — full evidence register.
- **Policy Package** — approved policies and review dates.
- **C3PAO Handoff Package** *(Premium)* — the full assessor package.

Every export includes Pac-Sec branding, a confidentiality footer, and the validation disclaimer, and is logged to export history.`,
  },
  {
    slug: 'roles-permissions', title: 'User Roles and Permissions', icon: Users,
    summary: 'What each organization role can see and do.',
    body: `## User Roles and Permissions

- **Organization Owner / Admin** — full access, user management, executive and compliance dashboards.
- **Compliance Manager** — manages controls, evidence, SSP, POA&M, and policies.
- **IT Admin** — focuses on technical controls, asset inventory, and IT evidence.
- **Evidence Contributor** — uploads and manages evidence.
- **Executive Viewer** — executive dashboard, read-only.
- **Auditor Viewer** — read-only project summary, scope, SSP, POA&M, evidence, and reports.
- **Pac-Sec Support / Admin** — Pacific Global Security Group support and platform administration.`,
  },
  {
    slug: 'faq', title: 'Frequently Asked Questions', icon: HelpCircle,
    summary: 'Common questions about the platform and CMMC.',
    body: `## Frequently Asked Questions

**Does the platform submit to SPRS for me?**
No. SPRS entry and affirmation are performed by your organization. The platform provides guidance, tracking, and evidence packaging.

**Are reports automatically generated?**
No. All reports, exports, and updates are user-triggered.

**Is my data isolated from other organizations?**
Yes. Data is scoped to your organization and projects.

**What happens when my subscription expires?**
Access becomes read-only and exports/new projects are disabled until renewed.

**Which plan do I need for a C3PAO handoff?**
Premium L2 Readiness or Pac-Sec Managed.`,
  },
  {
    slug: 'contact', title: 'Contact Pac-Sec Support', icon: Mail,
    summary: 'Submit a support request to Pacific Global Security Group.',
    body: `## Contact Pac-Sec Support

Use the form below to submit a support request. Requests are recorded in the platform for the Pacific Global Security Group team to review. Submission is manual — nothing is sent automatically.`,
    isContact: true,
  },
];

export function articleBySlug(slug) {
  return HELP_ARTICLES.find((a) => a.slug === slug) || null;
}