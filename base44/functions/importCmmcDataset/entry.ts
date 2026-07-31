import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { parse } from 'npm:csv-parse@5.5.6/sync';

// ============================================================================
// KIPUKA — VERSIONED AUTHORITATIVE CMMC DATA IMPORTER (admin only)
//
// Builds a fully validated, versioned CMMC 2.13 / NIST SP 800-171 Rev.2 dataset
// from the normative NIST SP 800-171A assessment-procedures CSV plus a
// hardcoded FAR 52.204-21(b)(1) Level 1 map.
//
// Modes:
//   dry_run  — validates everything and returns a plan. PERFORMS ZERO WRITES.
//   apply    — implemented below as a non-destructive version migration.
//
// Nothing is ever deleted. Legacy records are deactivated and marked
// superseded_by_control_id. Activation happens last and is idempotent.
// ============================================================================

const DATASET_KEY = 'CMMC-2.13-SP800-171R2-2024-09';
const DATASET_VERSION = '2.13';
const SOURCE_URL =
  'https://csrc.nist.gov/files/pubs/sp/800/171/a/final/docs/sp800-171a-assessment-procedures.csv';
const SOURCE_SHA256 =
  'adbdcb46836ea581fe8d7c1f768d8fdb6a13e14da465c60b897d9743ee31c51c';

const EXPECT = {
  l1Requirements: 15,
  l2Requirements: 110,
  l1Objectives: 59,
  l2Objectives: 320,
  bracketObjectives: 297,
  syntheticObjectives: 23,
  totalRequirements: 125,
  totalObjectives: 379,
};

const NORMATIVE_PUBLICATIONS = [
  'NIST SP 800-171 Rev. 2, including January 28, 2021 updates',
  'NIST SP 800-171A, June 2018',
  'DoD CMMC Assessment Guide Level 1 v2.13, September 2024',
  'DoD CMMC Assessment Guide Level 2 v2.13, September 2024',
  'FAR 52.204-21(b)(1)',
  '32 CFR Part 170',
];

const REGULATORY_STATUS_NOTE =
  'On July 13, 2026, DoD suspended CMMC Phase II implementation while keeping Phase I self-assessment requirements in place. This standards dataset remains versioned for implementation and readiness work and must be reviewed when DoD publishes revisions.';

// Family derived from the NUMERIC requirement family, never the CSV Family column.
const FAMILY_MAP: Record<string, { code: string; domain: string }> = {
  '3.1': { code: 'AC', domain: 'Access Control' },
  '3.2': { code: 'AT', domain: 'Awareness and Training' },
  '3.3': { code: 'AU', domain: 'Audit and Accountability' },
  '3.4': { code: 'CM', domain: 'Configuration Management' },
  '3.5': { code: 'IA', domain: 'Identification and Authentication' },
  '3.6': { code: 'IR', domain: 'Incident Response' },
  '3.7': { code: 'MA', domain: 'Maintenance' },
  '3.8': { code: 'MP', domain: 'Media Protection' },
  '3.9': { code: 'PS', domain: 'Personnel Security' },
  '3.10': { code: 'PE', domain: 'Physical Protection' },
  '3.11': { code: 'RA', domain: 'Risk Assessment' },
  '3.12': { code: 'CA', domain: 'Security Assessment' },
  '3.13': { code: 'SC', domain: 'System and Communications Protection' },
  '3.14': { code: 'SI', domain: 'System and Information Integrity' },
};

// Known normative correction: the CSV requirement text for 3.13.12 is blank.
const CORRECTION_3_13_12 =
  'Prohibit remote activation of collaborative computing devices and provide indication of devices in use to users present at the device.';

// The malformed source identifier 3.12.4.[h] must normalize to 3.12.4[h].
const MALFORMED_SOURCE_ID = '3.12.4.[h]';
const MALFORMED_NORMALIZED = '3.12.4[h]';

