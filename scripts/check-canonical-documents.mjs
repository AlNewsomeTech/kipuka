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

ok(manifest.source_version === '1.0', 'manifest source version is 1.0');
ok(templates.length === 44, 'manifest contains exactly 44 policy templates');
ok(new Set(templates.map((t) => t.template_key)).size === 44, 'template keys are unique');
ok(new Set(templates.map((t) => t.document_id)).size === 44, 'document IDs are unique');
ok(!templates.some((t) => /template[_ -]?use[_ -]?guide/i.test(t.source_filename || '')), 'template-use guide is excluded');
ok(templates.every((t) => t.file_uri?.startsWith('mp/private/')), 'every template uses private storage');
ok(templates.every((t) => /^[a-f0-9]{64}$/.test(t.normalized_sha256)), 'every normalized hash is SHA-256');
ok(templates.every((t) => /^[a-f0-9]{64}$/.test(t.source_sha256)), 'every source hash is SHA-256');
ok(templates.every((t) => ['Policy', 'Standard', 'Guideline', 'Plan'].includes(t.document_type)), 'document types are canonical');
ok(templates.every((t) => t.primary_control_id && (t.control_ids.length > 0 || t.primary_control_id === t.document_id)), 'every template has a control mapping or explicit governance ID');
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
ok(importer.includes("body.mode === 'apply' ? 'apply' : 'dry_run'"), 'importer defaults to dry_run');
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
const builderExecutable = read('src/components/documents/DocumentBuilder.jsx').replace(/^\s*\/\/.*$/gm, '');
ok(!/bulkGenerate|onApprove|onPublish|approveDocument|publishDocument/i.test(builderExecutable), 'builder exposes no bulk or approval action');


const lifecycleSchemas = ['ProjectDocumentEvent', 'DocumentApplicabilityDecision', 'ProjectDocumentPackage'];
for (const entity of lifecycleSchemas) {
  const schema = jsonc(`base44/entities/${entity}.jsonc`);
  ok(schema.name === entity, `${entity}: schema name matches`);
  ok(schema.rls?.read && schema.rls?.write, `${entity}: explicit read/write RLS exists`);
  ok(schema.properties.organization_id && schema.properties.project_id, `${entity}: canonical organization/project ownership exists`);
}
const sourceSnapshot4d = jsonc('base44/entities/DocumentSourceSnapshot.jsonc');
ok(sourceSnapshot4d.properties.source_state_sha256, 'source snapshots pin a canonical source-state hash');
const projectDocument4d = jsonc('base44/entities/ProjectDocument.jsonc');
for (const field of ['draft_file_uri', 'draft_output_sha256', 'approval_record_id', 'approved_date', 'effective_date', 'next_review_date', 'last_transition_id', 'last_transition_action']) {
  ok(projectDocument4d.properties[field], `ProjectDocument includes lifecycle field ${field}`);
}
const config4d = jsonc('base44/entities/DocumentConfiguration.jsonc');
ok(config4d.properties.logo_url && config4d.properties.logo_sha256, 'document configuration pins logo URL and SHA-256');

const lifecycle = read('base44/functions/manageProjectDocumentLifecycle/entry.ts');
indexBefore(lifecycle, 'base44.auth.me()', 'base44.asServiceRole', 'lifecycle authenticates before service role');
indexBefore(lifecycle, 'OrganizationUser.filter', 'ProjectDocument.get', 'lifecycle checks active membership before document read');
indexBefore(lifecycle, "fetchVerified(sr, doc.file_uri", 'ProjectDocument.update(doc.id, updates)', 'lifecycle verifies current bytes before transition write');
ok(lifecycle.includes("from: ['In Review'], to: 'Approved'"), 'approval is only valid from In Review');
ok(lifecycle.includes('source_state_sha256') && lifecycle.includes('currentStateSha !== snapshot.source_state_sha256'), 'approval fails closed on stale canonical sources');
ok(lifecycle.includes('rebuiltSnapshotSha !== snapshot.snapshot_sha256'), 'approval verifies immutable source snapshot contents');
indexBefore(lifecycle, 'UploadPrivateFile', 'ProjectDocument.update(doc.id, updates)', 'approval uploads verified final bytes before document transition');
ok(lifecycle.includes('draft_file_uri') && lifecycle.includes('draft_output_sha256'), 'approval preserves original draft URI and hash');
ok(lifecycle.includes("document_version: '1.0'") && lifecycle.includes("missing_approval_fields: []"), 'first approval becomes complete version 1.0');
ok(lifecycle.includes('ProjectDocumentEvent.create') && lifecycle.includes('event_sha256'), 'lifecycle appends hash-verified audit events');
ok(lifecycle.includes('last_transition_action !== action'), 'idempotency key cannot be replayed for a different action');
ok(lifecycle.includes('loadVerifiedLogo') && lifecycle.includes('embedLogo') && lifecycle.includes('kipuka-organization-logo'), 'approval renderer embeds a hash-verified organization logo');
ok(!/entities\.(?:Client|ControlProgress|GeneratedDocument|EvidenceItem|Screenshot|POAMItem)\s*\./.test(lifecycle), 'lifecycle has no retired entity query');

