import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import JSZip from 'jszip';

const ROOT = process.cwd();
let passed = 0;
const failures = [];
function ok(condition, message) {
  if (condition) passed += 1;
  else failures.push(message);
}
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function jsonc(rel) {
  const source = read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  return JSON.parse(source);
}
function indexBefore(source, first, second, message) {
  const a = source.indexOf(first);
  const b = source.indexOf(second);
  ok(a >= 0 && b >= 0 && a < b, message);
}

const templateDir = 'base44/functions/generateProjectDocument/templates';
const manifest = JSON.parse(read(`${templateDir}/manifest.json`));
const templates = manifest.templates || [];

ok(manifest.library_version === '1.0', 'manifest library version is 1.0');
ok(templates.length === 44, 'manifest contains exactly 44 policy templates');
ok(new Set(templates.map((t) => t.template_key)).size === 44, 'template keys are unique');
ok(new Set(templates.map((t) => t.document_id)).size === 44, 'document IDs are unique');
ok(!templates.some((t) => /guide/i.test(t.source_filename || '')), 'usage guide is excluded');
ok(templates.every((t) => t.file_uri?.startsWith('mp/private/')), 'every template uses private storage');
ok(templates.every((t) => /^[a-f0-9]{64}$/.test(t.normalized_sha256)), 'every normalized hash is SHA-256');
ok(templates.every((t) => /^[a-f0-9]{64}$/.test(t.source_sha256)), 'every source hash is SHA-256');
ok(templates.every((t) => ['Policy', 'Standard', 'Guideline', 'Plan'].includes(t.document_type)), 'document types are canonical');
ok(templates.every((t) => Array.isArray(t.control_ids) && t.control_ids.length > 0), 'every template has control mappings');
ok(templates.every((t) => Array.isArray(t.cmmc_levels) && t.cmmc_levels.length > 0), 'every template has CMMC applicability');
ok(templates.every((t) => Array.isArray(t.tags) && t.tags.includes('org.legal_name')), 'every template declares named tags');

const forbidden = [
  '[ORGANIZATION NAME]', '[INSERT LOGO]', '[VERSION]', '[YYYY-MM-DD]',
  '[DOCUMENT ID]', 'White-Label Template', 'Replace all bracketed fields',
];
for (const t of templates) {
  const rel = t.asset_path;
  const full = path.join(ROOT, rel);
  ok(fs.existsSync(full), `${t.template_key}: normalized DOCX exists`);
  if (!fs.existsSync(full)) continue;
  const bytes = fs.readFileSync(full);
  ok(crypto.createHash('sha256').update(bytes).digest('hex') === t.normalized_sha256,
    `${t.template_key}: normalized hash matches manifest`);
  const zip = await JSZip.loadAsync(bytes);
  ok(Boolean(zip.file('word/document.xml')), `${t.template_key}: DOCX has word/document.xml`);
  const xmlParts = Object.keys(zip.files).filter((n) => n.endsWith('.xml'));
  const xml = (await Promise.all(xmlParts.map((n) => zip.files[n].async('string')))).join('\n');
  ok(t.tags.every((tag) => xml.includes(`{{${tag}}}`)), `${t.template_key}: every declared tag exists in DOCX XML`);
  ok(!forbidden.some((token) => xml.includes(token)), `${t.template_key}: no legacy placeholder/instruction remains`);
}

for (const entity of ['DocumentTemplate', 'DocumentConfiguration', 'ProjectDocument', 'DocumentSourceSnapshot']) {
  const schema = jsonc(`base44/entities/${entity}.jsonc`);
  ok(schema.name === entity, `${entity}: schema name matches`);
  ok(schema.rls && schema.rls.read && schema.rls.write, `${entity}: explicit read/write RLS exists`);
}
const projectDoc = jsonc('base44/entities/ProjectDocument.jsonc');
ok(projectDoc.properties.status.enum.includes('Approved') && projectDoc.properties.status.enum.includes('Superseded'),
  'ProjectDocument supports lifecycle without auto-approval');
ok(projectDoc.properties.output_sha256 && projectDoc.properties.source_snapshot_sha256,
  'ProjectDocument records template output and source snapshot hashes');
const snapshot = jsonc('base44/entities/DocumentSourceSnapshot.jsonc');
ok(snapshot.properties.snapshot_sha256 && snapshot.properties.resolved_fields && snapshot.properties.evidence_hashes,
  'source snapshot preserves deterministic provenance');