// --------------------------------------------------------- Level 1 map ------
// FAR 52.204-21(b)(1) / CMMC Assessment Guide Level 1 v2.13. Exactly 15.
const LEVEL1_MAP = [
  { control_id: 'AC.L1-b.1.i', title: 'Authorized Access Control', far: 'FAR 52.204-21(b)(1)(i)', nist: ['3.1.1'], text: 'Limit information system access to authorized users, processes acting on behalf of authorized users, or devices (including other information systems).' },
  { control_id: 'AC.L1-b.1.ii', title: 'Transaction & Function Control', far: 'FAR 52.204-21(b)(1)(ii)', nist: ['3.1.2'], text: 'Limit information system access to the types of transactions and functions that authorized users are permitted to execute.' },
  { control_id: 'AC.L1-b.1.iii', title: 'External Connections', far: 'FAR 52.204-21(b)(1)(iii)', nist: ['3.1.20'], text: 'Verify and control/limit connections to and use of external information systems.' },
  { control_id: 'AC.L1-b.1.iv', title: 'Control Public Information', far: 'FAR 52.204-21(b)(1)(iv)', nist: ['3.1.22'], text: 'Control information posted or processed on publicly accessible information systems.' },
  { control_id: 'IA.L1-b.1.v', title: 'Identification', far: 'FAR 52.204-21(b)(1)(v)', nist: ['3.5.1'], text: 'Identify information system users, processes acting on behalf of users, or devices.' },
  { control_id: 'IA.L1-b.1.vi', title: 'Authentication', far: 'FAR 52.204-21(b)(1)(vi)', nist: ['3.5.2'], text: 'Authenticate (or verify) the identities of those users, processes, or devices, as a prerequisite to allowing access to organizational information systems.' },
  { control_id: 'MP.L1-b.1.vii', title: 'Media Disposal', far: 'FAR 52.204-21(b)(1)(vii)', nist: ['3.8.3'], text: 'Sanitize or destroy information system media containing Federal Contract Information before disposal or release for reuse.' },
  { control_id: 'PE.L1-b.1.viii', title: 'Limit Physical Access', far: 'FAR 52.204-21(b)(1)(viii)', nist: ['3.10.1'], text: 'Limit physical access to organizational information systems, equipment, and the respective operating environments to authorized individuals.' },
  { control_id: 'PE.L1-b.1.ix', title: 'Manage Visitors & Physical Access', far: 'FAR 52.204-21(b)(1)(ix)', nist: ['3.10.3', '3.10.4', '3.10.5'], text: 'Escort visitors and monitor visitor activity; maintain audit logs of physical access; and control and manage physical access devices.' },
  { control_id: 'SC.L1-b.1.x', title: 'Boundary Protection', far: 'FAR 52.204-21(b)(1)(x)', nist: ['3.13.1'], text: 'Monitor, control, and protect organizational communications (i.e., information transmitted or received by organizational information systems) at the external boundaries and key internal boundaries of the information systems.' },
  { control_id: 'SC.L1-b.1.xi', title: 'Public-Access System Separation', far: 'FAR 52.204-21(b)(1)(xi)', nist: ['3.13.5'], text: 'Implement subnetworks for publicly accessible system components that are physically or logically separated from internal networks.' },
  { control_id: 'SI.L1-b.1.xii', title: 'Flaw Remediation', far: 'FAR 52.204-21(b)(1)(xii)', nist: ['3.14.1'], text: 'Identify, report, and correct information and information system flaws in a timely manner.' },
  { control_id: 'SI.L1-b.1.xiii', title: 'Malicious Code Protection', far: 'FAR 52.204-21(b)(1)(xiii)', nist: ['3.14.2'], text: 'Provide protection from malicious code at appropriate locations within organizational information systems.' },
  { control_id: 'SI.L1-b.1.xiv', title: 'Update Malicious Code Protection', far: 'FAR 52.204-21(b)(1)(xiv)', nist: ['3.14.4'], text: 'Update malicious code protection mechanisms when new releases are available.' },
  { control_id: 'SI.L1-b.1.xv', title: 'System & File Scanning', far: 'FAR 52.204-21(b)(1)(xv)', nist: ['3.14.5'], text: 'Perform periodic scans of the information system and real-time scans of files from external sources as files are downloaded, opened, or executed.' },
];

// ------------------------------------------------------------- helpers ------
const clean = (s: unknown) => String(s ?? '').replace(/\uFEFF/g, '').trim();

async function sha256Hex(input: ArrayBuffer | Uint8Array | string) {
  const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest('SHA-256', data as BufferSource);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Deterministic JSON used for authoritative row hashes and lossless de-duplication.
function stableSerialize(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(obj[key])}`).join(',')}}`;
  }
  const encoded = JSON.stringify(value);
  return encoded === undefined ? String(value) : encoded;
}

function familyOf(reqId: string) {
  const m = reqId.match(/^(3\.\d+)\.\d+$/);
  const fam = m ? FAMILY_MAP[m[1]] : null;
  if (!fam) throw new Error(`Unknown requirement family for ${reqId}`);
  return fam;
}