const applicability = read('base44/functions/setDocumentApplicability/entry.ts');
indexBefore(applicability, 'base44.auth.me()', 'base44.asServiceRole', 'applicability authenticates before service role');
indexBefore(applicability, 'OrganizationUser.filter', 'Project.get', 'applicability checks active membership before project read');
ok(applicability.includes("'Out of Scope'") && applicability.includes('justification.length < 40'), 'Out-of-Scope requires substantive justification');
ok(applicability.includes('evidenceIds.length < 1') && applicability.includes('/^[a-f0-9]{64}$/i'), 'Out-of-Scope requires accepted SHA-256 evidence');
ok(applicability.includes('trigger.length < 20') && applicability.includes("decision === 'Needs Scoping Decision'"), 'applicability approval requires a trigger and resolved decision');
ok(applicability.includes('decision_sha256') && applicability.includes("status: 'Superseded'"), 'applicability decisions are hashed and versioned');

const packageFn = read('base44/functions/generateProjectDocumentPackage/entry.ts');
indexBefore(packageFn, 'base44.auth.me()', 'base44.asServiceRole', 'package export authenticates before service role');
indexBefore(packageFn, 'OrganizationUser.filter', 'Project.get', 'package export checks active membership before project read');
indexBefore(packageFn, "mode === 'Ready' && blockers.length", 'UploadPrivateFile', 'Ready package blockers are enforced before upload');
ok(packageFn.includes('DocumentApplicabilityDecision') && packageFn.includes('ProjectDocumentPackage'), 'package export uses canonical Project entities');
for (const pathName of ['Document_Index.csv', 'Applicability_Decision_Register.csv', 'sha256-manifest.json', 'Missing_Information_and_Stale_Documents.csv', 'README.txt']) {
  ok(packageFn.includes(pathName), `package includes ${pathName}`);
}
ok(packageFn.includes('fetchVerified') && packageFn.includes('outputSha'), 'package verifies inputs and hashes ZIP output');
ok(packageFn.includes("['Approved', 'Published'].includes") && packageFn.includes('doc.stale'), 'Ready package accepts only approved/current documents');
ok(!/entities\.(?:Client|ControlProgress|GeneratedDocument|EvidenceItem|Screenshot|POAMItem|PackageExport)\s*\./.test(packageFn), 'package export has no retired entity query');

const configFn = read('base44/functions/saveProjectDocumentConfiguration/entry.ts');
indexBefore(configFn, 'base44.auth.me()', 'base44.asServiceRole', 'configuration save authenticates before service role');
indexBefore(configFn, 'OrganizationUser.filter', 'Project.get', 'configuration save checks membership before project read');
ok(!configFn.includes("'organization_id'") || configFn.includes("k !== 'project_id'"), 'configuration does not accept caller-supplied organization_id');
ok(configFn.includes('logo_sha256') && configFn.includes("redirect: 'error'") && configFn.includes('privateHost'), 'configuration hash-verifies logos and blocks unsafe fetches');

const generator4d = read('base44/functions/generateProjectDocument/entry.ts');
ok(generator4d.includes('source_state_sha256') && generator4d.includes('logo_sha256'), 'draft generation pins source state and logo hash');
ok(generator4d.includes('embedLogo') && generator4d.includes('word/media/kipuka-organization-logo'), 'draft generator embeds logo into DOCX OOXML');
const preflight4d = read('base44/functions/preflightProjectDocument/entry.ts');
ok(preflight4d.includes('config?.logo_sha256'), 'preflight treats unverified logo as missing information');

for (const entity of lifecycleSchemas) {
  ok(orgData.includes(`'${entity}'`), `client proxy gates ${entity}`);
  ok(orgGate.includes(`'${entity}'`), `server read gate permits scoped ${entity}`);
}
const lifecycleUi = [
  read('src/pages/DocumentLibrary.jsx'),
  read('src/components/documents/DocumentLifecycle.jsx'),
  read('src/components/documents/ApplicabilityMatrix.jsx'),
  read('src/components/documents/DocumentPackagePanel.jsx'),
  read('src/components/documents/DocumentConfigurationEditor.jsx'),
  read('src/App.jsx'),
].join('\n');
for (const fn of ['manageProjectDocumentLifecycle', 'setDocumentApplicability', 'generateProjectDocumentPackage', 'saveProjectDocumentConfiguration']) {
  ok(lifecycleUi.includes(fn), `UI invokes ${fn}`);
}
ok(lifecycleUi.includes('initialTab="package"') && !lifecycleUi.includes("import FinalPackage from"), 'legacy Final Package route is replaced by canonical document package UI');

if (failures.length) {
  console.error(`Phase 4 document checks failed: ${failures.length} failure(s), ${passed} passed`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`Phase 4 document checks passed: ${passed}/${passed}`);
