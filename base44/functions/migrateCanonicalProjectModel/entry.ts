import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ============================================================================
// PHASE 3A — CANONICAL PROJECT DATA MIGRATION (admin only)
//
// Rebuilds every valid project onto the 110 active authoritative Level 2
// controls of the imported CMMC dataset, and remaps every project-scoped
// control reference onto the same authoritative identifiers.
//
// Modes:
//   dry_run — validates live preconditions, builds the complete plan in memory
//             and returns exact counts. PERFORMS ZERO WRITES.
//   apply   — archives every touched row first, verifies each snapshot hash,
//             and only then mutates. Resumable and idempotent.
//
// Nothing is ever deleted without a hash-verified MigrationArchive snapshot.
// MigrationArchive records are never deleted. ControlLibrary,
// AssessmentObjectiveLibrary and ComplianceDatasetVersion are never written.
// ============================================================================

const MIGRATION_KEY = 'CANONICAL-PROJECT-MODEL-V1-2026-07-30';
const DATASET_KEY = 'CMMC-2.13-SP800-171R2-2024-09';

const PAGE_SIZE = 500;
const BULK_BATCH = 500;

// Expected live preconditions. Re-checked against the database on every run;
// this list is a guard, never a substitute for the live query.
const EXPECTED_PROJECT_IDS = [
  '6a505da6e1c8ff007cb7893e', // Pac-Sec Readiness
  '6a4fec777e48d8608af9d0cc', // Meridian CMMC Level 2 Readiness
  '6a4ab2a10db4259fef487a91', // Spider Readiness
  '6a4875fc85842b32d494172c', // Fulcrum Readiness
];
const EXPECTED_PROJECT_COUNT = 4;
const EXPECTED_CONTROL_ASSESSMENT_TOTAL = 466;
const CANONICAL_CONTROL_ASSESSMENT_TOTAL = 440;
const CANONICAL_PER_PROJECT = 110;

const EXPECTED_ACTIVE_LIBRARY_TOTAL = 125;
const EXPECTED_ACTIVE_L1 = 15;
const EXPECTED_ACTIVE_L2 = 110;
const EXPECTED_LIBRARY_TOTAL = 235;
const EXPECTED_LEGACY_INACTIVE = 110;
const EXPECTED_OBJECTIVE_LIBRARY_TOTAL = 379;
const EXPECTED_DATASET_VERSION_TOTAL = 1;

const ALL_CONTROL_ID = 'All';

// Entities this migration may write. Anything else is forbidden in Phase 3A.
const TOUCHED_ENTITIES = [
  'ControlAssessment',
  'GuidedProgress',
  'MockAssessmentObjective',
  'ProjectEvidence',
  'ProjectPOAM',
  'SSPControlStatement',
  'ToolControlMapping',
  'PolicyTemplate',
];

// Never written by this migration, under any mode.
const FORBIDDEN_ENTITIES = [
  'ControlLibrary',
  'AssessmentObjectiveLibrary',
  'ComplianceDatasetVersion',
  'Project',
  'Organization',
  'ControlProgress',
  'Client',
  'Screenshot',
  'POAMItem',
  'DeploymentTask',
  'GeneratedDocument',
];

// System fields never copied from a source row into a rebuilt record.
const SYSTEM_FIELDS = new Set([
  'id', 'created_date', 'updated_date', 'created_by_id', 'is_sample',
]);

// Fields the authoritative library / project owns on a rebuilt ControlAssessment.
const LIBRARY_OWNED_FIELDS = new Set([
  'organization_id', 'project_id', 'control_id', 'control_title', 'domain', 'cmmc_level',
]);

// Readiness ordering — lower index is LESS ready. Conservative merges and
// conflicting claims always resolve to the less-ready value.
const STATUS_READINESS = [
  'Not Started', 'Not Implemented', 'Gap Identified', 'Needs Review',
  'Implementation Planned', 'Implementation In Progress', 'Partially Implemented',
  'POA&M Linked', 'Implemented Pending Evidence', 'Evidence Needs Review',
  'Evidence Uploaded', 'Ready for Documentation', 'Implemented',
  'Ready for Assessment', 'Evidence Accepted', 'Not Applicable',
];
const EVIDENCE_READINESS = [
  'No Evidence', 'Expired', 'Needs Better Evidence', 'Evidence Uploaded', 'Accepted',
];

// --------------------------------------------------------------- helpers ----
const clean = (v: unknown) => String(v ?? '').trim();
const isBlank = (v: unknown) =>
  v === undefined || v === null || (typeof v === 'string' && v.trim() === '') ||
  (Array.isArray(v) && v.length === 0);

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${stableSerialize(obj[k])}`).join(',')}}`;
  }
  const encoded = JSON.stringify(value);
  return encoded === undefined ? String(value) : encoded;
}

