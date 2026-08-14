import fs from 'node:fs';
import path from 'node:path';
import { normalizeWebsiteUrl, WEBSITE_AUTHORIZATION_STATEMENT } from '../src/lib/websiteScanner.js';

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

const schemas = [
  'WebsiteScanTarget',
  'WebsiteScan',
  'WebsiteScanFinding',
  'WebsiteScanLog',
].map((name) => jsonc(`base44/entities/${name}.jsonc`));

schemas.forEach((schema) => {
  ok(schema.rls?.write?.user_condition?.role === '__service_only__', `${schema.name} writes are service-only`);
  ok(Boolean(schema.properties.organization_id), `${schema.name} records organization ownership`);
  ok(Boolean(schema.properties.project_id), `${schema.name} records project assignment`);
});

const targetSchema = schemas[0];
for (const field of [
  'client_id', 'start_url', 'hostname', 'authorization_attested',
  'authorization_statement', 'authorized_by_email', 'authorized_at',
  'scan_profile', 'max_pages', 'request_timeout_seconds', 'last_scan_id',
]) ok(Boolean(targetSchema.properties[field]), 'target schema has ' + field);

const scanSchema = schemas[1];
for (const field of [
  'client_id', 'target_id', 'status', 'requested_by_email', 'requested_at',
  'completed_at', 'duration_ms', 'pages_scanned', 'requests_made', 'checks_run',
  'finding_count', 'security_score', 'scanner_version', 'request_id',
  'resolved_addresses', 'error_message', 'log_sha256',
]) ok(Boolean(scanSchema.properties[field]), 'scan schema has ' + field);

const findingSchema = schemas[2];
for (const field of [
  'scan_id', 'rule_id', 'fingerprint', 'severity', 'affected_url',
  'evidence', 'recommendation', 'status', 'cyber_finding_id',
]) ok(Boolean(findingSchema.properties[field]), 'finding schema has ' + field);

const logSchema = schemas[3];
for (const field of [
  'scan_id', 'sequence', 'event_time', 'level', 'event_type', 'request_url',
  'message', 'details', 'previous_hash', 'entry_hash',
]) ok(Boolean(logSchema.properties[field]), 'log schema has ' + field);

