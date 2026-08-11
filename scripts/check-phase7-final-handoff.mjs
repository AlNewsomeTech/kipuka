import fs from 'node:fs';

let passed = 0;
const failures = [];
function check(condition, label) {
  if (condition) { passed += 1; return; }
  failures.push(label);
}
function read(path) { return fs.readFileSync(path, 'utf8'); }

const gate = read('src/lib/readinessGate.js');
const reports = read('src/components/project/reports/ReportsModule.jsx');
const ssp = read('src/components/project/ssp/SSPModule.jsx');
const precheck = read('src/components/project/ReadinessPrecheck.jsx');
const backend = read('base44/functions/generateEvidencePackage/entry.ts');
const generators = read('src/lib/reportGenerators.js');
const checklist = read('src/lib/checklistAuto.js');
const app = read('src/App.jsx');
const layout = read('src/components/Layout.jsx');

[
  ['canonical integrity handoff check', gate.includes('Canonical requirement and objective set is valid')],
  ['objective MET handoff check', gate.includes('Every applicable requirement is MET from final evidence')],
  ['implementation-complete handoff check', gate.includes('Every applicable requirement is implementation-complete')],
  ['valid final evidence handoff check', gate.includes('Evidence index contains only valid Accepted evidence')],
  ['current evidence filter', gate.includes("(e.lifecycle_status || 'Current') === 'Current'")],
  ['valid final evidence helper use', gate.includes('validFinalEvidence(e)')],
  ['optional SPRS flag', gate.includes('options.requireSprs !== false')],
  ['strict final warning', gate.includes('Final output is blocked')],
  ['reports complete-load error state', reports.includes('Final-document data could not be verified')],
  ['reports complete-load retry', reports.includes('Retry complete load')],
  ['reports critical assessment read is not swallowed', !reports.includes('ControlAssessment.filter({ project_id: project.id }).catch')],
  ['reports critical evidence read is not swallowed', !reports.includes('ProjectEvidence.filter({ project_id: project.id }).catch')],
  ['reports loads SPRS records', reports.includes('base44.entities.SPRSRecord.filter')],
  ['reports requires all policies approved', reports.includes("data.policies.every((p) => p.approval_status === 'Approved')")],
  ['reports requires all current evidence valid', reports.includes('readiness.evValidFinal === readiness.evTotal')],
  ['reports uses server preflight for handoff PDF', reports.includes('await previewEvidencePackage({ project })')],
  ['reports shows failed-closed export error', reports.includes('Export failed closed')],
  ['reports has no continue-anyway action', !reports.includes('Continue Anyway')],
  ['SSP complete-load error state', ssp.includes('SSP source data could not be verified')],
  ['SSP critical evidence read is not swallowed', !ssp.includes('ProjectEvidence.filter({ project_id: project.id }).catch')],
  ['SSP requires every section complete', ssp.includes('completion.pct === 100')],
  ['SSP requires Approved status', ssp.includes("ssp?.approval_status === 'Approved'")],
  ['SSP final export rechecks gate', ssp.includes('if (!finalReady)')],
  ['SSP final export does not self-promote approval', !ssp.includes("await updateApproval({ approval_status: 'In Review' })")],
  ['SSP has no continue-anyway action', !ssp.includes('Continue Anyway')],
  ['precheck documents strict behavior', precheck.includes('Failed checks block final output')],
  ['backend mirrors approved N/A workflow', backend.includes("not_applicable_request_status === 'Approved'")],
  ['backend validates N/A decision hash', backend.includes('not_applicable_decision_sha256')],
  ['backend accepts canonical private URI', backend.includes('e.file_uri')],
  ['backend limits package to current evidence', backend.includes('const currentEvidence = evidence.filter')],
  ['backend limits package to valid final evidence', backend.includes('const finalEvidence = currentEvidence.filter')],
  ['backend uses signed private URL', backend.includes('CreateFileSignedUrl')],
  ['backend recomputes SHA-256', backend.includes("crypto.subtle.digest('SHA-256'")],
  ['backend compares evidence hash', backend.includes('failed SHA-256 verification')],
  ['backend does not silently replace missing files', !backend.includes('.MISSING.txt')],
  ['backend stops when a package file fails', backend.includes('Package generation stopped')],
  ['backend critical assessment read is not swallowed', !backend.includes('ControlAssessment.filter({ project_id: projectId }).catch')],
  ['backend loads SPRS records', backend.includes('sr.entities.SPRSRecord.filter')],
  ['backend blocks canonical integrity failures', backend.includes("hardBlockers.push('Canonical requirement/objective integrity failed.')")],
  ['backend blocks incomplete assessment readiness', backend.includes('Every applicable requirement must be MET from valid final evidence.')],
  ['backend blocks incomplete implementation', backend.includes('canonical.implementation_percent !== 100')],
  ['backend blocks incomplete current evidence', backend.includes('finalEvidence.length !== currentEvidence.length')],
  ['backend blocks unapproved scope', backend.includes("scoping?.scope_status !== 'Approved'")],
  ['backend blocks unfinalized inventory', backend.includes("project.inventory_status !== 'Finalized'")],
  ['backend blocks unapproved SSP', backend.includes("ssp.approval_status !== 'Approved'")],
  ['backend blocks unapproved policies', backend.includes('!policiesApproved')],
  ['backend blocks open high-risk POA&M', backend.includes('openHighRisk.length')],
  ['backend blocks missing SPRS artifacts', backend.includes('!sprsUploaded')],
  ['backend preview returns blockers', backend.includes('hard_blockers: hardBlockers')],
  ['backend generation returns 409 on blockers', backend.includes("{ status: 409 }")],
  ['final readiness has distinct title', generators.includes("isFinal ? 'Final Readiness Report' : 'Executive Progress Report'")],
  ['final readiness has distinct filename', generators.includes("isFinal ? 'Final_Readiness' : 'Executive_Progress'")],
  ['checklist requires approved SSP', checklist.includes("ssp.approval_status === 'Approved'")],
  ['checklist requires generated export status', checklist.includes("e.report_status === 'Generated'")],
  ['checklist requires exact final readiness title', checklist.includes("'Final Readiness Report'" )],
  ['legacy package route redirects', app.includes('<Navigate to="/projects" replace />')],
  ['legacy package component import removed', !app.includes("import SharePointPackage from '@/pages/SharePointPackage'" )],
  ['legacy package navigation removed', !layout.includes("to: '/sharepoint-package'")],
].forEach(([label, condition]) => check(condition, label));

if (failures.length) {
  console.error(`Phase 7 final-handoff gate failed: ${passed} passed, ${failures.length} failed`);
  failures.forEach((label) => console.error(`FAIL: ${label}`));
  process.exit(1);
}
console.log(`Phase 7 final-handoff gate passed: ${passed}/${passed}`);
