import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PROJECT_ID = '6a4875fc85842b32d494172c';
const TARGET_ID = '6a6d73e4a3f414fe55f92ca9';
const ARCHIVE_KEY = 'FULCRUM-ASSESSMENT-DRIFT-2026-08-01';
const EXPECTED_HASH = 'd84a5f9cc028bb0449db2f81e838aed1159356e7461a92ba194062b372074a02';
const CONFIRMATION = 'DELETE_EXACT_ARCHIVED_FULCRUM_STRAY';

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`;
  if (typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(object[key])}`).join(',')}}`;
  }
  const encoded = JSON.stringify(value);
  return encoded === undefined ? String(value) : encoded;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (caller.role !== 'admin') return Response.json({ error: 'Platform administrator required.' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const mode = body.mode === 'apply' ? 'apply' : 'dry_run';
    const service = base44.asServiceRole;

    const target = await service.entities.ControlAssessment.get(TARGET_ID).catch(() => null);
    const projectRows = await service.entities.ControlAssessment.filter({ project_id: PROJECT_ID }, null, 500);
    const level2 = projectRows.filter((row: any) => row.cmmc_level === 'Level 2');
    const level1 = projectRows.filter((row: any) => row.cmmc_level === 'Level 1');
    const archives = await service.entities.MigrationArchive.filter({
      migration_key: ARCHIVE_KEY, source_record_id: TARGET_ID,
    }).catch(() => []);

    const archive = archives[0] || null;
    const archivePayloadHash = archive ? await sha256Hex(stableSerialize(archive.payload)) : '';
    const targetIsExact = Boolean(
      target &&
      target.id === TARGET_ID &&
      target.project_id === PROJECT_ID &&
      target.control_id === 'IA.L1-3.5.2' &&
      target.cmmc_level === 'Level 1' &&
      target.organization_id == null &&
      target.created_by_id === '6a3a0bd467c38d3ef740090a'
    );
    const preflight = {
      total: projectRows.length, level2: level2.length, level1: level1.length,
      target_is_exact: targetIsExact, archive_count: archives.length,
      archive_declared_hash: archive?.content_sha256 || '', archive_payload_hash: archivePayloadHash,
    };
    const valid = targetIsExact && projectRows.length === 111 && level2.length === 110 && level1.length === 1 &&
      level1[0]?.id === TARGET_ID && archives.length === 1 &&
      archive?.content_sha256 === EXPECTED_HASH && archivePayloadHash === EXPECTED_HASH;
    if (!valid) return Response.json({ error: 'Fulcrum drift preflight did not match the exact verified boundary.', preflight }, { status: 409 });
    if (mode === 'dry_run') return Response.json({ mode, writes_performed: 0, preflight });

    if (body.confirmation !== CONFIRMATION) {
      return Response.json({ error: 'Exact cleanup confirmation is required.', preflight }, { status: 400 });
    }

    await service.entities.ControlAssessment.delete(TARGET_ID);
    const remaining = await service.entities.ControlAssessment.filter({ project_id: PROJECT_ID }, null, 500);
    const remainingLevel2 = remaining.filter((row: any) => row.cmmc_level === 'Level 2');
    const remainingLevel1 = remaining.filter((row: any) => row.cmmc_level === 'Level 1');
    if (remaining.length !== 110 || remainingLevel2.length !== 110 || remainingLevel1.length !== 0) {
      return Response.json({ error: 'Post-delete reconciliation failed; restore from the verified archive.', remaining: remaining.length, level2: remainingLevel2.length, level1: remainingLevel1.length }, { status: 500 });
    }
    return Response.json({
      mode, deleted_record_id: TARGET_ID, archive_id: archive.id, archive_sha256: EXPECTED_HASH,
      remaining: remaining.length, level2: remainingLevel2.length, level1: remainingLevel1.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
