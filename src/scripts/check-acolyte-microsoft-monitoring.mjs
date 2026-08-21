// Static verification for the optional ACOLYTE Microsoft Graph monitoring
// capability: defaults OFF, hidden when disabled, server-side entitlement +
// tenant enforcement, read-only collection, immutable snapshots, evidence
// hashing, Secure Score history reuse, drift idempotency, and no change to
// existing ACOLYTE features.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
let failures = 0;
const check = (name, ok) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) failures += 1;
};

// ---- Feature flag: default false, separate from deployment ----
const orgSchema = JSON.parse(read('base44/entities/Organization.jsonc'));
const monitorFlag = orgSchema.properties.acolyte_microsoft_graph_monitoring_enabled;
const deployFlag = orgSchema.properties.microsoft_graph_deployment_enabled;
check('Monitoring flag exists with default false', monitorFlag && monitorFlag.default === false);
check('Monitoring flag is separate from the deployment flag', Boolean(deployFlag) && monitorFlag !== deployFlag);

// ---- Entitlement enforcement in the shared engine ----
const engine = read('base44/shared/microsoftGraph.ts');
check('Monitoring gate requires flag AND ACOLYTE tier server-side',
  engine.includes('acolyte_microsoft_graph_monitoring_enabled === true')
  && engine.includes("String(org.acolyte_tier || 'none') !== 'none'")
  && engine.includes('ACOLYTE Microsoft Graph monitoring is not enabled'));
check('Deployment gate unchanged (deployment still rejects on its own flag)',
  engine.includes("microsoft_graph_deployment_enabled !== true"));
check('Monitoring never requires the deployment entitlement (flag \"any\" path exists for connections)',
  engine.includes("flag === 'any' && !deploymentEnabled && !monitoringEnabled"));

// ---- Snapshot entity: immutable, service-only writes ----
const snapSchema = JSON.parse(read('base44/entities/MicrosoftPostureSnapshot.jsonc'));
check('Snapshot writes are service-only', JSON.stringify(snapSchema.rls.write).includes('__service_only__'));
check('Snapshot has SHA-256, previous link, comparison status, and baseline approval fields',
  ['snapshot_sha256', 'previous_snapshot_id', 'comparison_status', 'is_approved_baseline', 'baseline_approved_by', 'baseline_approved_date']
    .every((f) => snapSchema.properties[f]));

// ---- Monitoring function ----
const fn = read('base44/functions/manageAcolyteMicrosoftMonitoring/entry.ts');
check('Backend collection gated on the monitoring flag before any Graph call',
  fn.includes("flag: 'monitoring'") && fn.includes("requireFlag: action !== 'status'"));
check('Tenant identity verified BEFORE data collection',
  fn.indexOf('verifyTenantMatch') < fn.indexOf('collectPosture'));
check('Every scan creates a NEW snapshot (create, never update of prior content)',
  fn.includes('MicrosoftPostureSnapshot.create') && !fn.includes('MicrosoftPostureSnapshot.delete'));
check('First scan is never auto-baseline; approval is explicit and recorded',
  fn.includes('is_approved_baseline: false') && fn.includes("action === 'approve_baseline'")
  && fn.includes('baseline_approved_by') && fn.includes('ACOLYTE Microsoft Baseline Approved'));
check('Secure Score Graph result enters the EXISTING SecureScoreImport history',
  fn.includes('SecureScoreImport.create') && fn.includes('hash_value: ssHash') && fn.includes('PARSER_VERSION'));
check('Duplicate Secure Score suppressed by hash', fn.includes('hash_value: ssHash },') || fn.includes('hash_value: ssHash }'));
check('Raw evidence preserved with SHA-256 via canonical evidence lifecycle',
  fn.includes('createGraphSnapshotEvidence') && fn.includes('requireControls: false'));
check('Evidence refresh supersedes prior scan evidence without deleting it',
  fn.includes("review_status: 'Superseded'") && fn.includes('superseded_by_evidence_id') && !fn.includes('ProjectEvidence.delete'));
check('Findings are idempotent via drift fingerprint (no duplicates per scan)',
  fn.includes('drift_fingerprint === drift.fingerprint') && fn.includes('OPEN_STATUSES.includes(f.finding_status)'));
check('Resolved drift moves finding to Pending Validation, never auto-closes',
  fn.includes("finding_status: 'Pending Validation'") && !fn.includes("finding_status: 'Closed'"));
check('No automatic POA&M creation from drift', !fn.includes('POAM') && !fn.includes('ProjectPOAM'));
check('Scan lifecycle audited (started, completed, failed, evidence, drift, findings, baseline)',
  ['ACOLYTE Microsoft Posture Scan Started', 'ACOLYTE Microsoft Posture Scan Completed', 'ACOLYTE Microsoft Posture Scan Failed',
    'ACOLYTE Microsoft Evidence Stored', 'ACOLYTE Microsoft Drift Detected', 'ACOLYTE Microsoft Drift Finding Created',
    'ACOLYTE Microsoft Baseline Approved'].every((a) => fn.includes(a)));

