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

console.log('Runbook naming regression checks passed.');
