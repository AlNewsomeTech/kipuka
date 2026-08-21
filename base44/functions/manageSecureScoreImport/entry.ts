import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
// Parser is shared with the ACOLYTE Graph monitoring collector so manual
// uploads and Graph-collected Secure Scores normalize identically.
import { cleanText, numberValue, parseExport, PARSER_VERSION } from '../../shared/secureScoreParser.ts';

const APP_ID = '6a3a0bd467c38d3ef7400909';
const MAX_FILE_BYTES = 10_000_000;
const ALLOWED_EXTENSIONS = new Set(['csv', 'json']);
const CONTRIBUTOR_ROLES = new Set([
  'Organization Owner', 'Organization Admin', 'Compliance Manager', 'IT Admin',
  'Evidence Contributor', 'Pac-Sec Admin', 'Pac-Sec Support',
]);
const ACTIONS = new Set(['upload', 'download', 'archive']);
const ALLOWED_KEYS = new Set([
  'action', 'project_id', 'client_id', 'import_id', 'file_url', 'original_file_name',
  'report_date', 'tenant_id', 'current_score', 'max_score', 'notes',
]);

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || 'Secure Score import failed.');
}

function extensionOf(name: string) {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || '';
}

async function sha256Hex(bytes: Uint8Array) {
  const stableBytes = new Uint8Array(bytes);
  const digest = await crypto.subtle.digest('SHA-256', stableBytes.buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function isPrivateHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '::1' || host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  const match = host.match(/^172\.(\d+)\./);
  if (match && Number(match[1]) >= 16 && Number(match[1]) <= 31) return true;
  return host === '0.0.0.0' || host === '169.254.169.254';
}

async function fetchPublicUpload(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Uploaded file URL is invalid.');
  }
  const expectedPrefix = `/api/apps/${APP_ID}/files/mp/public/${APP_ID}/`;
  if (url.protocol !== 'https:' || url.hostname !== 'base44.app' || !url.pathname.startsWith(expectedPrefix)) {
    throw new Error('Secure Score ingestion accepts only a newly uploaded file from this Kipuka app.');
  }
  let response: Response | null = null;
  for (let hop = 0; hop <= 4; hop += 1) {
    if (url.protocol !== 'https:' || isPrivateHost(url.hostname)) throw new Error('File redirect was blocked.');
    response = await fetch(url.toString(), { redirect: 'manual' });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const location = response.headers.get('location');
    if (!location || hop === 4) throw new Error('File redirect was invalid or exceeded the limit.');
    url = new URL(location, url);
  }
  if (!response?.ok) throw new Error('The uploaded Secure Score export could not be fetched.');
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > MAX_FILE_BYTES) throw new Error('Secure Score exports may not exceed 10 MB.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) throw new Error('The export is empty or exceeds 10 MB.');
  return {
    bytes,
    mime: cleanText(response.headers.get('content-type') || 'application/octet-stream', 160),
  };
}

