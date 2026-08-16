import fs from 'node:fs';

const functionPath = new URL('../base44/functions/auditRunbookClarity/entry.ts', import.meta.url);
const source = fs.readFileSync(functionPath, 'utf8');
const guidedSource = fs.readFileSync(new URL('../src/components/guided/StepDo.jsx', import.meta.url), 'utf8');
const runbookFiles = ['cortexRunbook.js', 'defenderRunbook.js', 'intuneRunbook.js', 'ninjaoneRunbook.js', 'preveilRunbook.js'];
const runbookSource = runbookFiles
  .map((name) => fs.readFileSync(new URL(`../src/lib/runbooks/${name}`, import.meta.url), 'utf8'))
  .join('\n');

const requiredChecks = [
  'BLOCKED_BOILERPLATE',
  'FORBIDDEN_NAVIGATION',
  'ambiguous product or workspace navigation',
  'external Microsoft portal and internal CMMC project destination mixed in one step',
  'create or approve the exact matrix',
  'configure or perform the control',
  'where applicable',
  'as appropriate',
  'no navigation action',
  'no visible success or failure check',
  'no explicit failure handling',
  'capture item does not require a full-page image',
  'capture guidance is not version 3',
  "caller.role !== 'admin'",
  "framework: 'CMMC'",
  "cmmc_level: 'Level 2'",
];

const missing = requiredChecks.filter((check) => !source.includes(check));
if (missing.length) {
  console.error('Runbook clarity audit is missing required checks:', missing.join(', '));
  process.exit(1);
}

const sourceFailures = [];
if (!guidedSource.includes('Finish on Capture & Upload')) sourceFailures.push('guided completion heading is not Capture & Upload');
if (/Finish this step in (?:Kipuka|the project workspace)/i.test(guidedSource)) sourceFailures.push('legacy guided completion heading remains');
if (/\bKipuka\b|\bproject workspace\b/i.test(runbookSource)) sourceFailures.push('hard-coded tool runbooks contain product or workspace navigation');
if (sourceFailures.length) {
  console.error('Runbook navigation regression checks failed:', sourceFailures.join(', '));
  process.exit(1);
}

console.log('Runbook clarity and navigation regression checks passed.');
