import fs from 'node:fs';

const functionPath = new URL('../base44/functions/auditRunbookClarity/entry.ts', import.meta.url);
const source = fs.readFileSync(functionPath, 'utf8');

const requiredChecks = [
  'BLOCKED_BOILERPLATE',
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

console.log('Runbook clarity audit regression checks passed.');