function sanitizePart(value: unknown, fallback: string) {
  const cleaned = String(value || '')
    .normalize('NFKD')
    .trim()
    .replace(/&/g, ' And ')
    .replace(/[^A-Za-z0-9.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_\-.]+|[_\-.]+$/g, '')
    .slice(0, 80);
  return cleaned || fallback;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const unexpected = Object.keys(body).filter((key) => !ALLOWED_KEYS.has(key));
    if (unexpected.length) return Response.json({ error: `Unexpected fields: ${unexpected.join(', ')}` }, { status: 400 });
    const action = cleanText(body.action, 40);
    if (!ACTIONS.has(action)) return Response.json({ error: 'Unsupported Secure Score action.' }, { status: 400 });

    const sr = base44.asServiceRole;
    const appRole = caller._app_role || caller.role;
    const isPlatformAdmin = appRole === 'admin';

    const isAssignedClient = (clientId: string) => {
      const raw = caller?.assigned_client_ids;
      const tokens = Array.isArray(raw) ? raw : String(raw == null ? '' : raw).split(',');
      return tokens.map((item: unknown) => String(item || '').trim()).filter(Boolean).includes(clientId);
    };

    const authorizeProject = async (project: any, clientId: string, mutation: boolean) => {
      if (isPlatformAdmin) return null;
      if (appRole === 'technician' && clientId && isAssignedClient(clientId)) return null;
      const memberships = await sr.entities.OrganizationUser
        .filter({ user_email: caller.email, organization_id: project.organization_id })
        .catch(() => []);
      const active = memberships.filter((membership: any) => membership.status === 'Active');
      if (active.length !== 1) return Response.json({ error: 'Project not found.' }, { status: 404 });
      if (mutation && !CONTRIBUTOR_ROLES.has(active[0].role)) {
        return Response.json({ error: `Your organization role (${active[0].role}) cannot upload or archive Secure Score exports.` }, { status: 403 });
      }
      return null;
    };

    if (action === 'upload') {
      const projectId = cleanText(body.project_id, 100);
      const originalName = cleanText(body.original_file_name, 240);
      const fileUrl = cleanText(body.file_url, 4000);
      if (!projectId || !originalName || !fileUrl) {
        return Response.json({ error: 'project_id, original_file_name, and file_url are required.' }, { status: 400 });
      }
      const extension = extensionOf(originalName);
      if (!ALLOWED_EXTENSIONS.has(extension)) {
        return Response.json({ error: 'Upload a Microsoft Secure Score CSV or Graph JSON export.' }, { status: 400 });
      }
      const project = await sr.entities.Project.get(projectId).catch(() => null);
      if (!project?.organization_id) return Response.json({ error: 'Project not found.' }, { status: 404 });

      let client: any = null;
      const clientId = cleanText(body.client_id, 100);
      if (clientId) {
        client = await sr.entities.Client.get(clientId).catch(() => null);
        if (!client || client.organization_id !== project.organization_id) {
          return Response.json({ error: 'Client assignment is invalid.' }, { status: 409 });
        }
      }
      const denied = await authorizeProject(project, client?.id || '', true);
      if (denied) return denied;

      const loaded = await fetchPublicUpload(fileUrl);
      const hashValue = await sha256Hex(loaded.bytes);
      const duplicate = await sr.entities.SecureScoreImport
        .filter({ project_id: project.id, hash_value: hashValue }, '-uploaded_at', 2)
        .catch(() => []);
      if (duplicate.length) {
        return Response.json({ error: 'This exact Secure Score export is already stored for the selected project.', import_id: duplicate[0].id }, { status: 409 });
      }

      const parsed = parseExport(loaded.bytes, extension);
      const manualCurrent = body.current_score === '' || body.current_score == null ? null : numberValue(body.current_score);
      const manualMax = body.max_score === '' || body.max_score == null ? null : numberValue(body.max_score);
      if ((body.current_score !== '' && body.current_score != null && manualCurrent === null)
        || (body.max_score !== '' && body.max_score != null && manualMax === null)) {
        return Response.json({ error: 'Manual score values must be non-negative numbers.' }, { status: 400 });
      }
      const currentScore = manualCurrent ?? parsed.currentScore;
      const maxScore = manualMax ?? parsed.maxScore;
      if ((currentScore === null) !== (maxScore === null) || (maxScore !== null && maxScore <= 0) || (currentScore !== null && maxScore !== null && currentScore > maxScore)) {
        return Response.json({ error: 'Provide both current and maximum score, with current score no greater than maximum score.' }, { status: 400 });
      }
      const scorePercent = currentScore !== null && maxScore !== null
        ? Math.round((currentScore / maxScore) * 1000) / 10
        : null;
      const manualReportDate = cleanText(body.report_date, 10);
      if (manualReportDate && !/^\d{4}-\d{2}-\d{2}$/.test(manualReportDate)) {
        return Response.json({ error: 'report_date must be YYYY-MM-DD.' }, { status: 400 });
      }
      const reportDate = manualReportDate || parsed.reportDate || new Date().toISOString().slice(0, 10);
      const warnings = [...parsed.warnings];
      if (!manualReportDate && !parsed.reportDate) warnings.push('No report date was found. The upload date was used.');
      if (currentScore === null || maxScore === null) warnings.push('No overall score is recorded. Enter it manually if this export contains recommendations only.');
      const sourceType = parsed.recognized ? parsed.sourceType : 'Unrecognized Export';
      const importStatus = parsed.recognized || scorePercent !== null ? 'Parsed' : 'Stored - Review Required';

      const organization = await sr.entities.Organization.get(project.organization_id).catch(() => null);
      const storedName = [
        sanitizePart(organization?.legal_name || organization?.organization_name || organization?.short_name, 'Company'),
        'Microsoft_Secure_Score',
        reportDate,
      ].join('_') + `.${extension}`;
      const privateUpload = await sr.integrations.Core.UploadPrivateFile({
        file: new File([loaded.bytes], storedName, { type: loaded.mime }),
      });
      if (!privateUpload?.file_uri) return Response.json({ error: 'Private Secure Score storage failed.' }, { status: 502 });
      const signed = await sr.integrations.Core.CreateFileSignedUrl({ file_uri: privateUpload.file_uri, expires_in: 120 });
      const verification = await fetch(signed.signed_url);
      if (!verification.ok) return Response.json({ error: 'Stored export verification failed.' }, { status: 502 });
      const verifiedBytes = new Uint8Array(await verification.arrayBuffer());
      if ((await sha256Hex(verifiedBytes)) !== hashValue) {
        return Response.json({ error: 'Stored export hash verification failed.' }, { status: 502 });
      }

      const now = new Date().toISOString();
      const record = await sr.entities.SecureScoreImport.create({
        organization_id: project.organization_id,
        client_id: client?.id || '',
        project_id: project.id,
        source_type: sourceType,
        import_status: importStatus,
        report_date: reportDate,
        tenant_id: cleanText(body.tenant_id, 100) || parsed.tenantId || '',
        current_score: currentScore,
        max_score: maxScore,
        score_percent: scorePercent,
        record_count: parsed.recordCount,
        recommendation_count: parsed.recommendationCount,
        completed_count: parsed.completedCount,
        category_summary: parsed.categorySummary,
        parsed_summary: parsed.summary,
        parser_warnings: [...new Set(warnings.map((warning) => cleanText(warning, 500)).filter(Boolean))],
        file_uri: privateUpload.file_uri,
        file_name: storedName,
        original_file_name: originalName,
        mime_type: loaded.mime,
        file_size_bytes: loaded.bytes.length,
        hash_algorithm: 'SHA-256',
        hash_value: hashValue,
        uploaded_by_email: caller.email || '',
        uploaded_by_name: caller.full_name || caller.email || '',
        uploaded_at: now,
        parser_version: PARSER_VERSION,
        notes: cleanText(body.notes, 2000),
      });
      await sr.entities.AuditLog.create({
        organization_id: project.organization_id,
        user_email: caller.email || '',
        user_name: caller.full_name || '',
        action_type: 'ACOLYTE Secure Score Export Uploaded',
        target_entity: 'SecureScoreImport',
        target_record_id: record.id,
        action_summary: `Stored Microsoft Secure Score export "${storedName}" for ${project.project_name || 'the selected project'} with SHA-256 ${hashValue.slice(0, 12)}.`,
        ip_address: '',
        user_agent: req.headers.get('user-agent') || '',
      });
      return Response.json({ import: record });
    }

    const importId = cleanText(body.import_id, 100);
    if (!importId) return Response.json({ error: 'import_id is required.' }, { status: 400 });
    const record = await sr.entities.SecureScoreImport.get(importId).catch(() => null);
    if (!record) return Response.json({ error: 'Secure Score export not found.' }, { status: 404 });
    const project = await sr.entities.Project.get(record.project_id).catch(() => null);
    if (!project || project.organization_id !== record.organization_id) {
      return Response.json({ error: 'Secure Score export not found.' }, { status: 404 });
    }
    if (record.client_id) {
      const client = await sr.entities.Client.get(record.client_id).catch(() => null);
      if (!client || client.organization_id !== record.organization_id) {
        return Response.json({ error: 'Secure Score client assignment is invalid.' }, { status: 409 });
      }
    }

    const denied = await authorizeProject(project, record.client_id || '', action === 'archive');
    if (denied) return denied;

    if (action === 'download') {
      if (!String(record.file_uri || '').startsWith('mp/private/')) {
        return Response.json({ error: 'The export is not stored in canonical private storage.' }, { status: 409 });
      }
      const signed = await sr.integrations.Core.CreateFileSignedUrl({ file_uri: record.file_uri, expires_in: 300 });
      await sr.entities.AuditLog.create({
        organization_id: record.organization_id,
        user_email: caller.email || '',
        user_name: caller.full_name || '',
        action_type: 'ACOLYTE Secure Score Export Downloaded',
        target_entity: 'SecureScoreImport',
        target_record_id: record.id,
        action_summary: `Generated a five-minute download for "${record.file_name}".`,
        ip_address: '',
        user_agent: req.headers.get('user-agent') || '',
      });
      return Response.json({ signed_url: signed.signed_url, file_name: record.file_name, expires_in: 300 });
    }

    if (record.import_status === 'Archived') return Response.json({ import: record, idempotent: true });
    const updated = await sr.entities.SecureScoreImport.update(record.id, {
      import_status: 'Archived',
      archived_at: new Date().toISOString(),
      archived_by_email: caller.email || '',
    });
    await sr.entities.AuditLog.create({
      organization_id: record.organization_id,
      user_email: caller.email || '',
      user_name: caller.full_name || '',
      action_type: 'ACOLYTE Secure Score Export Archived',
      target_entity: 'SecureScoreImport',
      target_record_id: record.id,
      action_summary: `Archived Secure Score export "${record.file_name}".`,
      ip_address: '',
      user_agent: req.headers.get('user-agent') || '',
    });
    return Response.json({ import: updated });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
});