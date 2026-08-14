import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
let passed = 0;
const failures = [];

function ok(condition, message) {
  if (condition) passed += 1;
  else failures.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function jsonc(relativePath) {
  return JSON.parse(
    read(relativePath)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, ''),
  );
}

function before(source, first, second, message) {
  const a = source.indexOf(first);
  const b = source.indexOf(second);
  ok(a >= 0 && b >= 0 && a < b, message);
}

const schema = jsonc('base44/entities/SecureScoreImport.jsonc');
ok(schema.name === 'SecureScoreImport', 'SecureScoreImport schema is present');
ok(schema.rls?.write?.user_condition?.role === '__service_only__', 'Secure Score records have service-only writes');
for (const field of [
  'organization_id', 'client_id', 'project_id', 'source_type', 'import_status',
  'report_date', 'tenant_id', 'current_score', 'max_score', 'score_percent',
  'record_count', 'recommendation_count', 'completed_count', 'category_summary',
  'parsed_summary', 'parser_warnings', 'file_uri', 'file_name', 'original_file_name',
  'mime_type', 'file_size_bytes', 'hash_algorithm', 'hash_value',
  'uploaded_by_email', 'uploaded_by_name', 'uploaded_at', 'parser_version',
  'notes', 'archived_at', 'archived_by_email',
]) ok(Boolean(schema.properties[field]), 'Secure Score schema has ' + field);
ok(schema.properties.import_status.enum.includes('Stored - Review Required'), 'unrecognized exports have an explicit review state');
ok(schema.properties.import_status.enum.includes('Archived'), 'imports support recoverable archival');
ok(schema.properties.score_percent.maximum === 100, 'stored score percentage is bounded at 100');

const fn = read('base44/functions/manageSecureScoreImport/entry.ts');
before(fn, 'await base44.auth.me()', 'const sr = base44.asServiceRole', 'authentication precedes service-role access');
ok(fn.includes("const ACTIONS = new Set(['upload', 'download', 'archive'])"), 'backend action allowlist is explicit');
ok(fn.includes('Unexpected fields:'), 'unexpected payload fields fail closed');
ok(fn.includes("split(',')") && fn.includes('.filter(Boolean).includes(clientId)'), 'technician assignment uses exact client tokens');
ok(fn.includes("membership.status === 'Active'"), 'organization authorization requires active membership');
ok(fn.includes('active.length !== 1'), 'missing or ambiguous membership fails closed');
ok(fn.includes('CONTRIBUTOR_ROLES.has'), 'mutations require an approved organization role');
ok(fn.includes("appRole === 'technician' && clientId && isAssignedClient(clientId)"), 'assigned technicians can operate only on an assigned client');
ok(fn.includes('client.organization_id !== project.organization_id'), 'client assignment must match the project organization');
ok(fn.includes('project.organization_id !== record.organization_id'), 'stored imports are revalidated against project ownership');

ok(fn.includes("const ALLOWED_EXTENSIONS = new Set(['csv', 'json'])"), 'only CSV and JSON exports are accepted');
ok(fn.includes('MAX_FILE_BYTES = 10_000_000'), 'export size is limited to 10 MB');
ok(fn.includes("url.hostname !== 'base44.app'"), 'ingestion accepts only this app upload origin');
ok(fn.includes('expectedPrefix') && fn.includes('APP_ID'), 'public upload path is pinned to the Kipuka app');
ok(fn.includes("redirect: 'manual'"), 'file redirects are followed manually');
ok(fn.includes('isPrivateHost'), 'private redirect destinations are blocked');
ok(fn.includes('declared > MAX_FILE_BYTES') && fn.includes('bytes.length > MAX_FILE_BYTES'), 'declared and actual file sizes are bounded');
ok(fn.includes('parseCsv(text)'), 'CSV exports are parsed');
ok(fn.includes('JSON.parse(text)'), 'Graph JSON exports are parsed');
ok(fn.includes("'currentScore'") && fn.includes("'tenantScore'"), 'current score aliases include Graph and tenant history fields');
ok(fn.includes("'maxScore'") && fn.includes("'tenantMaxScore'"), 'maximum score aliases include Graph and tenant history fields');
ok(fn.includes("'controlCategory'") && fn.includes("'recommended action'"), 'category and recommendation fields are summarized');
ok(fn.includes('No recognized Microsoft Secure Score columns were found'), 'unrecognized layouts produce a visible warning');
ok(fn.includes('stored for review instead of') || fn.includes("'Stored - Review Required'"), 'unrecognized layouts are preserved for review');
ok(fn.includes('manualCurrent') && fn.includes('manualMax'), 'manual score overrides support recommendation-only exports');
ok(fn.includes('currentScore > maxScore'), 'invalid manual score relationships are rejected');
ok(fn.includes('Math.round((currentScore / maxScore) * 1000) / 10'), 'score percentage uses a one-decimal calculation');