const fn = read('base44/functions/runWebsiteScan/entry.ts');
before(fn, 'base44.auth.me()', 'base44.asServiceRole', 'authentication precedes every service-role operation');
ok(fn.includes("const action = body.action || 'run_scan'"), 'scanner action routing is explicit');
for (const action of ['create_target', 'set_target_status', 'run_scan', 'promote_finding']) {
  ok(fn.includes(`action === '${action}'`) || fn.includes(`action !== '${action}'`), 'backend implements ' + action);
}
ok(fn.includes("split(',')") && fn.includes('.filter(Boolean).includes(clientId)'), 'technician client assignment uses exact tokens');
ok(fn.includes("membership.status === 'Active'"), 'organization access requires active membership');
ok(fn.includes('active.length !== 1'), 'ambiguous or missing organization membership fails closed');
ok(fn.includes('READ_ONLY_ORG_ROLES.has'), 'read-only organization roles cannot mutate scanner state');
ok((fn.match(/authorizeScope\(/g) || []).length >= 5, 'scope authorization protects all scanner mutations');
ok(fn.includes('project.organization_id !== target.organization_id'), 'scan target must belong to its project organization');
ok(fn.includes('client.organization_id !== target.organization_id'), 'scan target client assignment is tenant checked');
ok(fn.includes('body.authorization_statement !== AUTHORIZATION_STATEMENT'), 'server verifies the exact authorization attestation');
ok(fn.includes('authorized_by_email: caller.email'), 'server records the authorization actor');
ok(fn.includes('authorized_at: authorizedAt'), 'server records the authorization timestamp');

ok(fn.includes("!['http:', 'https:'].includes(url.protocol)"), 'only HTTP and HTTPS are accepted');
ok(fn.includes("!['80', '443'].includes(url.port)"), 'only standard website ports are accepted');
ok(fn.includes("host === 'localhost'") && fn.includes("host.endsWith('.internal')"), 'local hostnames are blocked');
ok(fn.includes('isBlockedIpv4') && fn.includes('isBlockedIpv6'), 'private and reserved IP ranges are blocked');
ok(fn.includes("Deno.resolveDns(host, 'A')") && fn.includes("Deno.resolveDns(host, 'AAAA')"), 'DNS A and AAAA answers are checked');
ok(fn.includes('await resolvePublicHost(current)'), 'DNS is rechecked before every request');
ok(fn.includes("redirect: 'manual'"), 'redirects are followed manually');
ok(fn.includes('Cross-domain requests are outside the authorized target scope'), 'cross-domain requests fail closed');
ok(fn.includes('equivalentHost(next.hostname, requestedUrl.hostname)'), 'redirect hosts stay inside authorization');
ok(fn.includes("method: 'GET'"), 'scanner uses GET requests');
ok(!fn.includes("method: 'POST'") && !fn.includes("method: 'PUT'") && !fn.includes("method: 'DELETE'"), 'scanner has no destructive HTTP methods');
ok(fn.includes('MAX_BODY_BYTES = 1_000_000'), 'response bodies are bounded');
ok(fn.includes('MAX_REDIRECTS = 5') && fn.includes('MAX_PAGES = 15'), 'crawl and redirect limits are bounded');
ok(fn.includes('Date.now() - recentTime < 120_000'), 'target scans have a two-minute cooldown');
ok(fn.includes('visited.size < maxPages'), 'crawl stops at the authorized page limit');
ok(fn.includes('candidate.origin === finalPageUrl.origin'), 'crawl links remain same-origin');
ok(!fn.includes('.submit(') && !fn.includes('formData('), 'scanner does not submit forms or construct form payloads');

ok(fn.includes('previous_hash: logPreviousHash'), 'event logs retain the previous hash');
ok(fn.includes('sha256(logPreviousHash + stable(event))'), 'each event log entry is hash chained');
ok(fn.includes('WebsiteScanLog.bulkCreate'), 'event logs are persisted');
ok(fn.includes("addLog('Info', 'scan_started'"), 'scan start is logged');
ok(fn.includes("addLog('Info', 'http_response'"), 'HTTP responses are logged');
ok(fn.includes("addLog('Info', 'scan_completed'"), 'scan completion is logged');
ok(fn.includes("addLog('Error', 'scan_failed'"), 'scan failures are logged');
ok(fn.includes("log_sha256: await sha256") || fn.includes('log_sha256: logDigest'), 'scan record stores a log digest');
ok(fn.includes('WebsiteScanFinding.bulkCreate'), 'normalized findings are persisted');
ok(fn.includes('CyberFinding.create'), 'scanner findings can be promoted to ACOLYTE findings');
ok((fn.match(/AuditLog\.create/g) || []).length >= 4, 'target, status, scan, and promotion actions create audit events');

const modal = read('src/components/acolyte/WebsiteTargetModal.jsx');
const page = read('src/pages/acolyte/WebsiteScanner.jsx');
ok(modal.includes("action: 'create_target'"), 'target creation uses the protected backend');
ok(!modal.includes('WebsiteScanTarget.create'), 'target creation has no direct entity write');
ok(page.includes("action: 'set_target_status'"), 'target status uses the protected backend');
ok(!page.includes('WebsiteScanTarget.update'), 'target status has no direct entity write');
ok(page.includes("action: 'run_scan'"), 'UI invokes the scan action');
ok(page.includes("action: 'promote_finding'"), 'UI can promote a scanner finding');
ok(page.includes("label: 'Event Logs'"), 'UI exposes full event logs');
ok(page.includes('log.previous_hash') && page.includes('log.entry_hash'), 'UI exposes hash-chain details');
ok(page.includes('clientName(target.client_id)'), 'UI displays client assignment');

const app = read('src/App.jsx');
const overview = read('src/pages/acolyte/AcolyteOverview.jsx');
ok(app.includes('path="/acolyte/scanner"') && app.includes('<WebsiteScanner />'), 'scanner route is registered');
ok(overview.includes("to: '/acolyte/scanner'") && overview.includes('Website Vulnerability Scanner'), 'ACOLYTE links to the scanner');
const clientGate = read('src/api/orgData.js');
const serverGate = read('base44/functions/orgScopedData/entry.ts');
for (const entity of ['WebsiteScanTarget', 'WebsiteScan', 'WebsiteScanFinding', 'WebsiteScanLog']) {
  ok(clientGate.includes(`'${entity}'`), entity + ' client reads use the organization gate');
  ok(serverGate.includes(`'${entity}'`), entity + ' is allowed by the server read gate');
}

const normalized = normalizeWebsiteUrl('Example.COM/path#secret');
ok(normalized.toString() === 'https://example.com/path', 'client URL normalizer adds HTTPS, lowercases host, and removes fragments');
ok(WEBSITE_AUTHORIZATION_STATEMENT === AUTHORIZATION_STATEMENT_FROM_FUNCTION(fn), 'client and server authorization statements match exactly');

let rejectedCredentials = false;
try {
  normalizeWebsiteUrl('https://user:password@example.com');
} catch {
  rejectedCredentials = true;
}
ok(rejectedCredentials, 'client URL normalizer rejects embedded credentials');

function AUTHORIZATION_STATEMENT_FROM_FUNCTION(source) {
  const match = source.match(/const AUTHORIZATION_STATEMENT = '([^']+)';/);
  return match?.[1] || '';
}

if (failures.length) {
  console.error(`Website scanner gate failed: ${passed} passed, ${failures.length} failed`);
  failures.forEach((failure) => console.error(' - ' + failure));
  process.exit(1);
}

console.log(`Website scanner gate passed: ${passed}/${passed}`);