async function sha256Hex(input: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

const archiveKeyOf = (entityName: string, sourceRecordId: string) =>
  `${MIGRATION_KEY}|${entityName}|${sourceRecordId}`;

// Critical read. A failure THROWS — it is never swallowed as an empty list.
async function readAll(svc: any, entityName: string, query: Record<string, unknown> = {}) {
  const out: any[] = [];
  let skip = 0;
  for (let guard = 0; guard < 200; guard++) {
    let page: any[];
    try {
      page = await svc.filter(query, 'created_date', PAGE_SIZE, skip);
    } catch (err) {
      throw new Error(`Critical read failure on ${entityName}: ${(err as Error).message}`);
    }
    if (!Array.isArray(page)) throw new Error(`Critical read failure on ${entityName}: non-array response.`);
    out.push(...page);
    if (page.length < PAGE_SIZE) return out;
    skip += PAGE_SIZE;
  }
  throw new Error(`Critical read failure on ${entityName}: pagination guard exceeded.`);
}

async function bulkCreate(svc: any, entityName: string, rows: any[]) {
  for (let i = 0; i < rows.length; i += BULK_BATCH) {
    const batch = rows.slice(i, i + BULK_BATCH);
    if (batch.length > BULK_BATCH) throw new Error('Batch limit exceeded.');
    try {
      await svc.bulkCreate(batch);
    } catch (err) {
      throw new Error(`Critical write failure creating ${entityName}: ${(err as Error).message}`);
    }
  }
}

async function bulkUpdate(svc: any, entityName: string, rows: any[]) {
  for (let i = 0; i < rows.length; i += BULK_BATCH) {
    const batch = rows.slice(i, i + BULK_BATCH);
    if (batch.length > BULK_BATCH) throw new Error('Batch limit exceeded.');
    try {
      await svc.bulkUpdate(batch);
    } catch (err) {
      throw new Error(`Critical write failure updating ${entityName}: ${(err as Error).message}`);
    }
  }
}

function fail(errors: string[], msg: string) {
  errors.push(msg);
}

// Numeric NIST requirement embedded in a control identifier, e.g.
// AC.L2-3.1.1 -> 3.1.1. Level 1 style IDs (AC.L1-b.1.i) carry none.
function numericFromControlId(controlId: string): string | null {
  const m = String(controlId || '').match(/(3\.\d{1,2}\.\d{1,2})/);
  return m ? m[1] : null;
}

// ------------------------------------------------------ mapping resolver ----
// Resolves ANY legacy or current control identifier to the authoritative
// active Level 2 control_id(s), through the numeric NIST requirement number.
function buildResolver(libraryAll: any[], activeL2: any[], activeL1: any[]) {
  const l2ByNumeric = new Map<string, any>();
  for (const row of activeL2) {
    const nums = Array.isArray(row.crosswalk_requirement_ids) && row.crosswalk_requirement_ids.length > 0
      ? row.crosswalk_requirement_ids
      : [row.source_requirement_id];
    for (const n of nums) if (clean(n)) l2ByNumeric.set(clean(n), row);
  }

  // Legacy identifier -> numeric requirement list, learned from the library
  // itself (legacy inactive rows included) so old Level 1 IDs resolve too.
  const numericsByLegacyId = new Map<string, string[]>();
  for (const row of libraryAll) {
    const id = clean(row.control_id);
    if (!id) continue;
    const nums: string[] = [];
    for (const n of (row.crosswalk_requirement_ids || [])) if (clean(n)) nums.push(clean(n));
    if (clean(row.source_requirement_id)) nums.push(clean(row.source_requirement_id));
    const embedded = numericFromControlId(id);
    if (embedded) nums.push(embedded);
    const unique = [...new Set(nums)];
    const prior = numericsByLegacyId.get(id) || [];
    numericsByLegacyId.set(id, [...new Set([...prior, ...unique])]);
  }

  // numeric -> every active authoritative control (L1 and L2) crosswalking it.
  const activeByNumeric = new Map<string, any[]>();
  for (const row of [...activeL1, ...activeL2]) {
    const nums = new Set<string>();
    for (const n of (row.crosswalk_requirement_ids || [])) if (clean(n)) nums.add(clean(n));
    if (clean(row.source_requirement_id)) nums.add(clean(row.source_requirement_id));
    for (const n of nums) {
      const list = activeByNumeric.get(n) || [];
      list.push(row);
      activeByNumeric.set(n, list);
    }
  }

  const numericsFor = (rawId: string): string[] => {
    const id = clean(rawId);
    if (!id || id === ALL_CONTROL_ID) return [];
    const known = numericsByLegacyId.get(id);
    if (known && known.length > 0) return known;
    const embedded = numericFromControlId(id);
    if (embedded) return [embedded];
    if (/^3\.\d{1,2}\.\d{1,2}$/.test(id)) return [id];
    return [];
  };

  return {
    // Every authoritative Level 2 control an old identifier maps onto.
    toL2: (rawId: string): any[] => {
      const targets: any[] = [];
      for (const n of numericsFor(rawId)) {
        const hit = l2ByNumeric.get(n);
        if (hit && !targets.includes(hit)) targets.push(hit);
      }
      return targets;
    },
    // Active authoritative Level 1 AND Level 2 controls for a numeric ref.
    toActiveAny: (rawId: string): any[] => {
      const targets: any[] = [];
      for (const n of numericsFor(rawId)) {
        for (const hit of (activeByNumeric.get(n) || [])) if (!targets.includes(hit)) targets.push(hit);
      }
      return targets;
    },
    numericsFor,
    l2ByNumeric,
  };
}

// ------------------------------------------------- conservative combining ----
function lessReadyStatus(a: string, b: string) {
  const ia = STATUS_READINESS.indexOf(a);
  const ib = STATUS_READINESS.indexOf(b);
  if (ia === -1) return b;
  if (ib === -1) return a;
  return ia <= ib ? a : b;
}

function lessReadyEvidence(a: string, b: string) {
  const ia = EVIDENCE_READINESS.indexOf(a);
  const ib = EVIDENCE_READINESS.indexOf(b);
  if (ia === -1) return b;
  if (ib === -1) return a;
  return ia <= ib ? a : b;
}

// Conservative field merge — never discards nonblank narrative, owner, notes,
// N/A support, evidence links or dates.
function mergeField(key: string, a: any, b: any) {
  if (isBlank(a)) return b;
  if (isBlank(b)) return a;
  if (key === 'status') return lessReadyStatus(String(a), String(b));
  if (key === 'evidence_status') return lessReadyEvidence(String(a), String(b));
  if (Array.isArray(a) || Array.isArray(b)) {
    const list = [...(Array.isArray(a) ? a : [a]), ...(Array.isArray(b) ? b : [b])];
    return [...new Set(list.map((v) => stableSerialize(v)))].map((s) => JSON.parse(s));
  }
  if (typeof a === 'string' && typeof b === 'string') {
    if (a === b || a.includes(b)) return a;
    if (b.includes(a)) return b;
    return `${a}\n\n${b}`;
  }
  return a;
}

function mergeRecords(a: Record<string, any>, b: Record<string, any>) {
  const out: Record<string, any> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = mergeField(k, out[k], v);
  return out;
}

// ------------------------------------------------------------ plan build ----
async function buildPlan(base44: any, resumeSources: Map<string, any[]> | null) {
  const errors: string[] = [];
  const svc = base44.asServiceRole.entities;

  // --- authoritative library.
  const libraryAll = await readAll(svc.ControlLibrary, 'ControlLibrary');
  const activeAuthoritative = libraryAll.filter(
    (r: any) => r.active === true && r.dataset_key === DATASET_KEY,
  );
  const activeL1 = activeAuthoritative.filter((r: any) => r.cmmc_level === 'Level 1');
  const activeL2 = activeAuthoritative.filter((r: any) => r.cmmc_level === 'Level 2');
  const legacyInactive = libraryAll.filter((r: any) => r.active !== true);

  if (activeAuthoritative.length !== EXPECTED_ACTIVE_LIBRARY_TOTAL) {
    fail(errors, `Expected ${EXPECTED_ACTIVE_LIBRARY_TOTAL} active authoritative ControlLibrary rows, found ${activeAuthoritative.length}.`);
  }
  if (activeL1.length !== EXPECTED_ACTIVE_L1) {
    fail(errors, `Expected ${EXPECTED_ACTIVE_L1} active Level 1 rows, found ${activeL1.length}.`);
  }
  if (activeL2.length !== EXPECTED_ACTIVE_L2) {
    fail(errors, `Expected ${EXPECTED_ACTIVE_L2} active Level 2 rows, found ${activeL2.length}.`);
  }
  if (new Set(activeAuthoritative.map((r: any) => r.control_id)).size !== activeAuthoritative.length) {
    fail(errors, 'Active authoritative control_id values are not unique.');
  }
  const l2Numerics = new Set(activeL2.map((r: any) => clean(r.source_requirement_id)).filter(Boolean));
  if (l2Numerics.size !== EXPECTED_ACTIVE_L2) {
    fail(errors, `Expected ${EXPECTED_ACTIVE_L2} unique Level 2 source_requirement_id mappings, found ${l2Numerics.size}.`);
  }
  if (libraryAll.length !== EXPECTED_LIBRARY_TOTAL) {
    fail(errors, `Expected ${EXPECTED_LIBRARY_TOTAL} total ControlLibrary rows, found ${libraryAll.length}.`);
  }
  if (legacyInactive.length !== EXPECTED_LEGACY_INACTIVE) {
    fail(errors, `Expected ${EXPECTED_LEGACY_INACTIVE} inactive legacy ControlLibrary rows, found ${legacyInactive.length}.`);
  }

  const resolver = buildResolver(libraryAll, activeL2, activeL1);
  const activeL2ById = new Map<string, any>(activeL2.map((r: any) => [r.control_id, r]));
  const activeAnyIds = new Set<string>(activeAuthoritative.map((r: any) => r.control_id));

  // --- projects (read-only; never written by this migration).
  const projects = await readAll(svc.Project, 'Project');
  if (projects.length !== EXPECTED_PROJECT_COUNT) {
    fail(errors, `Expected exactly ${EXPECTED_PROJECT_COUNT} Project rows, found ${projects.length}.`);
  }
  const validProjectIds = new Set<string>(projects.map((p: any) => p.id));
  for (const id of EXPECTED_PROJECT_IDS) {
    if (!validProjectIds.has(id)) fail(errors, `Expected valid project ${id} is missing.`);
  }
  for (const p of projects) {
    if (p.target_cmmc_level !== 'Level 2') {
      fail(errors, `Project ${p.id} (${p.project_name}) is not target_cmmc_level Level 2.`);
    }
  }
  const projectById = new Map<string, any>(projects.map((p: any) => [p.id, p]));

  // --- other read-only invariants.
  const objectiveLibrary = await readAll(svc.AssessmentObjectiveLibrary, 'AssessmentObjectiveLibrary');
  if (objectiveLibrary.length !== EXPECTED_OBJECTIVE_LIBRARY_TOTAL) {
    fail(errors, `Expected ${EXPECTED_OBJECTIVE_LIBRARY_TOTAL} AssessmentObjectiveLibrary rows, found ${objectiveLibrary.length}.`);
  }
  const datasetVersions = await readAll(svc.ComplianceDatasetVersion, 'ComplianceDatasetVersion');
  if (datasetVersions.length !== EXPECTED_DATASET_VERSION_TOTAL) {
    fail(errors, `Expected ${EXPECTED_DATASET_VERSION_TOTAL} ComplianceDatasetVersion row, found ${datasetVersions.length}.`);
  }

  // --- ControlAssessment source rows. On resume, the archived ORIGINAL
  // payloads are the source of truth, never partially changed live rows.
  const liveAssessments = await readAll(svc.ControlAssessment, 'ControlAssessment');
  const resumedAssessments = resumeSources?.get('ControlAssessment') || null;
  const sourceAssessments = resumedAssessments && resumedAssessments.length > 0
    ? resumedAssessments
    : liveAssessments;

  const canonicalAlready =
    liveAssessments.length === CANONICAL_CONTROL_ASSESSMENT_TOTAL &&
    !liveAssessments.some((r: any) => r.control_id === ALL_CONTROL_ID) &&
    liveAssessments.every((r: any) => validProjectIds.has(r.project_id) && r.cmmc_level === 'Level 2');

  if (!canonicalAlready && sourceAssessments.length !== EXPECTED_CONTROL_ASSESSMENT_TOTAL) {
    fail(errors, `Expected ${EXPECTED_CONTROL_ASSESSMENT_TOTAL} pre-migration ControlAssessment rows (or an already-applied canonical state of ${CANONICAL_CONTROL_ASSESSMENT_TOTAL}), found ${sourceAssessments.length}.`);
  }

  // --- group source rows by project and identify orphans.
  const byProject = new Map<string, any[]>();
  const orphanGroups = new Map<string, string[]>();
  for (const row of sourceAssessments) {
    const pid = clean(row.project_id);
    if (validProjectIds.has(pid)) {
      const list = byProject.get(pid) || [];
      list.push(row);
      byProject.set(pid, list);
    } else {
      const list = orphanGroups.get(pid || '(blank)') || [];
      list.push(row.id);
      orphanGroups.set(pid || '(blank)', list);
    }
  }

  // --- build the canonical 110 rows per valid project.
  const plannedByProject: Record<string, any[]> = {};
  const unmappable: string[] = [];
  const duplicateTargets: string[] = [];
  const allRowIds: string[] = [];
  let downgradedFromL1 = 0;
  let mergedRows = 0;
  let createdMissing = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (const projectId of [...validProjectIds]) {
    const project = projectById.get(projectId);
    const rows = byProject.get(projectId) || [];
    const buckets = new Map<string, Record<string, any>>();

    for (const row of rows) {
      const oldId = clean(row.control_id);
      if (oldId === ALL_CONTROL_ID) {
        allRowIds.push(row.id);
        continue; // planned for deletion, never mapped
      }
      const targets = resolver.toL2(oldId);
      if (targets.length === 0) {
        unmappable.push(`ControlAssessment ${row.id} control_id "${oldId}" on project ${projectId}`);
        continue;
      }
      const wasLevel1 = row.cmmc_level === 'Level 1' || !numericFromControlId(oldId);

      for (const target of targets) {
        const carried: Record<string, any> = {};
        for (const [k, v] of Object.entries(row)) {
          if (SYSTEM_FIELDS.has(k) || LIBRARY_OWNED_FIELDS.has(k)) continue;
          if (!isBlank(v)) carried[k] = v;
        }
        if (wasLevel1) {
          // A Level 1 claim never becomes a Level 2 readiness claim.
          const priorStatus = clean(row.status) || 'Not Started';
          const priorEvidence = clean(row.evidence_status) || 'No Evidence';
          carried.status = priorStatus === 'Not Started' ? 'Not Started' : 'Needs Review';
          carried.evidence_status = priorEvidence === 'No Evidence' ? 'No Evidence' : 'Needs Better Evidence';
          const note = `[${today}] Migrated by ${MIGRATION_KEY} from ${oldId} (prior status: ${priorStatus}; prior evidence_status: ${priorEvidence}). Level 1 readiness claims are not carried into Level 2 requirements.`;
          carried.pacsec_internal_notes = isBlank(row.pacsec_internal_notes)
            ? note
            : `${row.pacsec_internal_notes}\n\n${note}`;
          downgradedFromL1++;
        }
        const candidate = {
          ...carried,
          organization_id: project.organization_id,
          project_id: projectId,
          control_id: target.control_id,
          control_title: target.control_title,
          domain: target.domain,
          cmmc_level: 'Level 2',
        };
        const existing = buckets.get(target.control_id);
        if (existing) {
          mergedRows++;
          duplicateTargets.push(`${projectId}|${target.control_id}`);
          buckets.set(target.control_id, {
            ...mergeRecords(existing, candidate),
            organization_id: project.organization_id,
            project_id: projectId,
            control_id: target.control_id,
            control_title: target.control_title,
            domain: target.domain,
            cmmc_level: 'Level 2',
          });
        } else {
          buckets.set(target.control_id, candidate);
        }
      }
    }

    // Missing authoritative requirements are created fresh.
    for (const target of activeL2) {
      if (buckets.has(target.control_id)) continue;
      createdMissing++;
      buckets.set(target.control_id, {
        organization_id: project.organization_id,
        project_id: projectId,
        control_id: target.control_id,
        control_title: target.control_title,
        domain: target.domain,
        cmmc_level: 'Level 2',
        status: 'Not Started',
        evidence_status: 'No Evidence',
        risk_rating: 'Moderate',
      });
    }

    const planned = [...buckets.values()];
    if (planned.length !== CANONICAL_PER_PROJECT) {
      fail(errors, `Project ${projectId} plans ${planned.length} ControlAssessment rows, expected ${CANONICAL_PER_PROJECT}.`);
    }
    if (new Set(planned.map((r) => r.control_id)).size !== planned.length) {
      fail(errors, `Project ${projectId} plan contains duplicate control_id values.`);
    }
    for (const r of planned) {
      if (!activeL2ById.has(r.control_id)) {
        fail(errors, `Project ${projectId} plan contains non-authoritative control_id ${r.control_id}.`);
      }
    }
    plannedByProject[projectId] = planned;
  }

  const plannedAssessmentTotal = Object.values(plannedByProject).reduce((n, r) => n + r.length, 0);
  if (plannedAssessmentTotal !== CANONICAL_CONTROL_ASSESSMENT_TOTAL) {
    fail(errors, `Planned ControlAssessment total is ${plannedAssessmentTotal}, expected ${CANONICAL_CONTROL_ASSESSMENT_TOTAL}.`);
  }

  // ------------------------------------------------ reference entity plans ---
  const referencePlans: Record<string, { updates: any[]; deletes: any[]; rows: any[] }> = {};
  const noteFor = (oldId: string) =>
    `[${today}] Migrated by ${MIGRATION_KEY} from ${oldId}.`;

  const mapSingle = (entityName: string, row: any, unmappableSink: string[]) => {
    const oldId = clean(row.control_id);
    if (!oldId || oldId === ALL_CONTROL_ID) return null;
    const targets = resolver.toL2(oldId);
    if (targets.length === 0) {
      unmappableSink.push(`${entityName} ${row.id} control_id "${oldId}"`);
      return null;
    }
    return targets[0];
  };

  // GuidedProgress — map valid projects; delete deleted-project rows.
  const guided = resumeSources?.get('GuidedProgress') || await readAll(svc.GuidedProgress, 'GuidedProgress');
  const guidedUpdates: any[] = [];
  const guidedDeletes: any[] = [];
  for (const row of guided) {
    if (!validProjectIds.has(clean(row.project_id))) { guidedDeletes.push(row); continue; }
    const target = mapSingle('GuidedProgress', row, unmappable);
    if (!target) continue;
    if (target.control_id !== row.control_id) guidedUpdates.push({ id: row.id, control_id: target.control_id });
  }
  referencePlans.GuidedProgress = { updates: guidedUpdates, deletes: guidedDeletes, rows: guided };

  // MockAssessmentObjective — map, and reset verdicts migrated off Level 1.
  const mock = resumeSources?.get('MockAssessmentObjective') || await readAll(svc.MockAssessmentObjective, 'MockAssessmentObjective');
  const mockUpdates: any[] = [];
  for (const row of mock) {
    if (!validProjectIds.has(clean(row.project_id))) continue;
    const oldId = clean(row.control_id);
    const target = mapSingle('MockAssessmentObjective', row, unmappable);
    if (!target) continue;
    const wasLevel1 = !numericFromControlId(oldId);
    const patch: any = { id: row.id, control_id: target.control_id, control_title: target.control_title };
    if (target.domain) patch.domain = target.domain;
    if (wasLevel1) {
      patch.verdict = 'Not Assessed';
      patch.assessor_notes = isBlank(row.assessor_notes) ? noteFor(oldId) : `${row.assessor_notes}\n\n${noteFor(oldId)}`;
    }
    if (patch.control_id !== row.control_id || wasLevel1) mockUpdates.push(patch);
  }
  referencePlans.MockAssessmentObjective = { updates: mockUpdates, deletes: [], rows: mock };

  // ProjectEvidence — map/dedupe control_ids, drop All, delete orphan rows.
  const evidence = resumeSources?.get('ProjectEvidence') || await readAll(svc.ProjectEvidence, 'ProjectEvidence');
  const evidenceUpdates: any[] = [];
  const evidenceDeletes: any[] = [];
  for (const row of evidence) {
    if (!validProjectIds.has(clean(row.project_id))) { evidenceDeletes.push(row); continue; }
    const source = Array.isArray(row.control_ids) ? row.control_ids : [];
    const mapped: string[] = [];
    for (const raw of source) {
      const id = clean(raw);
      if (!id || id === ALL_CONTROL_ID) continue;
      const targets = resolver.toL2(id);
      if (targets.length === 0) { unmappable.push(`ProjectEvidence ${row.id} control_ids "${id}"`); continue; }
      for (const t of targets) if (!mapped.includes(t.control_id)) mapped.push(t.control_id);
    }
    if (stableSerialize(mapped) !== stableSerialize(source)) {
      // file_url, file_name and every unmapped field are untouched.
      evidenceUpdates.push({ id: row.id, control_ids: mapped });
    }
  }
  referencePlans.ProjectEvidence = { updates: evidenceUpdates, deletes: evidenceDeletes, rows: evidence };

  // ProjectPOAM — map control_id.
  const poams = resumeSources?.get('ProjectPOAM') || await readAll(svc.ProjectPOAM, 'ProjectPOAM');
  const poamUpdates: any[] = [];
  for (const row of poams) {
    if (!validProjectIds.has(clean(row.project_id))) continue;
    if (isBlank(row.control_id)) continue;
    const target = mapSingle('ProjectPOAM', row, unmappable);
    if (!target) continue;
    if (target.control_id !== row.control_id) poamUpdates.push({ id: row.id, control_id: target.control_id });
  }
  referencePlans.ProjectPOAM = { updates: poamUpdates, deletes: [], rows: poams };

  // SSPControlStatement — remove All, map, conservatively merge duplicates.
  const ssp = resumeSources?.get('SSPControlStatement') || await readAll(svc.SSPControlStatement, 'SSPControlStatement');
  const sspBuckets = new Map<string, { keep: any; merged: any[]; payload: Record<string, any> }>();
  const sspDeletes: any[] = [];
  for (const row of ssp) {
    if (!validProjectIds.has(clean(row.project_id))) { sspDeletes.push(row); continue; }
    const oldId = clean(row.control_id);
    if (oldId === ALL_CONTROL_ID) { sspDeletes.push(row); continue; }
    const targets = resolver.toL2(oldId);
    if (targets.length === 0) { unmappable.push(`SSPControlStatement ${row.id} control_id "${oldId}"`); continue; }
    const target = targets[0];
    const key = `${row.project_id}|${target.control_id}`;
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      if (SYSTEM_FIELDS.has(k) || k === 'control_id' || k === 'control_title') continue;
      if (!isBlank(v)) fields[k] = v;
    }
    const existing = sspBuckets.get(key);
    if (existing) {
      // Conservative merge — implementation text, responsibility, status,
      // evidence links, reviewer notes and dates are all preserved.
      existing.payload = mergeRecords(existing.payload, fields);
      existing.merged.push(row);
      sspDeletes.push(row);
    } else {
      sspBuckets.set(key, { keep: row, merged: [], payload: fields });
    }
  }
  const sspUpdates: any[] = [];
  for (const [key, bucket] of sspBuckets) {
    const targetId = key.split('|')[1];
    const target = activeL2ById.get(targetId);
    sspUpdates.push({
      id: bucket.keep.id,
      ...bucket.payload,
      control_id: targetId,
      control_title: target?.control_title,
    });
  }
  referencePlans.SSPControlStatement = { updates: sspUpdates, deletes: sspDeletes, rows: ssp };

  // ToolControlMapping — map control_id / control_title.
  const tools = resumeSources?.get('ToolControlMapping') || await readAll(svc.ToolControlMapping, 'ToolControlMapping');
  const toolUpdates: any[] = [];
  for (const row of tools) {
    if (!validProjectIds.has(clean(row.project_id))) continue;
    const target = mapSingle('ToolControlMapping', row, unmappable);
    if (!target) continue;
    if (target.control_id !== row.control_id) {
      toolUpdates.push({ id: row.id, control_id: target.control_id, control_title: target.control_title });
    }
  }
  referencePlans.ToolControlMapping = { updates: toolUpdates, deletes: [], rows: tools };

  // PolicyTemplate — project-specific maps to L2; global templates expand to
  // every active authoritative Level 1 and Level 2 control for the reference.
  const policies = resumeSources?.get('PolicyTemplate') || await readAll(svc.PolicyTemplate, 'PolicyTemplate');
  const policyUpdates: any[] = [];
  for (const row of policies) {
    const source = Array.isArray(row.mapped_control_ids) ? row.mapped_control_ids : [];
    if (source.length === 0) continue; // blank arrays preserved as-is
    const projectScoped = !isBlank(row.project_id) && validProjectIds.has(clean(row.project_id));
    const mapped: string[] = [];
    for (const raw of source) {
      const id = clean(raw);
      if (!id || id === ALL_CONTROL_ID) continue;
      const targets = projectScoped ? resolver.toL2(id) : resolver.toActiveAny(id);
      if (targets.length === 0) { unmappable.push(`PolicyTemplate ${row.id} mapped_control_ids "${id}"`); continue; }
      for (const t of targets) if (!mapped.includes(t.control_id)) mapped.push(t.control_id);
    }
    if (stableSerialize(mapped) !== stableSerialize(source)) {
      policyUpdates.push({ id: row.id, mapped_control_ids: mapped });
    }
  }
  referencePlans.PolicyTemplate = { updates: policyUpdates, deletes: [], rows: policies };

  if (unmappable.length > 0) {
    fail(errors, `${unmappable.length} unmappable non-All control reference(s) block apply.`);
  }

  const beforeCounts = {
    ControlAssessment: liveAssessments.length,
    GuidedProgress: guided.length,
    MockAssessmentObjective: mock.length,
    ProjectEvidence: evidence.length,
    ProjectPOAM: poams.length,
    SSPControlStatement: ssp.length,
    ToolControlMapping: tools.length,
    PolicyTemplate: policies.length,
    Project: projects.length,
    ControlLibrary: libraryAll.length,
    AssessmentObjectiveLibrary: objectiveLibrary.length,
    ComplianceDatasetVersion: datasetVersions.length,
  };

  const plannedCounts = {
    ControlAssessment: {
      archived: sourceAssessments.length,
      deleted: liveAssessments.length,
      created: plannedAssessmentTotal,
      all_rows_removed: allRowIds.length,
      orphan_rows_removed: [...orphanGroups.values()].reduce((n, l) => n + l.length, 0),
      level1_downgraded: downgradedFromL1,
      merged_duplicates: mergedRows,
      created_missing: createdMissing,
    },
    GuidedProgress: { updated: guidedUpdates.length, deleted: guidedDeletes.length },
    MockAssessmentObjective: { updated: mockUpdates.length, deleted: 0 },
    ProjectEvidence: { updated: evidenceUpdates.length, deleted: evidenceDeletes.length },
    ProjectPOAM: { updated: poamUpdates.length, deleted: 0 },
    SSPControlStatement: { updated: sspUpdates.length, deleted: sspDeletes.length },
    ToolControlMapping: { updated: toolUpdates.length, deleted: 0 },
    PolicyTemplate: { updated: policyUpdates.length, deleted: 0 },
  };

  const afterCounts = {
    ControlAssessment: CANONICAL_CONTROL_ASSESSMENT_TOTAL,
    GuidedProgress: guided.length - guidedDeletes.length,
    MockAssessmentObjective: mock.length,
    ProjectEvidence: evidence.length - evidenceDeletes.length,
    ProjectPOAM: poams.length,
    SSPControlStatement: ssp.length - sspDeletes.length,
    ToolControlMapping: tools.length,
    PolicyTemplate: policies.length,
    Project: projects.length,
    ControlLibrary: libraryAll.length,
    AssessmentObjectiveLibrary: objectiveLibrary.length,
    ComplianceDatasetVersion: datasetVersions.length,
  };

  const snapshotHash = await sha256Hex(stableSerialize(
    sourceAssessments.map((r: any) => ({ id: r.id, project_id: r.project_id, control_id: r.control_id })),
  ));

  return {
    errors,
    canonicalAlready,
    resolver,
    activeL2,
    activeL2ById,
    activeAnyIds,
    projects,
    projectById,
    validProjectIds,
    liveAssessments,
    sourceAssessments,
    plannedByProject,
    referencePlans,
    orphanGroups,
    unmappable,
    duplicateTargets: [...new Set(duplicateTargets)],
    allRowIds,
    beforeCounts,
    plannedCounts,
    afterCounts,
    snapshotHash,
    touched_entities: TOUCHED_ENTITIES,
    forbidden_entities: FORBIDDEN_ENTITIES,
  };
}