ok(fn.includes('sha256Hex(loaded.bytes)'), 'original bytes receive a SHA-256 digest');
ok(fn.includes("filter({ project_id: project.id, hash_value: hashValue }"), 'duplicate files are detected within the selected project');
ok(fn.includes('UploadPrivateFile'), 'original exports are copied to private storage');
ok(fn.includes('CreateFileSignedUrl'), 'private files use expiring signed links');
ok(fn.includes('verification.arrayBuffer()'), 'private upload bytes are read back for verification');
ok(fn.includes('sha256Hex(verifiedBytes)') && fn.includes('!== hashValue'), 'stored file hash is verified against the original');
ok(fn.includes('SecureScoreImport.create'), 'parsed metadata is stored in the Secure Score entity');
ok(fn.includes("String(record.file_uri || '').startsWith('mp/private/')"), 'downloads require canonical private storage');
ok(fn.includes('expires_in: 300'), 'download URLs expire after five minutes');
ok(fn.includes('SecureScoreImport.update') && fn.includes("import_status: 'Archived'"), 'archive is a state transition');
ok(!fn.includes('SecureScoreImport.delete'), 'backend never deletes stored Secure Score exports');
ok((fn.match(/AuditLog\.create/g) || []).length >= 3, 'upload, download, and archive are audited');
ok(fn.includes("'ACOLYTE Secure Score Export Uploaded'"), 'uploads have a dedicated audit action');
ok(fn.includes("'ACOLYTE Secure Score Export Downloaded'"), 'downloads have a dedicated audit action');
ok(fn.includes("'ACOLYTE Secure Score Export Archived'"), 'archive transitions have a dedicated audit action');

const modal = read('src/components/acolyte/SecureScoreUploadModal.jsx');
const page = read('src/pages/acolyte/SecureScoreImports.jsx');
ok(modal.includes('accept=".csv,.json,text/csv,application/json"'), 'upload picker accepts only CSV and JSON');
ok(modal.includes('MAX_FILE_BYTES = 10_000_000'), 'client enforces the 10 MB limit');
ok(modal.includes('base44.integrations.Core.UploadFile'), 'client starts with the standard Base44 upload');
ok(modal.includes("functions.invoke('manageSecureScoreImport'"), 'upload is finalized by the protected backend');
ok(modal.includes("action: 'upload'"), 'upload modal invokes the upload action');
ok(modal.includes('current_score') && modal.includes('max_score'), 'modal supports manual score values');
ok(modal.includes('Assign this export to a client'), 'client assignment is required when clients exist');
ok(!modal.includes('SecureScoreImport.create'), 'modal has no direct Secure Score entity write');

ok(page.includes('title="Microsoft Secure Score"'), 'ACOLYTE Secure Score page has a clear title');
ok(page.includes('https://security.microsoft.com/securescore'), 'page links to the Microsoft Secure Score portal');
ok(page.includes('SecureScoreImport.filter({ project_id: projectId }'), 'history is filtered to the selected project');
ok(page.includes("action: 'download'"), 'page invokes protected downloads');
ok(page.includes("action: 'archive'"), 'page invokes protected archival');
ok(!page.includes('SecureScoreImport.update') && !page.includes('SecureScoreImport.delete'), 'page has no direct record mutation');
ok(page.includes('item.hash_value'), 'UI exposes the SHA-256 file digest');
ok(page.includes('item.parser_warnings'), 'UI exposes parser warnings');
ok(page.includes('item.category_summary'), 'UI exposes category summaries');
ok(page.includes('showArchived'), 'UI separates active and archived imports');
ok(page.includes('!readOnly && project'), 'read-only users cannot open the upload flow');
ok(page.includes('!readOnly && item.import_status'), 'read-only users cannot archive imports');
ok(page.includes('score_percent != null'), 'missing scores are not converted to zero');
ok(page.includes('Microsoft Secure Score is a posture indicator'), 'UI does not claim Secure Score proves CMMC compliance');

const app = read('src/App.jsx');
const overview = read('src/pages/acolyte/AcolyteOverview.jsx');
const clientGate = read('src/api/orgData.js');
const serverGate = read('base44/functions/orgScopedData/entry.ts');
ok(app.includes("import SecureScoreImports from '@/pages/acolyte/SecureScoreImports'"), 'Secure Score page is imported');
ok(app.includes('path="/acolyte/secure-score"') && app.includes('<SecureScoreImports />'), 'Secure Score route is registered');
ok(overview.includes("to: '/acolyte/secure-score'") && overview.includes('Microsoft Secure Score'), 'ACOLYTE overview links to Secure Score');
ok(clientGate.includes("'SecureScoreImport'"), 'client reads use the organization data gate');
ok(serverGate.includes("'SecureScoreImport'"), 'server permits organization-scoped Secure Score reads');

if (failures.length) {
  console.error(`Secure Score import gate failed: ${passed} passed, ${failures.length} failed`);
  failures.forEach((failure) => console.error(' - ' + failure));
  process.exit(1);
}

console.log(`Secure Score import gate passed: ${passed}/${passed}`);
