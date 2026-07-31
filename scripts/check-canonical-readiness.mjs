#!/usr/bin/env node
import fs from 'node:fs';
import { computeCanonicalReadiness, validFinalEvidence, validNotApplicable, SPRS_POINT_VALUES } from '../src/lib/canonicalReadiness.js';

let passed = 0;
const failures = [];
function check(name, ok, detail = '') {
  if (ok) { passed += 1; return; }
  failures.push(`${name}${detail ? `: ${detail}` : ''}`);
}
function read(path) {
  try { return fs.readFileSync(path, 'utf8'); } catch (error) { failures.push(`read ${path}: ${error.message}`); return ''; }
}

const project = { id: 'p1', target_cmmc_level: 'Level 2' };
const assessments = Array.from({ length: 110 }, (_, i) => ({ id: `a${i}`, project_id: 'p1', control_id: `C${i + 1}`, status: 'Not Started' }));
const objectives = [];
assessments.forEach((a, i) => {
  const count = i < 100 ? 3 : 2;
  for (let n = 1; n <= count; n += 1) objectives.push({
    id: `o${i}_${n}`, active: true, cmmc_level: 'Level 2',
    control_id: a.control_id, objective_id: `${a.control_id}[${n}]`, objective_key: `${a.control_id}|${n}`,
  });
});
const evidence = [{ id: 'e1', project_id: 'p1', review_status: 'Accepted', file_url: 'https://example.test/evidence.pdf', hash_value: 'sha256:abc' }];
const links = objectives.map((o) => ({ project_id: 'p1', control_id: o.control_id, objective_id: o.objective_id, status: 'Met', evidence_id: 'e1' }));

check('fixture has 110 requirements', assessments.length === 110);
check('fixture has 320 objectives', objectives.length === 320);
const ready = computeCanonicalReadiness({ project, assessments, objectiveLibrary: objectives, objectiveLinks: links, evidence, poams: [] });
check('complete authoritative fixture passes integrity', ready.integrity_ok === true, ready.integrity_issues.join(' '));
check('all objectives plus valid final evidence yields 110 MET', ready.met === 110);
check('complete fixture is 100% ready', ready.readiness_pct === 100);

const noHash = computeCanonicalReadiness({ project, assessments, objectiveLibrary: objectives, objectiveLinks: links, evidence: [{ ...evidence[0], hash_value: '' }], poams: [] });
check('accepted evidence without a verified hash earns no MET credit', noHash.met === 0);
check('accepted evidence without a verified hash is 0% ready', noHash.readiness_pct === 0);
check('valid final evidence requires hash', validFinalEvidence({ ...evidence[0], hash_value: '' }) === false);
check('expired evidence is invalid', validFinalEvidence({ ...evidence[0], expiration_date: '2000-01-01' }) === false);

const naAssessment = { ...assessments[0], status: 'Not Applicable', not_applicable_justification: 'Out of scope', not_applicable_scope_evidence: 'Approved boundary', not_applicable_confirmed_by: 'Reviewer', not_applicable_confirmed_date: '2026-07-31' };
check('fully documented N/A is valid', validNotApplicable(naAssessment) === true);
check('N/A without reviewer is invalid', validNotApplicable({ ...naAssessment, not_applicable_confirmed_by: '' }) === false);
const oneNa = computeCanonicalReadiness({ project, assessments: [naAssessment, ...assessments.slice(1)], objectiveLibrary: objectives, objectiveLinks: [], evidence: [], poams: [] });
check('documented N/A is equivalent to one MET requirement', oneNa.met === 1);
const poamNoCredit = computeCanonicalReadiness({ project, assessments, objectiveLibrary: objectives, objectiveLinks: [], evidence: [], poams: [{ project_id: 'p1', control_id: 'C1', status: 'Open' }] });
check('POA&M does not convert a requirement to MET', poamNoCredit.met === 0);
check('current 3.12.4 point value is one', SPRS_POINT_VALUES['3.12.4'] === 1);

const engine = read('src/lib/canonicalReadiness.js');
const projectDashboard = read('src/pages/project/ProjectDashboard.jsx');
const projectsPage = read('src/pages/Projects.jsx');
const supportDashboard = read('src/components/dashboards/PacSecSupportDashboard.jsx');
const sharedDashboard = read('src/lib/useProjectDashboardData.js');
const reports = read('src/lib/reportGenerators.js');
const projectReport = read('src/lib/projectStatusReport.js');
const monthly = read('src/lib/monthlyReviewPack.js');
const readinessGate = read('src/lib/readinessGate.js');
const evidencePackage = read('base44/functions/generateEvidencePackage/entry.ts');
const legacyPackage = read('base44/functions/generatePackage/entry.ts');
const legacySsp = read('base44/functions/generateSSP/entry.ts');
const sprs = read('src/lib/sprsScoring.js');

check('engine fixes Level 1 at 15/59', /'Level 1'.*requirements:\s*15,\s*objectives:\s*59/.test(engine));
check('engine fixes Level 2 at 110/320', /'Level 2'.*requirements:\s*110,\s*objectives:\s*320/.test(engine));
check('project dashboard uses canonical engine', /computeCanonicalReadiness/.test(projectDashboard));
check('project dashboard does not write stored readiness', !/entities\.Project\.update[\s\S]{0,200}current_readiness_score/.test(projectDashboard));
check('project list does not display stored readiness', !/p\.current_readiness_score/.test(projectsPage) && /computeCanonicalReadiness/.test(projectsPage));
check('support dashboard does not display stored readiness', !/p\.current_readiness_score/.test(supportDashboard) && /computeCanonicalReadiness/.test(supportDashboard));
check('shared role dashboards load objective findings', /AssessmentObjectiveLibrary/.test(sharedDashboard) && /ObjectiveEvidenceLink/.test(sharedDashboard));
check('shared role dashboards use canonical engine', /computeCanonicalReadiness/.test(sharedDashboard));
check('report generators use canonical engine', /computeCanonicalReadiness/.test(reports));
check('project status report uses canonical engine', /computeCanonicalReadiness/.test(projectReport));
check('monthly review pack uses canonical engine', /computeCanonicalReadiness/.test(monthly));
check('readiness gate uses canonical engine', /computeCanonicalReadiness/.test(readinessGate));
check('evidence package loads objective library and findings', /AssessmentObjectiveLibrary/.test(evidencePackage) && /ObjectiveEvidenceLink/.test(evidencePackage));
check('evidence package requires accepted hashed evidence', /review_status !== 'Accepted'/.test(evidencePackage) && /hash_value/.test(evidencePackage));
check('evidence package exposes assessment_ready', /assessment_ready/.test(evidencePackage));
check('legacy package endpoint is retired', /LEGACY_EXPORT_RETIRED/.test(legacyPackage) && /status:\s*410/.test(legacyPackage));
check('legacy SSP endpoint is retired', /LEGACY_EXPORT_RETIRED/.test(legacySsp) && /status:\s*410/.test(legacySsp));
check('legacy status helper no longer grants workflow statuses MET', !/Evidence Accepted['"]\s*,/.test(sprs.match(/const MET_STATUSES[\s\S]*?\]/)?.[0] || ''));
check('SPRS mapping fixes 3.12.4', /'3\.12\.4':\s*1/.test(sprs));

console.log(`\nPhase 3E canonical readiness checks: ${passed} passed, ${failures.length} failed.`);
if (failures.length) {
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}
