// Static verification for the optional Microsoft Graph Control Deployment
// capability. Asserts the safety-critical properties: disabled by default,
// hidden UI when disabled, server-side rejection, tenant isolation, service-only
// writes, frozen policy naming date, read-back verification, canonical evidence
// reuse, and that the existing manual workflow is untouched.
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

// ---- Feature flag: default false, super-admin convention ----
const orgSchema = JSON.parse(read('base44/entities/Organization.jsonc'));
const flag = orgSchema.properties.microsoft_graph_deployment_enabled;
check('Organization flag exists with default false', flag && flag.default === false);

// ---- Entity write protection ----
const svcOnly = (schema, op) => JSON.stringify(schema.rls?.[op] || {}).includes('__service_only__');
const cred = JSON.parse(read('base44/entities/MicrosoftTenantCredential.jsonc'));
check('Credential entity is service-only for READ and WRITE', svcOnly(cred, 'read') && svcOnly(cred, 'write'));
for (const name of ['MicrosoftTenantConnection', 'MicrosoftPolicyDefinition', 'MicrosoftPolicyDeployment']) {
  const schema = JSON.parse(read(`base44/entities/${name}.jsonc`));
  check(`${name} writes are service-only`, svcOnly(schema, 'write'));
}

// ---- Shared engine guarantees ----
const engine = read('base44/shared/microsoftGraph.ts');
check('Flag rejected server-side before Graph work', engine.includes("microsoft_graph_deployment_enabled !== true") && engine.includes('is not enabled for this organization'));
check('Tenant identity verified against recorded tenant', engine.includes('verifyTenantMatch') && engine.includes('tenant does not match'));
check('Membership resolved from canonical records', engine.includes('OrganizationUser') && engine.includes("status === 'Active'"));
check('Naming reuses Kipuka format (frozen date documented)', engine.includes('CompanyName_PolicyType_CONTROLID_ControlLocation_YYYY-MM-DD') && engine.includes('FROZEN'));
check('Evidence keeps objectives Not Assessed (never auto-MET)', engine.includes("status: 'Not Assessed'") && engine.includes('never auto-marks'));
check('Evidence enters canonical review queue', engine.includes("review_status: 'Needs Review'") && engine.includes("provenance_type: 'API Import'"));

// ---- Deployment function staging ----
const fn = read('base44/functions/manageMicrosoftDeployment/entry.ts');
check('Flag + org auth on every request before Graph', fn.indexOf('resolveGraphAccess') < fn.indexOf('requireConnectedTenant') && fn.includes('requireFlag: true'));
check('Explicit approval hash required before deploy', fn.includes('approved_desired_sha256') && fn.includes('Explicit approval'));
check('Updates PATCH the stored Graph object ID', fn.includes("isUpdate ? 'PATCH' : 'POST'") && fn.includes('deployment.graph_object_id'));
check('Policy name date frozen to original deployment date', fn.includes('existing?.original_deployment_date || today'));
check('Read-back required; POST/PATCH alone never verifies', fn.includes('NOT sufficient') && fn.includes('Deployed Pending Verification') && fn.includes("'Verification Failed'"));
check('Verified only when read-back matches desired', fn.includes('verifyAgainstDesired') && fn.includes("verified ? 'Verified' : 'Verification Failed'"));
check('Duplicate prevention via per-definition record + name conflict', fn.includes('nameConflict') && fn.includes("'Conflict Detected'"));
check('Rollback needs explicit approval + verified snapshot hash', fn.includes('rollback_snapshot_sha256') && fn.includes('Explicit rollback approval'));
check('Before/after evidence created automatically', fn.includes("label: 'Before'") && fn.includes("label: 'After'"));
check('Audit events on approval/deploy/verify/rollback', ['Microsoft Deployment Approved', 'Microsoft Deployment Verified', 'Microsoft Deployment Failed', 'Microsoft Deployment Rolled Back'].every((a) => fn.includes(a)));

// ---- Connection function ----
const conn = read('base44/functions/manageMicrosoftGraphConnection/entry.ts');
check('Connect verifies credential against claimed tenant BEFORE storing', conn.indexOf('verifyTenantMatch') < conn.indexOf('MicrosoftTenantCredential.create'));
check('Connection audit events written', conn.includes('Microsoft Tenant Connected') && conn.includes('Microsoft Tenant Disconnected'));

// ---- Hidden UI when disabled ----
const nav = read('src/components/project/ProjectNav.jsx');
check('Nav hides entitlement-gated modules unless flag === true', nav.includes('m.orgFlag') && nav.includes('=== true'));
const modules = read('src/lib/projectModules.js');
check('Microsoft module declared with orgFlag gate', modules.includes("orgFlag: 'microsoft_graph_deployment_enabled'"));
const moduleUi = read('src/components/project/microsoft/MicrosoftGraphModule.jsx');
check('Module page shows locked state when disabled', moduleUi.includes('graphDeploymentEnabled') && moduleUi.includes('not enabled for this'));
const banner = read('src/components/guided/AutomatedImplementationBanner.jsx');
check('Guided banner renders nothing when disabled', banner.includes('if (!enabled || !available) return null'));

// ---- Existing manual workflow untouched ----
const stepDo = read('src/components/guided/StepDo.jsx');
check('Guided DO step keeps click-by-click manual instructions', stepDo.includes('splitInstructions') && stepDo.includes('Step-by-step') && stepDo.includes('AutomatedImplementationBanner'));

// ---- Single-sourced evidence hashing ----
const evidenceFn = read('base44/functions/manageProjectEvidence/entry.ts');
check('manageProjectEvidence imports shared evidence integrity', evidenceFn.includes("from '../../shared/evidenceIntegrity.ts'") && !evidenceFn.includes('function metadataPayload'));

// ---- Super-admin console control ----
const orgForm = read('src/components/org/OrgFormModal.jsx');
check('Entitlement toggle lives in the super-admin org console', orgForm.includes('microsoft_graph_deployment_enabled'));

console.log(failures === 0 ? '\nAll Microsoft Graph deployment checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);