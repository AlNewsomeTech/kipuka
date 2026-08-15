import fs from 'node:fs';

const functionPath = new URL('../base44/functions/auditRunbookClarity/entry.ts', import.meta.url);
const source = fs.readFileSync(functionPath, 'utf8');

const requiredChecks = [
  'BLOCKED_BOILERPLATE',
  'create or approve the exact matrix',
  'configure or perform the control',
  'no navigation action',
  'no success or failure check',
  'fewer than two explicit capture items',
  "caller.role !== 'admin'",
  'ControlLibrary.filter({ active: true }',
];

const missing = requiredChecks.filter((check) => !source.includes(check));
if (missing.length) {
  console.error('Runbook clarity audit is missing required checks:', missing.join(', '));
  process.exit(1);
}

console.log('Runbook clarity audit regression checks passed.');
