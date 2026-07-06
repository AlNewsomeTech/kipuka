// Central merge-variable resolution for policy templates and document generation.
// Resolves {{company_name}}, {{cage_code}}, {{it_environment}}, etc. from an
// organization's CompanyProfile (plus project/owner context). Any placeholder
// that cannot be resolved is left intact and counted so nothing ships blank.

// Build the merge map from available context.
export function buildMergeMap({ companyProfile, org, project, owner, extra } = {}) {
  const map = {
    company_name: companyProfile?.company_name || org?.organization_name || '',
    organization_name: companyProfile?.company_name || org?.organization_name || '',
    cage_code: companyProfile?.cage_code || org?.cage_codes?.[0] || project?.primary_cage_code || '',
    uei: companyProfile?.duns_uei || org?.uei || project?.uei || '',
    duns_uei: companyProfile?.duns_uei || org?.uei || '',
    it_environment: companyProfile?.it_environment || '',
    environment: companyProfile?.it_environment || project?.assessment_path || '',
    msp_name: companyProfile?.msp_name || '',
    employee_count: companyProfile?.employee_count != null ? String(companyProfile.employee_count) : '',
    project_name: project?.project_name || '',
    owner: owner || '',
    effective_date: new Date().toISOString().slice(0, 10),
    version: '1.0',
    ...(extra || {}),
  };
  // Drop empty-string keys so they count as unresolved rather than blanking out.
  Object.keys(map).forEach((k) => { if (map[k] === '' || map[k] == null) delete map[k]; });
  return map;
}

// Resolve every {{token}} in a body. Returns { body, unresolved: [tokens] }.
export function resolveMergeVariables(body, mergeMap = {}) {
  const unresolved = new Set();
  const resolved = (body || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (whole, key) => {
    if (mergeMap[key] != null && mergeMap[key] !== '') return mergeMap[key];
    unresolved.add(key);
    return whole; // leave placeholder intact
  });
  return { body: resolved, unresolved: [...unresolved] };
}

// Count unresolved {{tokens}} in a body without resolving.
export function countUnresolved(body) {
  const found = new Set();
  (body || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => { found.add(key); return _; });
  return [...found];
}