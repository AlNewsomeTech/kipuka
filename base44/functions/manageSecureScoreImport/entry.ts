import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const APP_ID = '6a3a0bd467c38d3ef7400909';
const PARSER_VERSION = 'acolyte-secure-score-1.0.0';
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

function cleanText(value: unknown, max = 4000) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || 'Secure Score import failed.');
}

function extensionOf(name: string) {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || '';
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  const raw = String(value ?? '').replace(/[$,%]/g, '').replace(/,/g, '').trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function dateValue(value: unknown): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function normalizedKey(value: unknown) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function rowValue(row: Record<string, unknown>, aliases: string[]) {
  const wanted = new Set(aliases.map(normalizedKey));
  const key = Object.keys(row).find((candidate) => wanted.has(normalizedKey(candidate)));
  return key ? row[key] : undefined;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell.trim());
      cell = '';
    } else if (char === '\n') {
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (!rows.length) return { headers: [] as string[], records: [] as Record<string, unknown>[] };
  const headers = rows[0].map((value, index) => cleanText(value, 160) || `Column ${index + 1}`);
  const records = rows.slice(1).map((values) => Object.fromEntries(
    headers.map((header, index) => [header, cleanText(values[index], 2000)]),
  ));
  return { headers, records };
}

function summarizeRecords(records: Record<string, unknown>[], headers: string[]) {
  const warnings: string[] = [];
  const scoreCandidates = records.map((row) => ({
    current: numberValue(rowValue(row, ['currentScore', 'current score', 'tenantScore', 'tenant score', 'score achieved', 'achieved points'])),
    max: numberValue(rowValue(row, ['maxScore', 'max score', 'tenantMaxScore', 'tenant max score', 'maximum score', 'points possible'])),
    date: dateValue(rowValue(row, ['createdDateTime', 'createDateTime', 'created date time', 'report date', 'date'])),
    tenant: cleanText(rowValue(row, ['azureTenantId', 'tenantId', 'tenant id']), 100),
  })).filter((item) => item.current !== null && item.max !== null && Number(item.max) > 0);
  scoreCandidates.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const score = scoreCandidates[0] || null;

  const categorySummary: Record<string, { records: number, achieved_points: number, possible_points: number }> = {};
  const statusCounts: Record<string, number> = {};
  let recommendationCount = 0;
  let completedCount = 0;
  for (const row of records) {
    const category = cleanText(rowValue(row, ['controlCategory', 'category', 'score category', 'product category']), 80);
    const recommendation = cleanText(rowValue(row, ['recommendation', 'recommended action', 'action', 'title', 'controlName', 'control name']), 240);
    const status = cleanText(rowValue(row, ['status', 'implementation status', 'action status']), 80);
    if (recommendation) recommendationCount += 1;
    if (status) {
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      if (/completed|implemented|resolved/i.test(status)) completedCount += 1;
    }
    if (category) {
      const current = categorySummary[category] || { records: 0, achieved_points: 0, possible_points: 0 };
      current.records += 1;
      current.achieved_points += numberValue(rowValue(row, ['score', 'points achieved', 'achieved points', 'current score'])) || 0;
      current.possible_points += numberValue(rowValue(row, ['max score', 'maximum score', 'points possible', 'max points'])) || 0;
      categorySummary[category] = current;
    }
  }

  const recognizedHeaders = headers.filter((header) => [
    'currentscore', 'maxscore', 'tenantscore', 'tenantmaxscore', 'createddatetime',
    'createdatetime', 'azuretenantid', 'tenantid', 'controlcategory', 'category',
    'recommendation', 'recommendedaction', 'controlname', 'status',
  ].includes(normalizedKey(header)));
  if (!recognizedHeaders.length) warnings.push('No recognized Microsoft Secure Score columns were found. The original export was preserved for review.');
  if (!score) warnings.push('An overall current and maximum score could not be derived from the export.');

  return {
    recognized: recognizedHeaders.length > 0,
    currentScore: score?.current ?? null,
    maxScore: score?.max ?? null,
    reportDate: score?.date || '',
    tenantId: score?.tenant || '',
    recommendationCount,
    completedCount,
    categorySummary,
    summary: {
      headers: headers.slice(0, 80),
      recognized_headers: recognizedHeaders.slice(0, 40),
      status_counts: statusCounts,
    },
    warnings,
  };
}

function parseExport(bytes: Uint8Array, extension: string) {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes).replace(/^\uFEFF/, '');
  if (extension === 'csv') {
    const parsed = parseCsv(text);
    if (!parsed.records.length) throw new Error('The CSV export contains no data rows.');
    return {
      sourceType: 'Microsoft Defender CSV',
      recordCount: parsed.records.length,
      ...summarizeRecords(parsed.records, parsed.headers),
    };
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('The JSON export is not valid JSON.');
  }
  const root = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const collection = Array.isArray(root.value) ? root.value : [root];
  const records = collection.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'));
  if (!records.length) throw new Error('The JSON export contains no Secure Score records.');
  const summarized = summarizeRecords(records, Object.keys(records[0] || {}));

  const scoreRecords = records.filter((record) =>
    numberValue(record.currentScore ?? record.tenantScore) !== null
    && numberValue(record.maxScore ?? record.tenantMaxScore) !== null
  ).sort((a, b) => String(b.createdDateTime || b.createDateTime || '').localeCompare(String(a.createdDateTime || a.createDateTime || '')));
  const latest = scoreRecords[0] || records[0];
  const controls = Array.isArray(latest.controlScores)
    ? latest.controlScores.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    : [];
  const controlSummary = controls.length ? summarizeRecords(controls, Object.keys(controls[0] || {})) : null;
  const enabledServices = Array.isArray(latest.enabledServices)
    ? latest.enabledServices.map((item) => cleanText(item, 120)).filter(Boolean).slice(0, 100)
    : [];

  return {
    sourceType: 'Microsoft Graph JSON',
    recordCount: records.length,
    recognized: summarized.recognized || scoreRecords.length > 0 || controls.length > 0,
    currentScore: numberValue(latest.currentScore ?? latest.tenantScore) ?? summarized.currentScore,
    maxScore: numberValue(latest.maxScore ?? latest.tenantMaxScore) ?? summarized.maxScore,
    reportDate: dateValue(latest.createdDateTime ?? latest.createDateTime) || summarized.reportDate,
    tenantId: cleanText(latest.azureTenantId ?? latest.tenantId, 100) || summarized.tenantId,
    recommendationCount: controls.length || summarized.recommendationCount,
    completedCount: controlSummary?.completedCount || summarized.completedCount,
    categorySummary: controlSummary?.categorySummary || summarized.categorySummary,
    summary: {
      ...summarized.summary,
      enabled_services: enabledServices,
      active_user_count: numberValue(latest.activeUserCount),
      licensed_user_count: numberValue(latest.licensedUserCount),
      control_score_count: controls.length,
    },
    warnings: summarized.warnings.filter((warning) => !(scoreRecords.length && warning.startsWith('An overall'))),
  };
}

async function sha256Hex(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
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