// ---- Read-only guarantee: no Graph writes anywhere in monitoring code ----
const posture = read('base44/shared/microsoftPosture.ts');
check('Posture collector performs GET-only Graph calls',
  !/'POST'|'PATCH'|'DELETE'|"POST"|"PATCH"|"DELETE"/.test(posture) && posture.includes('STRICTLY READ-ONLY'));
check('Monitoring function performs no direct Graph mutation', !fn.includes("graphFetch(") || !/graphFetch\([^)]*'(POST|PATCH|DELETE)'/.test(fn));
check('Read-only least-privilege permission list has no write scopes',
  posture.includes('MONITORING_READ_PERMISSIONS') && !/ReadWrite|Mail\.Send|Calendars|Contacts\.|Files\./.test(posture.split('MONITORING_READ_PERMISSIONS')[1].split('];')[0]));

// ---- Drift engine quality ----
check('Drift comparisons normalize before hashing (no timestamp/ordering noise)',
  posture.includes('stripVolatile') && posture.includes('sortedStrings') && posture.includes('configSha'));
check('Meaningful detections covered (disabled policy, exclusions, grant weakening, deletion, MFA decline, Secure Score decline, devices, Intune)',
  ['ca_policy_deleted', 'ca_policy_state_changed', 'ca_policy_modified', 'ca_policy_new', 'kipuka_policy_modified', 'kipuka_policy_deleted',
    'mfa_coverage_decreased', 'privileged_role_changed', 'device_noncompliant', 'compliance_policy_removed', 'intune_assignment_removed',
    'secure_score_decline'].every((t) => posture.includes(t)));
check('Restoration routes into the Kipuka deployment workflow only when deployment is enabled',
  posture.includes('args.deploymentEnabled') && posture.includes('precheck, diff, approval, deploy, verify'));

// ---- Connection sharing: monitoring-only orgs can connect ----
const conn = read('base44/functions/manageMicrosoftGraphConnection/entry.ts');
check('Tenant connection usable by either capability (flag \"any\")', conn.includes("flag: 'any'"));
check('Connection status exposes both entitlements', conn.includes('monitoring_enabled: monitoringEnabled'));

// ---- Shared Secure Score parser (manual upload preserved) ----
const ssImport = read('base44/functions/manageSecureScoreImport/entry.ts');
check('Manual Secure Score upload still present and using the shared parser',
  ssImport.includes("from '../../shared/secureScoreParser.ts'") && ssImport.includes("action === 'upload'"));

// ---- UI hidden when disabled ----
const lib = read('src/lib/acolyteMicrosoft.js');
check('Frontend gate requires flag AND ACOLYTE tier, default hidden',
  lib.includes('acolyte_microsoft_graph_monitoring_enabled === true') && lib.includes("!== 'none'"));
const panel = read('src/components/acolyte/microsoft/MicrosoftPosturePanel.jsx');
check('Overview panel renders nothing when disabled', panel.includes('if (!status?.monitoring_enabled) return null'));
const hint = read('src/components/acolyte/microsoft/MicrosoftTelemetryHint.jsx');
check('Readiness review hint hidden when disabled and carries the compliance disclaimer',
  hint.includes('return null') && hint.includes('TELEMETRY_DISCLAIMER'));
const page = read('src/pages/acolyte/MicrosoftPosture.jsx');
check('Monitoring page shows a locked state when disabled', page.includes('Microsoft Graph monitoring is not enabled'));
const driftPanel = read('src/components/acolyte/microsoft/DriftPanel.jsx');
check('Review Proposed Restoration shown only with deployment entitlement + managed object',
  driftPanel.includes('deploymentEnabled && d.deployment_id'));

// ---- Finding drift fields added additively ----
const findingSchema = JSON.parse(read('base44/entities/CyberFinding.jsonc'));
check('CyberFinding keeps original fields and gains drift fields',
  ['finding_title', 'severity', 'finding_status', 'related_evidence_ids'].every((f) => findingSchema.properties[f])
  && ['drift_fingerprint', 'detection_source', 'source_snapshot_id', 'related_deployment_id'].every((f) => findingSchema.properties[f]));

// ---- Existing ACOLYTE features untouched ----
const app = read('src/App.jsx');
check('All existing ACOLYTE routes retained plus the new monitoring route',
  ['/acolyte/posture', '/acolyte/reviews', '/acolyte/findings', '/acolyte/remediation', '/acolyte/incident-readiness',
    '/acolyte/reports', '/acolyte/scanner', '/acolyte/secure-score', '/acolyte/microsoft'].every((r) => app.includes(r)));
const orgForm = read('src/components/org/OrgFormModal.jsx');
check('Entitlement toggle lives in the super-admin org console', orgForm.includes('acolyte_microsoft_graph_monitoring_enabled'));

console.log(failures === 0 ? '\nAll ACOLYTE Microsoft monitoring checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);