const importer = read('base44/functions/importPolicyTemplateLibrary/entry.ts');
indexBefore(importer, 'base44.auth.me()', 'base44.asServiceRole', 'importer authenticates before service role');
ok(importer.includes("mode || 'dry_run'"), 'importer defaults to dry_run');
ok(importer.includes('EXPECTED_TEMPLATE_COUNT = 44'), 'importer pins the 44-template count');
ok(importer.includes('normalized_sha256') && importer.includes('conflict'), 'importer verifies hashes and blocks conflicts');
ok(!/\.delete\s*\(/.test(importer), 'importer never deletes template records');

const preflight = read('base44/functions/preflightProjectDocument/entry.ts');
indexBefore(preflight, 'base44.auth.me()', 'base44.asServiceRole', 'preflight authenticates before service role');
indexBefore(preflight, 'OrganizationUser.filter', 'Project.get', 'preflight checks active membership before project read');
ok(!/\.create\s*\(|\.update\s*\(|\.delete\s*\(/.test(preflight), 'preflight is write-free');
ok(preflight.includes('ControlAssessment') && preflight.includes('ProjectEvidence') && preflight.includes('ObjectiveEvidenceLink'),
  'preflight reads canonical assessment and evidence sources');
ok(preflight.includes('draft_generation_allowed') && preflight.includes('missing_approval_fields'),
  'preflight reports blockers and approval-only fields');

const generator = read('base44/functions/generateProjectDocument/entry.ts');
indexBefore(generator, 'base44.auth.me()', 'base44.asServiceRole', 'generator authenticates before service role');
indexBefore(generator, 'OrganizationUser.filter', 'Project.get', 'generator checks active membership before project read');
indexBefore(generator, 'Template asset hash mismatch', 'UploadPrivateFile', 'generator verifies template before output upload');
indexBefore(generator, 'UploadPrivateFile', 'DocumentSourceSnapshot.create', 'generator uploads and verifies before snapshot');
indexBefore(generator, 'DocumentSourceSnapshot.create', 'ProjectDocument.create', 'generator snapshots before document record');
ok(generator.includes("status: 'Draft'"), 'generator creates Draft only');
ok(!/status:\s*['"](?:Approved|Published)['"]/.test(generator), 'generator cannot create Approved or Published status');
ok(generator.includes('FORBIDDEN_TOKENS') && generator.includes('unresolved merge tag'), 'generator scans complete DOCX output');
ok(generator.includes('outputSha') && generator.includes('snapshotSha'), 'generator hashes output and canonical source snapshot');
ok(generator.includes('CMMC_EXPECTED') && generator.includes('uniqueControls'), 'generator fails closed on 15/110 integrity');
ok(!/entities\.(?:Client|ControlProgress|EvidenceItem|Screenshot|POAMItem)\s*\./.test(generator),
  'generator has no retired entity query');

const retired = read('base44/functions/generateDocument/entry.ts');
ok(/status:\s*410/.test(retired), 'legacy generateDocument fails closed with 410');
ok(!/asServiceRole|\.entities\s*\.|\.create\s*\(|\.update\s*\(/.test(retired), 'legacy endpoint performs no data access');

const orgData = read('src/api/orgData.js');
const orgGate = read('base44/functions/orgScopedData/entry.ts');
for (const entity of ['DocumentConfiguration', 'ProjectDocument', 'DocumentSourceSnapshot']) {
  ok(orgData.includes(`'${entity}'`), `client proxy gates ${entity}`);
  ok(orgGate.includes(`'${entity}'`), `server read gate permits scoped ${entity}`);
}
const ui = [
  read('src/pages/DocumentLibrary.jsx'),
  read('src/components/documents/DocumentBuilder.jsx'),
  read('src/components/documents/DocumentCard.jsx'),
  read('src/components/documents/DocumentsDashboard.jsx'),
].join('\n');
ok(ui.includes('preflightProjectDocument') && ui.includes('generateProjectDocument'), 'UI uses canonical preflight and DOCX generator');
ok(!/entities\.(?:Client|ControlProgress|GeneratedDocument)/.test(ui), 'UI has no retired entity access');
ok(!/bulk|approve|publish/i.test(read('src/components/documents/DocumentBuilder.jsx')), 'builder exposes no bulk or approval action');

if (failures.length) {
  console.error(`Phase 4 document checks failed: ${failures.length} failure(s), ${passed} passed`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Phase 4 document checks passed: ${passed}/${passed}`);
