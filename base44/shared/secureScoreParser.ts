// Canonical Microsoft Secure Score export parser, shared by:
//  - manageSecureScoreImport (manual CSV/JSON uploads — unchanged behavior)
//  - manageAcolyteMicrosoftMonitoring (Graph-collected Secure Score responses)
// Extracted verbatim from the original manageSecureScoreImport parser so both
// paths normalize Secure Score data identically and share one history model.

export const PARSER_VERSION = 'acolyte-secure-score-1.0.0';

export function cleanText(value: unknown, max = 4000) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

export function numberValue(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  const raw = String(value ?? '').replace(/[$,%]/g, '').replace(/,/g, '').trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function dateValue(value: unknown): string {
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

export function parseExport(bytes: Uint8Array, extension: string) {
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