import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const root = new URL('../', import.meta.url);
const guard = fs.readFileSync(new URL('base44/shared/runbookReviewGuard.ts', root), 'utf8');
const compiled = ts.transpileModule(guard, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { canAutoRewriteVariant } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const cases = [
  ['missing', null, 5, false], ['legacy absent version', {}, 5, true],
  ['legacy v4', { clarity_rewrite_version: 4 }, 5, true],
  ['same v5', { clarity_rewrite_version: 5 }, 5, false],
  ['newer v6', { clarity_rewrite_version: 6 }, 5, false],
  ['numeric text v6', { clarity_rewrite_version: '6' }, 5, false],
  ['reviewed legacy', { clarity_rewrite_version: 4, directions_review_version: 1 }, 5, false],
  ['manual legacy', { clarity_rewrite_version: 4, manual_tuning_version: 1 }, 5, false],
  ['invalid version', { clarity_rewrite_version: 'invalid' }, 5, false],
  ['invalid review', { directions_review_version: 'invalid' }, 5, false],
  ['invalid target', {}, NaN, false], ['negative version', { clarity_rewrite_version: -1 }, 5, false]
];
for (const [label, variant, version, expected] of cases) {
  assert.equal(canAutoRewriteVariant(variant, version), expected, label);
}
for (const path of ['base44/functions/rewriteRunbookSteps/entry.ts','base44/functions/fixResidualRunbookSteps/entry.ts']) {
  const source = fs.readFileSync(new URL(path, root), 'utf8');
  assert.ok(source.includes('canAutoRewriteVariant('), path + ' must use review guard');
  assert.match(source, /role !== 'admin'/, path + ' must remain admin-only');
}
console.log('PASS: 12 eligibility fixtures and both admin-only rewrite guard call sites.');