// ------------------------------------------------------- post-validation ----
async function postValidate(base44: any, plan: any) {
  const svc = base44.asServiceRole.entities;
  const problems: string[] = [];

  // 1. ControlAssessment invariants.
  const assessments = await readAll(svc.ControlAssessment, 'ControlAssessment');
  if (assessments.length !== CANONICAL_CONTROL_ASSESSMENT_TOTAL) {
    problems.push(`ControlAssessment total is ${assessments.length}, expected ${CANONICAL_CONTROL_ASSESSMENT_TOTAL}.`);
  }
  const seen = new Set<string>();
  const perProject = new Map<string, number>();
  for (const row of assessments) {
    if (row.control_id === ALL_CONTROL_ID) problems.push(`ControlAssessment ${row.id} still uses control_id All.`);
    if (!plan.validProjectIds.has(clean(row.project_id))) problems.push(`ControlAssessment ${row.id} has invalid project_id.`);
    if (row.cmmc_level !== 'Level 2') problems.push(`ControlAssessment ${row.id} is not Level 2.`);
    const key = `${row.project_id}|${row.control_id}`;
    if (seen.has(key)) problems.push(`Duplicate ControlAssessment for ${key}.`);
    seen.add(key);
    perProject.set(row.project_id, (perProject.get(row.project_id) || 0) + 1);
    const lib = plan.activeL2ById.get(row.control_id);
    if (!lib) {
      problems.push(`ControlAssessment ${row.id} control_id ${row.control_id} is not an active authoritative Level 2 control.`);
    } else if (row.control_title !== lib.control_title || row.domain !== lib.domain) {
      problems.push(`ControlAssessment ${row.id} title/domain does not match the authoritative library.`);
    }
  }
  for (const pid of plan.validProjectIds) {
    if ((perProject.get(pid) || 0) !== CANONICAL_PER_PROJECT) {
      problems.push(`Project ${pid} has ${perProject.get(pid) || 0} ControlAssessment rows, expected ${CANONICAL_PER_PROJECT}.`);
    }
  }

  // 2. Reference entity invariants — every touched project-scoped reference
  // must hold only authoritative active IDs and valid project IDs.
  const l2Ids: Set<string> = new Set([...plan.activeL2ById.keys()] as string[]);
  const checkRef = (entityName: string, rows: any[], ids: (r: any) => string[], requireValidProject: boolean) => {
    for (const row of rows) {
      if (requireValidProject && !plan.validProjectIds.has(clean(row.project_id))) {
        problems.push(`${entityName} ${row.id} references an invalid project_id.`);
      }
      for (const id of ids(row)) {
        if (!id) continue;
        if (id === ALL_CONTROL_ID) problems.push(`${entityName} ${row.id} still references control_id All.`);
        else if (!l2Ids.has(id)) problems.push(`${entityName} ${row.id} references non-authoritative control ${id}.`);
      }
    }
  };

  const guided = await readAll(svc.GuidedProgress, 'GuidedProgress');
  checkRef('GuidedProgress', guided, (r) => [clean(r.control_id)], true);
  const mock = await readAll(svc.MockAssessmentObjective, 'MockAssessmentObjective');
  checkRef('MockAssessmentObjective', mock, (r) => [clean(r.control_id)], true);
  const evidence = await readAll(svc.ProjectEvidence, 'ProjectEvidence');
  checkRef('ProjectEvidence', evidence, (r) => (r.control_ids || []).map(clean), true);
  const poams = await readAll(svc.ProjectPOAM, 'ProjectPOAM');
  checkRef('ProjectPOAM', poams, (r) => [clean(r.control_id)].filter(Boolean), true);
  const tools = await readAll(svc.ToolControlMapping, 'ToolControlMapping');
  checkRef('ToolControlMapping', tools, (r) => [clean(r.control_id)], true);

  // 3. SSPControlStatement — exactly 110 unique statements per owning project.
  const ssp = await readAll(svc.SSPControlStatement, 'SSPControlStatement');
  checkRef('SSPControlStatement', ssp, (r) => [clean(r.control_id)], true);
  const sspByProject = new Map<string, Set<string>>();
  for (const row of ssp) {
    const set = sspByProject.get(row.project_id) || new Set<string>();
    if (set.has(row.control_id)) problems.push(`Duplicate SSPControlStatement for ${row.project_id}|${row.control_id}.`);
    set.add(row.control_id);
    sspByProject.set(row.project_id, set);
  }
  for (const [pid, set] of sspByProject) {
    if (set.size !== CANONICAL_PER_PROJECT || ssp.filter((r: any) => r.project_id === pid).length !== CANONICAL_PER_PROJECT) {
      problems.push(`SSPControlStatement for project ${pid} is ${set.size} unique rows, expected ${CANONICAL_PER_PROJECT}.`);
    }
  }

  // 4. PolicyTemplate — projectless templates may hold active L1 or L2 IDs.
  const policies = await readAll(svc.PolicyTemplate, 'PolicyTemplate');
  for (const row of policies) {
    for (const raw of (row.mapped_control_ids || [])) {
      const id = clean(raw);
      if (!id) continue;
      if (!plan.activeAnyIds.has(id)) {
        problems.push(`PolicyTemplate ${row.id} references non-authoritative control ${id}.`);
      }
    }
  }

  // 5. Untouched reference data must be intact.
  const projects = await readAll(svc.Project, 'Project');
  if (projects.length !== EXPECTED_PROJECT_COUNT) problems.push(`Project count changed to ${projects.length}.`);
  const library = await readAll(svc.ControlLibrary, 'ControlLibrary');
  const activeAuth = library.filter((r: any) => r.active === true && r.dataset_key === DATASET_KEY);
  const inactive = library.filter((r: any) => r.active !== true);
  if (library.length !== EXPECTED_LIBRARY_TOTAL) problems.push(`ControlLibrary total changed to ${library.length}.`);
  if (activeAuth.length !== EXPECTED_ACTIVE_LIBRARY_TOTAL) problems.push(`Active authoritative ControlLibrary changed to ${activeAuth.length}.`);
  if (inactive.length !== EXPECTED_LEGACY_INACTIVE) problems.push(`Inactive legacy ControlLibrary changed to ${inactive.length}.`);
  const objectives = await readAll(svc.AssessmentObjectiveLibrary, 'AssessmentObjectiveLibrary');
  if (objectives.length !== EXPECTED_OBJECTIVE_LIBRARY_TOTAL) problems.push(`AssessmentObjectiveLibrary changed to ${objectives.length}.`);
  const versions = await readAll(svc.ComplianceDatasetVersion, 'ComplianceDatasetVersion');
  if (versions.length !== EXPECTED_DATASET_VERSION_TOTAL) problems.push(`ComplianceDatasetVersion changed to ${versions.length}.`);

  // 6. ProjectEvidence payload fields not explicitly mapped are preserved.
  const archives = await readAll(base44.asServiceRole.entities.MigrationArchive, 'MigrationArchive', {
    migration_key: MIGRATION_KEY, entity_name: 'ProjectEvidence',
  });
  const archiveById = new Map<string, any>(archives.map((a: any) => [a.source_record_id, a]));
  for (const row of evidence) {
    const snapshot = archiveById.get(row.id)?.payload;
    if (!snapshot) continue;
    for (const [k, v] of Object.entries(snapshot)) {
      if (k === 'control_ids' || SYSTEM_FIELDS.has(k)) continue;
      if (stableSerialize(row[k]) !== stableSerialize(v)) {
        problems.push(`ProjectEvidence ${row.id} field ${k} was not preserved.`);
      }
    }
  }

  return {
    problems,
    after_counts: {
      ControlAssessment: assessments.length,
      GuidedProgress: guided.length,
      MockAssessmentObjective: mock.length,
      ProjectEvidence: evidence.length,
      ProjectPOAM: poams.length,
      SSPControlStatement: ssp.length,
      ToolControlMapping: tools.length,
      PolicyTemplate: policies.length,
      Project: projects.length,
      ControlLibrary: library.length,
      AssessmentObjectiveLibrary: objectives.length,
      ComplianceDatasetVersion: versions.length,
    },
  };
}

