#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  CMMC_SCF_CROSS_REFERENCES,
  SCF_DATASET,
  scfReferencesFor,
} from '../src/lib/scfCrossReferences.js';
import { buildScfCrossReferenceCsv } from '../src/lib/scfCrossReferenceExport.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
const failures = [];

function check(label, condition, detail = '') {
  if (condition) passed += 1;
  else failures.push(detail ? `${label}: ${detail}` : label);
}

function read(path) {
  return readFileSync(join(ROOT, path), 'utf8');
}

const entries = Object.entries(CMMC_SCF_CROSS_REFERENCES);
const references = entries.flatMap(([, rows]) => rows);
const uniqueScfIds = new Set(references.map((row) => row.scf_id));

check('dataset version is pinned', SCF_DATASET.version === '2026.2');
check('dataset source is official SCF repository', /securecontrolsframework\/securecontrolsframework/.test(SCF_DATASET.source_url));
check('SCF attribution is present', /SCF Council, LLC/.test(SCF_DATASET.attribution));
check('license is recorded', SCF_DATASET.license === 'CC BY-ND 4.0');
check('all 110 canonical CMMC requirements are mapped', entries.length === 110, `found ${entries.length}`);
check('all canonical requirements have references', entries.every(([, rows]) => rows.length > 0));
check('official source resolves to 198 unique SCF controls', uniqueScfIds.size === 198, `found ${uniqueScfIds.size}`);
check('mapping contains 231 CMMC-to-SCF edges', references.length === 231, `found ${references.length}`);
check('every reference has an SCF ID', references.every((row) => /^([A-Z]+)-\d/.test(row.scf_id)));
check('every reference preserves official title', references.every((row) => row.scf_title?.trim()));
check('every reference preserves official domain', references.every((row) => row.scf_domain?.trim()));
check('MFA requirement maps to IAC-06', scfReferencesFor('IA.L2-3.5.3').some((row) => row.scf_id === 'IAC-06'));
check('Level 1 requirements share canonical mappings', scfReferencesFor('AC.L1-3.1.1').length > 0);
check('unknown controls fail closed to no references', scfReferencesFor('UNKNOWN').length === 0);

const projectSchema = JSON.parse(read('base44/entities/Project.jsonc'));
const mode = projectSchema.properties?.control_set_mode;
check('project schema has control-set mode', !!mode);
check('control-set mode permits only CMMC and CMMC + SCF',
  JSON.stringify(mode?.enum) === JSON.stringify(['CMMC', 'CMMC + SCF']));
check('control-set mode defaults to CMMC', mode?.default === 'CMMC');
check('schema states no automatic status transfer', /without transferring completion or assessment status/i.test(mode?.description || ''));

const dashboard = read('src/pages/project/ProjectDashboard.jsx');
check('dashboard exposes the control-set selector', /id="control-set-mode"/.test(dashboard));
check('dashboard preserves CMMC option', /<option value="CMMC">CMMC<\/option>/.test(dashboard));
check('dashboard exposes cross-reference option', /<option value="CMMC \+ SCF">CMMC \+ SCF<\/option>/.test(dashboard));
check('dashboard respects read-only access', /disabled=\{readOnly \|\| savingControlSet\}/.test(dashboard));
check('dashboard saves only project presentation mode', /Project\.update\(project\.id, \{ control_set_mode: controlSetMode \}\)/.test(dashboard));
check('dashboard labels completion as CMMC-specific', /Completion and assessment results remain CMMC-specific/.test(dashboard));
check('dashboard exposes SCF crosswalk export', /Export SCF Crosswalk/.test(dashboard));

const walkthrough = read('src/pages/project/GuidedWalkthrough.jsx');
const queue = read('src/pages/project/GuidedQueue.jsx');
const panel = read('src/components/guided/ScfCrossReferencePanel.jsx');
check('walkthrough gates SCF panel by project mode', /project\.control_set_mode === 'CMMC \+ SCF'/.test(walkthrough));
check('queue gates SCF badges by project mode', /project\?\.control_set_mode === 'CMMC \+ SCF'/.test(queue));
check('panel states mapping is not equivalence', /not an equivalence decision/.test(panel));
check('panel states no automatic satisfaction', /does not automatically mark an SCF control satisfied/.test(panel));
check('panel displays official attribution', /SCF_DATASET\.attribution/.test(panel));
check('panel links to the source dataset', /SCF_DATASET\.source_url/.test(panel));
check('cross-reference UI contains no SCF status write', !/SCF[A-Za-z]*\.(create|update|delete|bulkCreate)/.test(walkthrough + queue + panel));

const sampleCsv = buildScfCrossReferenceCsv({
  project: { project_name: 'Test Project' },
  library: [{ control_id: 'IA.L2-3.5.3', control_title: 'Multifactor Authentication', domain: 'Identification & Authentication' }],
  assessments: [{ control_id: 'IA.L2-3.5.3', status: 'Implemented' }],
});
check('export contains project name', sampleCsv.includes('Test Project'));
check('export contains CMMC identifier', sampleCsv.includes('IA.L2-3.5.3'));
check('export contains mapped SCF identifier', sampleCsv.includes('IAC-06'));
check('export contains implementation status', sampleCsv.includes('Implemented'));
check('export marks rows as cross-reference only', sampleCsv.includes('Cross-reference only; no automatic equivalence or status transfer'));
check('export includes dataset version', sampleCsv.includes('2026.2'));
check('export includes attribution', sampleCsv.includes('SCF Council, LLC'));

console.log(`SCF cross-reference gate: ${passed} passed, ${failures.length} failed.`);
if (failures.length) {
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
