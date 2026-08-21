// Canonical evidence integrity primitives shared by every function that
// creates or verifies ProjectEvidence records. The metadata payload shape is
// LOAD-BEARING: manageProjectEvidence's accept flow recomputes the metadata
// hash from this exact shape, so any producer of ProjectEvidence records must
// hash through these functions and never a private copy.

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256HexOfText(text: string): Promise<string> {
  return await sha256Hex(new TextEncoder().encode(text));
}

export function stableStringify(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function sortedUnique(value: any): string[] {
  return [...new Set((Array.isArray(value) ? value : []).map((v) => String(v || '').trim().slice(0, 160)).filter(Boolean))].sort();
}

export function metadataPayload(record: any) {
  return {
    organization_id: record.organization_id || '', project_id: record.project_id || '',
    evidence_title: record.evidence_title || '', evidence_type: record.evidence_type || '',
    control_ids: sortedUnique(record.control_ids), objective_ids: sortedUnique(record.objective_ids),
    file_uri: record.file_uri || '', file_name: record.file_name || '', original_file_name: record.original_file_name || '',
    mime_type: record.mime_type || '', file_size_bytes: Number(record.file_size_bytes || 0),
    hash_algorithm: record.hash_algorithm || 'SHA-256', hash_value: record.hash_value || '',
    description: record.description || '', evidence_date: record.evidence_date || '',
    expiration_date: record.expiration_date || '', retention_until: record.retention_until || '',
    owner: record.owner || '', source_system: record.source_system || '', source_tool: record.source_tool || '',
    provenance_type: record.provenance_type || '', provenance_details: record.provenance_details || '',
    version: Number(record.version || 1), supersedes_evidence_id: record.supersedes_evidence_id || '',
  };
}

export async function metadataSha(record: any): Promise<string> {
  return await sha256HexOfText(stableStringify(metadataPayload(record)));
}