// ---------------------------------------------------------------- entry -----
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 1. Authentication first.
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // 2. Authorization: exactly admin, before ANY fetch or service-role access.
    if (user.role !== 'admin') {
      return Response.json(
        { error: 'Only platform administrators may run data migrations.' },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode;
    const datasetKey = body?.dataset_key;

    if (mode !== 'dry_run' && mode !== 'apply') {
      return Response.json({ error: "mode must be exactly 'dry_run' or 'apply'." }, { status: 400 });
    }
    if (datasetKey !== DATASET_KEY) {
      return Response.json(
        { error: `Unsupported dataset_key. This migration only handles ${DATASET_KEY}.` },
        { status: 400 },
      );
    }

    const svc = base44.asServiceRole.entities;

    // Prior run state — drives idempotence and safe resume.
    const runs = await readAll(svc.DataMigrationRun, 'DataMigrationRun', { migration_key: MIGRATION_KEY });
    const priorRun = runs.sort((a: any, b: any) =>
      String(b.created_date || '').localeCompare(String(a.created_date || '')))[0] || null;

    // If snapshots already exist, the ORIGINAL archived payloads are the source
    // of truth for the plan, never partially changed live rows.
    const existingArchives = await readAll(svc.MigrationArchive, 'MigrationArchive', { migration_key: MIGRATION_KEY });
    let resumeSources: Map<string, any[]> | null = null;
    if (existingArchives.length > 0) {
      resumeSources = new Map<string, any[]>();
      for (const a of existingArchives) {
        const list = resumeSources.get(a.entity_name) || [];
        list.push(a.payload);
        resumeSources.set(a.entity_name, list);
      }
    }

    const plan = await buildPlan(base44, resumeSources);

    // --------------------------------------------------------- DRY RUN ------
    if (mode === 'dry_run') {
      const status = plan.errors.length > 0 ? 422 : 200;
      return Response.json({
        ok: plan.errors.length === 0,
        mode: 'dry_run',
        writes_performed: 0,
        migration_key: MIGRATION_KEY,
        dataset_key: DATASET_KEY,
        already_applied: priorRun?.status === 'Applied' && plan.canonicalAlready,
        prior_run_status: priorRun?.status || null,
        existing_archive_count: existingArchives.length,
        before_counts: plan.beforeCounts,
        planned_counts: plan.plannedCounts,
        after_counts: plan.afterCounts,
        orphan_groups: Object.fromEntries(
          [...plan.orphanGroups.entries()].map(([k, v]) => [k, { count: v.length, ids: v }]),
        ),
        all_control_rows: plan.allRowIds,
        duplicate_targets: plan.duplicateTargets,
        unmappable_references: plan.unmappable,
        source_snapshot_sha256: plan.snapshotHash,
        touched_entities: plan.touched_entities,
        forbidden_entities: plan.forbidden_entities,
        validation_errors: plan.errors,
        note: 'Dry run only. No entity records were created, updated, archived, or deleted.',
      }, { status });
    }

    // ----------------------------------------------------------- APPLY ------
    if (plan.errors.length > 0) {
      return Response.json({
        ok: false,
        mode: 'apply',
        error: 'Preconditions failed. Nothing was written.',
        validation_errors: plan.errors,
      }, { status: 422 });
    }

    // Idempotent no-op when the migration is already Applied and the live
    // state still proves the canonical invariants.
    if (priorRun?.status === 'Applied') {
      const verify = await postValidate(base44, plan);
      if (verify.problems.length === 0) {
        return Response.json({
          ok: true, mode: 'apply', idempotent_no_op: true, writes_performed: 0,
          migration_key: MIGRATION_KEY, after_counts: verify.after_counts,
          note: 'Migration was already applied and the canonical post-state verified.',
        });
      }
      return Response.json({
        ok: false, mode: 'apply', error: 'A prior Applied run no longer matches the canonical post-state.',
        validation_errors: verify.problems,
      }, { status: 409 });
    }

    const nowIso = new Date().toISOString();
    let run = priorRun;
    const runPayload: any = {
      migration_key: MIGRATION_KEY,
      dataset_key: DATASET_KEY,
      status: 'Draft',
      before_counts: plan.beforeCounts,
      planned_counts: plan.plannedCounts,
      source_snapshot_sha256: plan.snapshotHash,
    };
    run = run
      ? await svc.DataMigrationRun.update(run.id, runPayload)
      : await svc.DataMigrationRun.create(runPayload);

    // --- 1. ARCHIVE EVERYTHING BEFORE ANY MUTATION.
    const archivedKeys = new Set<string>(existingArchives.map((a: any) => archiveKeyOf(a.entity_name, a.source_record_id)));
    const toArchive: any[] = [];
    const enqueue = async (entityName: string, rows: any[], reason: string) => {
      for (const row of rows) {
        const key = archiveKeyOf(entityName, row.id);
        if (archivedKeys.has(key)) continue;
        archivedKeys.add(key);
        const payload = { ...row };
        toArchive.push({
          migration_key: MIGRATION_KEY,
          entity_name: entityName,
          source_record_id: row.id,
          organization_id: row.organization_id,
          project_id: row.project_id,
          reason,
          payload,
          content_sha256: await sha256Hex(stableSerialize(payload)),
          archived_at: nowIso,
          archived_by: user.email,
        });
      }
    };

    await enqueue('ControlAssessment', plan.liveAssessments, 'Snapshot');
    for (const entityName of Object.keys(plan.referencePlans)) {
      await enqueue(entityName, plan.referencePlans[entityName].rows, 'Snapshot');
    }
    if (toArchive.length > 0) {
      await bulkCreate(svc.MigrationArchive, 'MigrationArchive', toArchive);
    }

    // --- 2. VERIFY ARCHIVES: count, unique keys, hashes, byte-equivalence.
    const verifiedArchives = await readAll(svc.MigrationArchive, 'MigrationArchive', { migration_key: MIGRATION_KEY });
    const archiveByKey = new Map<string, any>();
    for (const a of verifiedArchives) {
      const key = archiveKeyOf(a.entity_name, a.source_record_id);
      if (archiveByKey.has(key)) {
        return Response.json({ ok: false, error: `Duplicate archive key ${key}. Nothing was mutated.` }, { status: 500 });
      }
      archiveByKey.set(key, a);
    }
    const expectArchived: [string, any[]][] = [
      ['ControlAssessment', plan.liveAssessments],
      ...Object.keys(plan.referencePlans).map((e) => [e, plan.referencePlans[e].rows] as [string, any[]]),
    ];
    for (const [entityName, rows] of expectArchived) {
      for (const row of rows) {
        const a = archiveByKey.get(archiveKeyOf(entityName, row.id));
        if (!a) {
          return Response.json({ ok: false, error: `Missing archive snapshot for ${entityName} ${row.id}. Nothing was mutated.` }, { status: 500 });
        }
        const expectedHash = await sha256Hex(stableSerialize(a.payload));
        if (a.content_sha256 !== expectedHash) {
          return Response.json({ ok: false, error: `Archive hash mismatch for ${entityName} ${row.id}. Nothing was mutated.` }, { status: 500 });
        }
      }
    }
    await svc.DataMigrationRun.update(run.id, {
      status: 'Validated',
      validation_notes: `Archived and hash-verified ${verifiedArchives.length} pre-migration snapshots.`,
    });

    // --- 3. MUTATE. No deletion happens without a verified snapshot above.
    await svc.DataMigrationRun.update(run.id, { status: 'Applying' });

    const deleteVerified = async (entityName: string, rows: any[]) => {
      for (const row of rows) {
        const a = archiveByKey.get(archiveKeyOf(entityName, row.id));
        if (!a || a.content_sha256 !== await sha256Hex(stableSerialize(a.payload))) {
          throw new Error(`Refusing to delete ${entityName} ${row.id} without a hash-verified archive snapshot.`);
        }
        await svc[entityName].delete(row.id);
      }
    };

    // ControlAssessment: delete every original row (all archived), then create
    // the canonical 440 rows for the four valid projects.
    await deleteVerified('ControlAssessment', plan.liveAssessments);
    const canonicalRows = Object.values(plan.plannedByProject).flat();
    await bulkCreate(svc.ControlAssessment, 'ControlAssessment', canonicalRows);

    for (const entityName of Object.keys(plan.referencePlans)) {
      const p = plan.referencePlans[entityName];
      if (p.updates.length > 0) await bulkUpdate(svc[entityName], entityName, p.updates);
      if (p.deletes.length > 0) await deleteVerified(entityName, p.deletes);
    }

    // --- 4. POST-VALIDATE, then mark Applied.
    const result = await postValidate(base44, plan);
    if (result.problems.length > 0) {
      await svc.DataMigrationRun.update(run.id, {
        status: 'Failed',
        after_counts: result.after_counts,
        error_details: result.problems.slice(0, 50).join(' | '),
      });
      return Response.json({
        ok: false, mode: 'apply', error: 'Post-validation failed. The run is marked Failed and every original record remains recoverable from MigrationArchive.',
        validation_errors: result.problems, after_counts: result.after_counts,
      }, { status: 500 });
    }

    await svc.DataMigrationRun.update(run.id, {
      status: 'Applied',
      after_counts: result.after_counts,
      applied_at: new Date().toISOString(),
      applied_by: user.email,
      validation_notes: `Canonical model applied. ${CANONICAL_CONTROL_ASSESSMENT_TOTAL} ControlAssessment rows across ${EXPECTED_PROJECT_COUNT} projects.`,
    });

    return Response.json({
      ok: true,
      mode: 'apply',
      migration_key: MIGRATION_KEY,
      dataset_key: DATASET_KEY,
      archived: verifiedArchives.length,
      before_counts: plan.beforeCounts,
      planned_counts: plan.plannedCounts,
      after_counts: result.after_counts,
      note: 'Every original record was archived and hash-verified before mutation. MigrationArchive records are never deleted.',
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});