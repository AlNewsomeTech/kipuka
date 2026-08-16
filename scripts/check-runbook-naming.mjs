import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const naming = read('src/lib/policyNaming.js');
const stepDo = read('src/components/guided/StepDo.jsx');
const stepCapture = read('src/components/guided/StepCapture.jsx');

const requiredNamingChecks = [
  [naming, 'CompanyName_PolicyType_CONTROLID_ControlLocation_YYYY-MM-DD'],
  [naming, 'export function namingSteps'],
  [naming, 'step_indexes'],
  [naming, 'stepIndexes'],
  [naming, "'CustomDetectionRule'"],
  [naming, "'AnalyticsRule'"],
  [naming, "'HuntingQuery'"],
  [naming, "'SensitivityLabel'"],
  [naming, "'AuthenticationStrength'"],
  [naming, 'GENERIC_ARTIFACT_TYPES'],
  [naming, '.flatMap(({ step, index }) => {'],
  [naming, "'DefenderXDR'"],
  [naming, "'MicrosoftSentinel'"],
  [stepDo, 'Required name for this step'],
  [stepDo, 'For a new item, copy this exact value.'],
  [stepDo, 'Do not rename an existing approved item solely for this runbook.'],
  [stepDo, 'requiredNames'],
  [stepCapture, 'buildPolicyNames'],
  [stepCapture, 'Policy or configuration to open'],
];

const missing = requiredNamingChecks
  .filter(([source, check]) => !source.includes(check))
  .map(([, check]) => check);

if (missing.length) {
  console.error('Runbook naming regression checks are missing:', missing.join(', '));
  process.exit(1);
}

const defenderIndex = naming.indexOf("[/defender xdr|microsoft defender xdr/i, 'DefenderXDR']");
const sentinelIndex = naming.indexOf("[/microsoft sentinel|sentinel/i, 'MicrosoftSentinel']");
if (defenderIndex < 0 || sentinelIndex < 0 || defenderIndex > sentinelIndex) {
  console.error('Defender XDR must be detected before the broader Sentinel location match.');
  process.exit(1);
}

const { buildPolicyNames, namingSteps } = await import('../src/lib/policyNaming.js');

const sampleVariant = {
  where_to_go: { name: 'Microsoft Defender XDR portal' },
  steps: [
    'Create and save an Advanced Hunting query, then create a custom detection for the approved use case.',
  ],
};
const sampleArtifacts = namingSteps(sampleVariant);
const sampleNames = buildPolicyNames({
  organization: { legal_name: 'Fulcrum Defense' },
  project: {},
  libEntry: { control_id: 'AU.L2-3.3.5', control_title: 'Audit Correlation' },
  variant: sampleVariant,
  date: '2026-08-15',
});

for (const artifactType of ['HuntingQuery', 'CustomDetectionRule']) {
  if (!sampleArtifacts.some((artifact) => artifact.artifact_type === artifactType)) {
    console.error(`Runbook naming did not detect ${artifactType}.`);
    process.exit(1);
  }
}
if (!sampleNames.every((name) =>
  /^Fulcrum_Defense_AuditCorrelation.+_AU\.L2-3\.3\.5_DefenderXDR_2026-08-15$/.test(name.value)
  && name.stepIndexes.includes(0)
)) {
  console.error('Generated names do not follow the required format or are not attached to the creation step.');
  process.exit(1);
}

console.log('Runbook naming regression checks passed.');