// Normalize identifiers: trim, and repair the known malformed 3.12.4.[h].
function normalizeIdentifier(raw: string) {
  const t = clean(raw);
  return t.replace(/^(3\.\d+\.\d+)\.\[/, '$1[');
}

// "[SELECT FROM: a; b; c]" -> ['a','b','c']
function parseSelectFrom(cellRaw: string): string[] {
  const cell = clean(cellRaw);
  if (!cell) return [];
  const inner = cell.replace(/^\[?\s*SELECT\s+FROM\s*:\s*/i, '').replace(/\]\s*$/, '');
  return inner.split(';').map((s) => clean(s).replace(/\.$/, '')).filter(Boolean);
}

// Level 1 display-only substitution: standalone CUI -> FCI. Level 2 untouched.
function cuiToFci(text: string) {
  return String(text ?? '').replace(/\bCUI\b/g, 'FCI');
}

function fail(errors: string[], msg: string) {
  errors.push(msg);
}

// ------------------------------------------------------- dataset build ------
async function buildDataset() {
  const errors: string[] = [];

  const res = await fetch(SOURCE_URL, {
    headers: { 'User-Agent': 'Kipuka-CMMC-Dataset-Importer/1.0' },
  });
  if (!res.ok) throw new Error(`Source fetch failed with HTTP ${res.status}`);

  // Hash the EXACT downloaded bytes before any parsing.
  const bytes = new Uint8Array(await res.arrayBuffer());
  const sourceHash = await sha256Hex(bytes);
  if (sourceHash !== SOURCE_SHA256) {
    throw new Error(
      `Source checksum mismatch. Expected ${SOURCE_SHA256}, got ${sourceHash}. Refusing to import.`,
    );
  }

  const text = new TextDecoder('utf-8').decode(bytes);
  const rows: string[][] = parse(text, {
    bom: true,
    relax_column_count: true,
    skip_empty_lines: true,
  });

  const header = rows[0] || [];
  const body = rows.slice(1).filter((r) => r && r.length > 1);
  if (header.length !== 8) fail(errors, `Unexpected source header width ${header.length}, expected 8.`);

  const COL = { id: 1, requirement: 3, objective: 4, examine: 5, interview: 6, test: 7 };

  // --- requirement rows: identifier matches ^3\.\d+\.\d+$ exactly.
  const reqRe = /^3\.\d+\.\d+$/;
  const reqRows = body.filter((r) => reqRe.test(clean(r[COL.id])));
  const reqById = new Map<string, string[]>();
  for (const r of reqRows) {
    const id = clean(r[COL.id]);
    if (reqById.has(id)) fail(errors, `Duplicate requirement row for ${id}.`);
    reqById.set(id, r);
  }
  const requirementIds = [...reqById.keys()];
  if (requirementIds.length !== EXPECT.l2Requirements) {
    fail(errors, `Expected ${EXPECT.l2Requirements} unique requirement identifiers, found ${requirementIds.length}.`);
  }

  // --- bracketed objective rows.
  const bracketRows: { id: string; raw: string; row: string[] }[] = [];
  let sawMalformed = false;
  for (const r of body) {
    const raw = clean(r[COL.id]);
    if (!raw.includes('[')) continue;
    if (raw === MALFORMED_SOURCE_ID) sawMalformed = true;
    const id = normalizeIdentifier(raw);
    if (!/^3\.\d+\.\d+\[[a-z0-9]+\]$/.test(id)) {
      fail(errors, `Malformed objective identifier that is not a known correction: "${raw}".`);
      continue;
    }
    bracketRows.push({ id, raw, row: r });
  }
  if (bracketRows.length !== EXPECT.bracketObjectives) {
    fail(errors, `Expected ${EXPECT.bracketObjectives} bracket objectives, found ${bracketRows.length}.`);
  }
  if (!sawMalformed) {
    fail(errors, `Expected the known malformed identifier ${MALFORMED_SOURCE_ID} to be present in the source.`);
  }
  if (!bracketRows.some((b) => b.id === MALFORMED_NORMALIZED)) {
    fail(errors, `Normalization of ${MALFORMED_SOURCE_ID} to ${MALFORMED_NORMALIZED} did not occur.`);
  }
  const bracketIds = new Set(bracketRows.map((b) => b.id));
  if (bracketIds.size !== bracketRows.length) fail(errors, 'Duplicate normalized objective identifiers found.');

  const childrenByReq = new Map<string, typeof bracketRows>();
  for (const b of bracketRows) {
    const reqId = b.id.slice(0, b.id.indexOf('['));
    if (!reqById.has(reqId)) fail(errors, `Objective ${b.id} has no parent requirement row.`);
    const list = childrenByReq.get(reqId) || [];
    list.push(b);
    childrenByReq.set(reqId, list);
  }

  // --- method/object lists come from the requirement (header) row.
  const methodsByReq = new Map<string, { examine: string[]; interview: string[]; test: string[] }>();
  for (const [id, row] of reqById) {
    methodsByReq.set(id, {
      examine: parseSelectFrom(row[COL.examine]),
      interview: parseSelectFrom(row[COL.interview]),
      test: parseSelectFrom(row[COL.test]),
    });
  }

  // --- requirement text, with the single known normative correction.
  const requirementText = new Map<string, string>();
  const corrections: string[] = [];
  for (const [id, row] of reqById) {
    let txt = clean(row[COL.requirement]);
    if (!txt) {
      if (id === '3.13.12') {
        txt = CORRECTION_3_13_12;
        corrections.push(`3.13.12 requirement text was blank in the source CSV and was set to the NIST SP 800-171 Rev.2 normative text.`);
      } else {
        fail(errors, `Blank requirement text for ${id} with no approved normative correction.`);
      }
    }
    requirementText.set(id, txt);
  }

  // --- objectives per requirement: bracketed children, else exactly one synthetic [a].
  type Obj = { reqId: string; objective_id: string; raw: string; text: string };
  const l2Objectives: Obj[] = [];
  let syntheticCount = 0;
  for (const reqId of requirementIds) {
    const children = childrenByReq.get(reqId);
    if (children && children.length > 0) {
      // Never synthesize for a requirement that already has bracketed children.
      for (const c of children) {
        const txt = clean(c.row[COL.objective]);
        if (!txt) fail(errors, `Blank objective text for ${c.id}.`);
        l2Objectives.push({ reqId, objective_id: c.id, raw: c.raw, text: txt });
      }
    } else {
      const txt = clean(reqById.get(reqId)[COL.objective]);
      if (!txt) fail(errors, `Requirement ${reqId} has no child objectives and no objective text to synthesize from.`);
      syntheticCount++;
      l2Objectives.push({ reqId, objective_id: `${reqId}[a]`, raw: clean(reqById.get(reqId)[COL.id]), text: txt });
    }
  }
  if (syntheticCount !== EXPECT.syntheticObjectives) {
    fail(errors, `Expected ${EXPECT.syntheticObjectives} synthetic single objectives, found ${syntheticCount}.`);
  }
  if (l2Objectives.length !== EXPECT.l2Objectives) {
    fail(errors, `Expected ${EXPECT.l2Objectives} Level 2 objectives, found ${l2Objectives.length}.`);
  }
  if (new Set(l2Objectives.map((o) => o.objective_id)).size !== l2Objectives.length) {
    fail(errors, 'Duplicate Level 2 objective IDs after assembly.');
  }

  const meta = {
    dataset_key: DATASET_KEY,
    dataset_version: DATASET_VERSION,
    source_url: SOURCE_URL,
    source_sha256: sourceHash,
  };

  // --- Level 2 ControlLibrary records.
  const l2Controls = [];
  let order = 0;
  for (const reqId of requirementIds) {
    const fam = familyOf(reqId);
    const control_id = `${fam.code}.L2-${reqId}`;
    const text = requirementText.get(reqId);
    const record: any = {
      ...meta,
      framework: 'CMMC',
      cmmc_level: 'Level 2',
      domain: fam.domain,
      control_id,
      requirement_text: text,
      source_requirement_id: reqId,
      source_document: 'NIST SP 800-171 Rev. 2 / NIST SP 800-171A',
      source_version: 'Rev. 2 (Jan 28, 2021 updates); 800-171A June 2018',
      crosswalk_requirement_ids: [reqId],
      authoritative: true,
      active: false,
      sort_order: ++order,
    };
    record.content_sha256 = await sha256Hex(stableSerialize(record));
    l2Controls.push(record);
  }

  // --- Level 2 objective rows.
  const l2ObjectiveRows = [];
  let objOrder = 0;
  for (const o of l2Objectives) {
    const fam = familyOf(o.reqId);
    const control_id = `${fam.code}.L2-${o.reqId}`;
    const m = methodsByReq.get(o.reqId) || { examine: [], interview: [], test: [] };
    const record: any = {
      ...meta,
      framework: 'NIST SP 800-171A',
      cmmc_level: 'Level 2',
      domain: fam.domain,
      control_id,
      source_requirement_id: o.reqId,
      objective_key: `${DATASET_KEY}|${control_id}|${o.objective_id}`,
      objective_id: o.objective_id,
      source_objective_id_raw: o.raw,
      objective_text: o.text,
      examine_objects: m.examine,
      interview_objects: m.interview,
      test_objects: m.test,
      source_document: 'NIST SP 800-171A',
      source_version: 'June 2018',
      sort_order: ++objOrder,
      active: false,
    };
    record.content_sha256 = await sha256Hex(stableSerialize(record));
    l2ObjectiveRows.push(record);
  }

  // --- Level 1 ControlLibrary records (hardcoded authoritative map).
  const l1Controls = [];
  let l1Order = 0;
  for (const entry of LEVEL1_MAP) {
    const fam = familyOf(entry.nist[0]);
    const record: any = {
      ...meta,
      framework: 'CMMC',
      cmmc_level: 'Level 1',
      domain: fam.domain,
      control_id: entry.control_id,
      control_title: entry.title,
      requirement_text: entry.text,
      source_requirement_id: entry.nist[0],
      source_document: `FAR 52.204-21(b)(1) — ${entry.far}; CMMC Assessment Guide Level 1 v2.13`,
      source_version: 'v2.13 (September 2024)',
      crosswalk_requirement_ids: entry.nist,
      authoritative: true,
      active: false,
      sort_order: ++l1Order,
    };
    record.content_sha256 = await sha256Hex(stableSerialize(record));
    l1Controls.push(record);
  }
  if (l1Controls.length !== EXPECT.l1Requirements) {
    fail(errors, `Expected ${EXPECT.l1Requirements} Level 1 requirements, found ${l1Controls.length}.`);
  }

  // --- Level 1 objective rows, built only from the mapped NIST requirements.
  // PE.L1-b.1.ix combines 3.10.3, 3.10.4 and 3.10.5 into one CMMC requirement.
  const l1ObjectiveRows = [];
  let l1ObjOrder = 0;
  for (const entry of LEVEL1_MAP) {
    const fam = familyOf(entry.nist[0]);
    for (const reqId of entry.nist) {
      const mapped = l2Objectives.filter((o) => o.reqId === reqId);
      if (mapped.length === 0) fail(errors, `Level 1 crosswalk ${entry.control_id} found no objectives for ${reqId}.`);
      const m = methodsByReq.get(reqId) || { examine: [], interview: [], test: [] };
      for (const o of mapped) {
        const objective_text = cuiToFci(o.text);
        const record: any = {
          ...meta,
          framework: 'NIST SP 800-171A',
          cmmc_level: 'Level 1',
          domain: fam.domain,
          control_id: entry.control_id,
          source_requirement_id: reqId,
          objective_key: `${DATASET_KEY}|${entry.control_id}|${o.objective_id}`,
          objective_id: o.objective_id,
          source_objective_id_raw: o.raw,
          objective_text,
          examine_objects: m.examine.map(cuiToFci),
          interview_objects: m.interview.map(cuiToFci),
          test_objects: m.test.map(cuiToFci),
          source_document: 'NIST SP 800-171A (crosswalked via CMMC Assessment Guide Level 1 v2.13)',
          source_version: 'June 2018 / v2.13',
          sort_order: ++l1ObjOrder,
          active: false,
        };
        record.content_sha256 = await sha256Hex(stableSerialize(record));
        l1ObjectiveRows.push(record);
      }
    }
  }
  if (l1ObjectiveRows.length !== EXPECT.l1Objectives) {
    fail(errors, `Expected ${EXPECT.l1Objectives} Level 1 objectives, found ${l1ObjectiveRows.length}.`);
  }

  // --- global invariants.
  const allControls = [...l1Controls, ...l2Controls];
  const allObjectives = [...l1ObjectiveRows, ...l2ObjectiveRows];
  if (allControls.length !== EXPECT.totalRequirements) {
    fail(errors, `Expected ${EXPECT.totalRequirements} total requirements, found ${allControls.length}.`);
  }
  if (allObjectives.length !== EXPECT.totalObjectives) {
    fail(errors, `Expected ${EXPECT.totalObjectives} total objective rows, found ${allObjectives.length}.`);
  }
  if (new Set(allControls.map((c) => c.control_id)).size !== allControls.length) {
    fail(errors, 'Duplicate control_id values in the assembled dataset.');
  }
  if (new Set(allObjectives.map((o) => o.objective_key)).size !== allObjectives.length) {
    fail(errors, 'Duplicate objective_key values in the assembled dataset.');
  }
  for (const c of allControls) {
    if (!clean(c.requirement_text)) fail(errors, `Blank requirement text for ${c.control_id}.`);
    if (!c.source_sha256 || !c.dataset_key) fail(errors, `Missing source metadata for ${c.control_id}.`);
  }
  for (const o of allObjectives) {
    if (!clean(o.objective_text)) fail(errors, `Blank objective text for ${o.objective_key}.`);
  }

  const contentHash = await sha256Hex(
    [...allControls.map((c) => c.content_sha256), ...allObjectives.map((o) => o.content_sha256)].join('|'),
  );

  const manifest = {
    dataset_key: DATASET_KEY,
    dataset_version: DATASET_VERSION,
    normative_publications: NORMATIVE_PUBLICATIONS,
    level2_source_url: SOURCE_URL,
    level2_source_sha256: sourceHash,
    identifier_normalizations: [`${MALFORMED_SOURCE_ID} -> ${MALFORMED_NORMALIZED}`],
    normative_corrections: corrections,
  };

  return {
    errors,
    sourceHash,
    contentHash,
    manifest,
    corrections,
    l1Controls,
    l2Controls,
    l1ObjectiveRows,
    l2ObjectiveRows,
    allControls,
    allObjectives,
    counts: {
      level1_requirement_count: l1Controls.length,
      level2_requirement_count: l2Controls.length,
      level1_objective_count: l1ObjectiveRows.length,
      level2_objective_count: l2ObjectiveRows.length,
      bracket_objectives: bracketRows.length,
      synthetic_objectives: syntheticCount,
      total_requirements: allControls.length,
      total_objectives: allObjectives.length,
    },
  };
}

// --------------------------------------------------- legacy guidance -------
// Preserve every human-authored field from legacy records; authoritative
// metadata only replaces the fields it owns.
const AUTHORITATIVE_FIELDS = new Set([
  'framework', 'cmmc_level', 'domain', 'control_id', 'requirement_text',
  'dataset_key', 'dataset_version', 'source_requirement_id', 'source_document',
  'source_version', 'source_url', 'source_sha256', 'crosswalk_requirement_ids',
  'content_sha256', 'authoritative', 'active', 'sort_order',
  'id', 'created_date', 'updated_date', 'created_by_id', 'is_sample',
]);

function mergeArrays(a: unknown, b: unknown) {
  const list = [...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])];
  const seen = new Set<string>();
  return list.filter((item) => {
    const key = stableSerialize(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeGuidanceValue(existing: any, incoming: any): any {
  if (incoming === undefined || incoming === null || incoming === '') return existing;
  if (existing === undefined || existing === null || existing === '') return incoming;
  if (Array.isArray(existing) && Array.isArray(incoming)) return mergeArrays(existing, incoming);
  if (
    typeof existing === 'object' && !Array.isArray(existing) &&
    typeof incoming === 'object' && !Array.isArray(incoming)
  ) {
    const result = { ...existing };
    for (const [key, value] of Object.entries(incoming)) {
      result[key] = mergeGuidanceValue(result[key], value);
    }
    return result;
  }
  if (typeof existing === 'string' && typeof incoming === 'string') {
    if (existing === incoming || existing.includes(incoming)) return existing;
    if (incoming.includes(existing)) return incoming;
    return `${existing}\n\n${incoming}`;
  }
  return existing;
}

// Merge legacy guidance recursively so nested runbooks and arrays of objects are
// preserved without converting them to strings or overwriting sibling steps.
function mergeLegacyGuidance(targets: any[]) {
  const merged: Record<string, any> = {};
  for (const legacy of targets) {
    if (!legacy) continue;
    for (const [k, v] of Object.entries(legacy)) {
      if (AUTHORITATIVE_FIELDS.has(k)) continue;
      merged[k] = mergeGuidanceValue(merged[k], v);
    }
  }
  return merged;
}

// ---------------------------------------------------------------- entry -----
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 1. Authentication before anything else.
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Authorization: exactly admin, before any service-role read or fetch.
    if (user.role !== 'admin') {
      return Response.json(
        { error: 'Only platform administrators may import compliance datasets.' },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const datasetKey = body?.dataset_key;
    const mode = body?.mode;

    if (datasetKey !== DATASET_KEY) {
      return Response.json(
        { error: `Unsupported dataset_key. This importer only handles ${DATASET_KEY}.` },
        { status: 400 },
      );
    }
    if (mode !== 'dry_run' && mode !== 'apply') {
      return Response.json({ error: "mode must be exactly 'dry_run' or 'apply'." }, { status: 400 });
    }

    const built = await buildDataset();

    if (built.errors.length > 0) {
      return Response.json(
        {
          ok: false,
          mode,
          dataset_key: DATASET_KEY,
          error: 'Dataset validation failed. No changes were made.',
          validation_errors: built.errors,
          counts: built.counts,
        },
        { status: 422 },
      );
    }

    // ----------------------------------------------------------- DRY RUN ----
    // Reads legacy counts to describe the plan. Performs ZERO entity writes.
    if (mode === 'dry_run') {
      const legacy = await base44.asServiceRole.entities.ControlLibrary
        .filter({ active: true }, 'control_id', 500);
      const legacyL1 = legacy.filter((c: any) => c.cmmc_level === 'Level 1').length;
      const legacyL2 = legacy.filter((c: any) => c.cmmc_level === 'Level 2').length;
      const existingNew = await base44.asServiceRole.entities.ControlLibrary
        .filter({ dataset_key: DATASET_KEY }, 'control_id', 500);

      return Response.json({
        ok: true,
        mode: 'dry_run',
        writes_performed: 0,
        dataset_key: DATASET_KEY,
        dataset_version: DATASET_VERSION,
        source_sha256: built.sourceHash,
        content_sha256: built.contentHash,
        counts: built.counts,
        expected: EXPECT,
        legacy_active: { level1: legacyL1, level2: legacyL2 },
        already_imported_for_dataset: existingNew.length,
        normative_corrections: built.corrections,
        source_manifest: built.manifest,
        regulatory_status_note: REGULATORY_STATUS_NOTE,
        planned_operations: [
          `Create/upsert ${built.counts.total_requirements} ControlLibrary records (active:false).`,
          `Create/upsert ${built.counts.total_objectives} AssessmentObjectiveLibrary rows (active:false).`,
          'Preserve all legacy human-authored guidance and runbooks by NIST requirement number.',
          'Validate all counts, uniqueness, text, metadata and hashes.',
          'Only then: deactivate legacy ControlLibrary records (never delete), activate the new dataset, mark ComplianceDatasetVersion Active.',
        ],
        note: 'Dry run only. No entity records were created, updated, deactivated, or deleted.',
      });
    }

    // ------------------------------------------------------------- APPLY ----
    // Non-destructive version migration. Not executed in this phase.
    const legacyAll = await base44.asServiceRole.entities.ControlLibrary
      .filter({}, 'control_id', 500);
    const legacyActive = legacyAll.filter((c: any) => c.active !== false && !c.dataset_key);
    const legacyL1 = legacyActive.filter((c: any) => c.cmmc_level === 'Level 1').length;
    const legacyL2 = legacyActive.filter((c: any) => c.cmmc_level === 'Level 2').length;
    const alreadyImported = legacyAll.filter((c: any) => c.dataset_key === DATASET_KEY);

    const preconditionOk = (legacyL1 === 17 && legacyL2 === 93) || alreadyImported.length > 0;
    if (!preconditionOk) {
      return Response.json(
        {
          ok: false,
          error: `Apply precondition failed. Expected legacy active counts of 17 Level 1 and 93 Level 2, or an idempotent rerun of ${DATASET_KEY}. Found ${legacyL1} Level 1 and ${legacyL2} Level 2 with no prior import.`,
        },
        { status: 409 },
      );
    }

    // Index legacy guidance by embedded NIST requirement number.
    const legacyByReq = new Map<string, any[]>();
    for (const rec of legacyAll) {
      if (rec.dataset_key === DATASET_KEY) continue;
      const m = String(rec.control_id || '').match(/(3\.\d+\.\d+)/);
      const reqId = m ? m[1] : rec.source_requirement_id;
      if (!reqId) continue;
      const list = legacyByReq.get(reqId) || [];
      list.push(rec);
      legacyByReq.set(reqId, list);
    }

    const existingByControlId = new Map<string, any>(
      alreadyImported.map((r: any) => [r.control_id, r] as [string, any]),
    );
    const created: string[] = [];
    const updated: string[] = [];
    const controlCreates: any[] = [];
    const controlUpdates: any[] = [];

    for (const rec of built.allControls) {
      const legacyMatches = (rec.crosswalk_requirement_ids || []).flatMap(
        (r: string) => legacyByReq.get(r) || [],
      );
      const guidance = mergeLegacyGuidance(legacyMatches);
      const title = rec.control_title || legacyMatches[0]?.control_title || rec.control_id;
      const existing = existingByControlId.get(rec.control_id);
      const payload = {
        ...guidance,
        ...rec,
        control_title: title,
        active: existing?.active === true,
      };
      if (existing) {
        controlUpdates.push({ id: existing.id, ...payload });
        updated.push(rec.control_id);
      } else {
        controlCreates.push({ ...payload, active: false });
        created.push(rec.control_id);
      }
    }
    for (let i = 0; i < controlCreates.length; i += 100) {
      await base44.asServiceRole.entities.ControlLibrary.bulkCreate(controlCreates.slice(i, i + 100));
    }
    for (let i = 0; i < controlUpdates.length; i += 100) {
      await base44.asServiceRole.entities.ControlLibrary.bulkUpdate(controlUpdates.slice(i, i + 100));
    }

    const existingObjectives = await base44.asServiceRole.entities.AssessmentObjectiveLibrary
      .filter({ dataset_key: DATASET_KEY }, 'objective_key', 500);
    const objByKey = new Map<string, any>(
      existingObjectives.map((o: any) => [o.objective_key, o] as [string, any]),
    );
    const objectiveCreates: any[] = [];
    const objectiveUpdates: any[] = [];
    for (const row of built.allObjectives) {
      const existing = objByKey.get(row.objective_key);
      if (existing) {
        objectiveUpdates.push({ id: existing.id, ...row, active: existing.active === true });
      } else {
        objectiveCreates.push({ ...row, active: false });
      }
    }
    for (let i = 0; i < objectiveCreates.length; i += 100) {
      await base44.asServiceRole.entities.AssessmentObjectiveLibrary.bulkCreate(
        objectiveCreates.slice(i, i + 100),
      );
    }
    for (let i = 0; i < objectiveUpdates.length; i += 100) {
      await base44.asServiceRole.entities.AssessmentObjectiveLibrary.bulkUpdate(
        objectiveUpdates.slice(i, i + 100),
      );
    }

    // Re-validate the persisted authoritative fields, hashes and uniqueness
    // before any legacy record is deactivated or target record is activated.
    const persistedControls = await base44.asServiceRole.entities.ControlLibrary
      .filter({ dataset_key: DATASET_KEY }, 'control_id', 500);
    const persistedObjectives = await base44.asServiceRole.entities.AssessmentObjectiveLibrary
      .filter({ dataset_key: DATASET_KEY }, 'objective_key', 500);
    const persistedErrors: string[] = [];
    if (persistedControls.length !== EXPECT.totalRequirements) {
      fail(persistedErrors, `Persisted ${persistedControls.length}/${EXPECT.totalRequirements} requirements.`);
    }
    if (persistedObjectives.length !== EXPECT.totalObjectives) {
      fail(persistedErrors, `Persisted ${persistedObjectives.length}/${EXPECT.totalObjectives} objectives.`);
    }
    if (new Set(persistedControls.map((r: any) => r.control_id)).size !== EXPECT.totalRequirements) {
      fail(persistedErrors, 'Persisted control_id values are not unique and complete.');
    }
    if (new Set(persistedObjectives.map((r: any) => r.objective_key)).size !== EXPECT.totalObjectives) {
      fail(persistedErrors, 'Persisted objective_key values are not unique and complete.');
    }

    const expectedControls = new Map<string, any>(
      built.allControls.map((r: any) => [r.control_id, r] as [string, any]),
    );
    const expectedObjectives = new Map<string, any>(
      built.allObjectives.map((r: any) => [r.objective_key, r] as [string, any]),
    );
    const controlFields = [
      'dataset_key', 'dataset_version', 'framework', 'cmmc_level', 'domain', 'control_id',
      'requirement_text', 'source_requirement_id', 'source_document', 'source_version',
      'source_url', 'source_sha256', 'crosswalk_requirement_ids', 'content_sha256',
      'authoritative', 'sort_order',
    ];
    const objectiveFields = [
      'dataset_key', 'dataset_version', 'framework', 'cmmc_level', 'domain', 'control_id',
      'source_requirement_id', 'objective_key', 'objective_id', 'source_objective_id_raw',
      'objective_text', 'examine_objects', 'interview_objects', 'test_objects',
      'source_document', 'source_version', 'source_url', 'source_sha256',
      'content_sha256', 'sort_order',
    ];
    for (const persisted of persistedControls) {
      const expected = expectedControls.get(persisted.control_id);
      if (!expected) {
        fail(persistedErrors, `Unexpected persisted control ${persisted.control_id}.`);
        continue;
      }
      for (const field of controlFields) {
        if (stableSerialize(persisted[field]) !== stableSerialize(expected[field])) {
          fail(persistedErrors, `Persisted control ${persisted.control_id} differs in ${field}.`);
        }
      }
    }
    for (const persisted of persistedObjectives) {
      const expected = expectedObjectives.get(persisted.objective_key);
      if (!expected) {
        fail(persistedErrors, `Unexpected persisted objective ${persisted.objective_key}.`);
        continue;
      }
      for (const field of objectiveFields) {
        if (stableSerialize(persisted[field]) !== stableSerialize(expected[field])) {
          fail(persistedErrors, `Persisted objective ${persisted.objective_key} differs in ${field}.`);
        }
      }
    }
    if (persistedErrors.length > 0) {
      return Response.json(
        {
          ok: false,
          error: 'Post-write validation failed. Nothing was activated; legacy data is untouched.',
          validation_errors: persistedErrors,
        },
        { status: 500 },
      );
    }

    // Activation last, idempotent. Each batch is bounded well below the SDK
    // limit; a failed batch can be safely resumed by rerunning this importer.
    const legacyDeactivations = legacyActive.map((rec: any) => ({
      id: rec.id,
      active: false,
      superseded_by_control_id: DATASET_KEY,
    }));
    const controlActivations = persistedControls
      .filter((rec: any) => rec.active !== true)
      .map((rec: any) => ({ id: rec.id, active: true }));
    const objectiveActivations = persistedObjectives
      .filter((row: any) => row.active !== true)
      .map((row: any) => ({ id: row.id, active: true }));
    const controlActivationUpdates = [...legacyDeactivations, ...controlActivations];
    if (controlActivationUpdates.length > 500 || objectiveActivations.length > 500) {
      throw new Error('Activation batch exceeded the Base44 SDK limit of 500 records.');
    }
    // Switch legacy and target ControlLibrary active states in one bounded SDK call.
    if (controlActivationUpdates.length > 0) {
      await base44.asServiceRole.entities.ControlLibrary.bulkUpdate(controlActivationUpdates);
    }
    if (objectiveActivations.length > 0) {
      await base44.asServiceRole.entities.AssessmentObjectiveLibrary.bulkUpdate(objectiveActivations);
    }

    const versions = await base44.asServiceRole.entities.ComplianceDatasetVersion
      .filter({ dataset_key: DATASET_KEY }, '-created_date', 10);
    const versionPayload = {
      dataset_key: DATASET_KEY,
      dataset_version: DATASET_VERSION,
      status: 'Active',
      level1_requirement_count: built.counts.level1_requirement_count,
      level2_requirement_count: built.counts.level2_requirement_count,
      level1_objective_count: built.counts.level1_objective_count,
      level2_objective_count: built.counts.level2_objective_count,
      source_manifest: built.manifest,
      content_sha256: built.contentHash,
      validation_notes: [
        `Validated ${EXPECT.totalRequirements} requirements and ${EXPECT.totalObjectives} objectives.`,
        ...built.corrections,
      ].join(' '),
      regulatory_status_note: REGULATORY_STATUS_NOTE,
      activated_at: new Date().toISOString(),
      imported_by: user.email,
    };
    if (versions.length > 0) {
      await base44.asServiceRole.entities.ComplianceDatasetVersion.update(versions[0].id, versionPayload);
    } else {
      await base44.asServiceRole.entities.ComplianceDatasetVersion.create(versionPayload);
    }

    return Response.json({
      ok: true,
      mode: 'apply',
      dataset_key: DATASET_KEY,
      created: created.length,
      updated: updated.length,
      legacy_deactivated: legacyActive.length,
      counts: built.counts,
      note: 'Legacy records were deactivated and marked superseded. No records were deleted.',
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});