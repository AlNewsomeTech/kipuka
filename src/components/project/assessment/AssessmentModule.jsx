import { useState, useEffect, useCallback, useMemo } from 'react';
import { ClipboardCheck, Loader2, AlertTriangle, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toSimpleStatus, SIMPLE_STATUS } from '@/lib/simpleStatus';
import { CANONICAL_DATASET_KEY, targetLevelsFor } from '@/lib/doNextEngine';
import ControlAssessmentRow from './ControlAssessmentRow';

const STATUSES = ['Not Started', 'Implementation Planned', 'Implementation In Progress', 'Implemented Pending Evidence', 'Gap Identified', 'POA&M Linked', 'Ready for Documentation', 'Implemented', 'Partially Implemented', 'Not Implemented', 'Needs Review', 'Ready for Assessment'];
const SIMPLE_STATUSES = [SIMPLE_STATUS.NOT_STARTED, SIMPLE_STATUS.IN_PROGRESS, SIMPLE_STATUS.DONE, SIMPLE_STATUS.STUCK];
const EVIDENCE_STATUSES = ['No Evidence', 'Evidence Uploaded', 'Needs Better Evidence', 'Accepted', 'Expired'];
const RISKS = ['Low', 'Moderate', 'High', 'Critical'];

export default function AssessmentModule({ project, readOnly, currentUser, isClient = false }) {
  const [library, setLibrary] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [poams, setPoams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', evidence_status: '', owner: '', risk: '', level: '' });
  const [openDomains, setOpenDomains] = useState({});

  const targetLevels = useMemo(
    () => targetLevelsFor(project),
    [project.target_cmmc_level],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const [lib, asmt, ev, pm] = await Promise.all([
      base44.entities.ControlLibrary.filter({
        active: true,
        authoritative: true,
        dataset_key: CANONICAL_DATASET_KEY,
      }).catch(() => []),
      base44.entities.ControlAssessment.filter({ project_id: project.id }).catch(() => []),
      base44.entities.ProjectEvidence.filter({ project_id: project.id }).catch(() => []),
      base44.entities.ProjectPOAM.filter({ project_id: project.id }).catch(() => []),
    ]);
    setLibrary(lib.filter((c) => targetLevels.includes(c.cmmc_level)));
    setAssessments(asmt);
    setEvidence(ev);
    setPoams(pm);
    setLoading(false);
  }, [project.id, targetLevels]);

  useEffect(() => { load(); }, [load]);

  const updateAssessment = async (id, patch) => {
    await base44.entities.ControlAssessment.update(id, {
      ...patch,
      last_reviewed_by: currentUser?.full_name || currentUser?.email || '',
      last_reviewed_date: new Date().toISOString().slice(0, 10),
    });
    setAssessments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const expectedCount = targetLevels[0] === 'Level 1' ? 15 : targetLevels[0] === 'Level 2' ? 110 : 0;
  const integrity = useMemo(() => {
    const libraryIds = new Set(library.map((c) => c.control_id));
    const assessmentCounts = new Map();
    assessments.forEach((a) => assessmentCounts.set(a.control_id, (assessmentCounts.get(a.control_id) || 0) + 1));
    const inScope = assessments.filter((a) => libraryIds.has(a.control_id));
    const missing = [...libraryIds].filter((id) => !assessmentCounts.has(id)).length;
    const duplicates = [...assessmentCounts.entries()]
      .filter(([id, count]) => libraryIds.has(id) && count > 1)
      .reduce((sum, [, count]) => sum + count - 1, 0);
    const outOfScope = assessments.filter((a) => !libraryIds.has(a.control_id)).length;
    const libraryValid = expectedCount > 0 && library.length === expectedCount && libraryIds.size === expectedCount;
    return {
      valid: libraryValid && missing === 0 && duplicates === 0 && outOfScope === 0 && inScope.length === expectedCount,
      inScope,
      expected: expectedCount,
      tracked: inScope.length,
      missing,
      duplicates,
      outOfScope,
      libraryCount: library.length,
    };
  }, [assessments, expectedCount, library]);

  const owners = useMemo(() => [...new Set(integrity.inScope.map((a) => a.responsible_owner).filter(Boolean))], [integrity.inScope]);

  const filtered = useMemo(() => integrity.inScope.filter((a) => {
    if (filters.status) {
      // In client view the status filter holds a simple bucket; map before comparing.
      if (isClient) { if (toSimpleStatus(a) !== filters.status) return false; }
      else if (a.status !== filters.status) return false;
    }
    if (filters.evidence_status && a.evidence_status !== filters.evidence_status) return false;
    if (filters.owner && a.responsible_owner !== filters.owner) return false;
    if (filters.risk && a.risk_rating !== filters.risk) return false;
    if (filters.level && a.cmmc_level !== filters.level) return false;
    return true;
  }), [integrity.inScope, filters, isClient]);

  const byDomain = useMemo(() => {
    const map = {};
    filtered.forEach((a) => {
      (map[a.domain || 'Other'] ||= []).push(a);
    });
    return map;
  }, [filtered]);

  const libByControl = useMemo(() => Object.fromEntries(library.map((c) => [c.control_id, c])), [library]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  if (!integrity.valid) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-6">
          <div className="flex items-center gap-2.5 text-amber-900">
            <AlertTriangle className="h-5 w-5" />
            <h1 className="text-lg font-bold">Project initialization incomplete</h1>
          </div>
          <p className="mt-2 text-sm text-amber-800">
            Canonical assessment integrity failed. No requirements are editable until an administrator repairs the project initialization.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-amber-900 sm:grid-cols-5">
            <span>Expected: {integrity.expected}</span>
            <span>Tracked: {integrity.tracked}</span>
            <span>Missing: {integrity.missing}</span>
            <span>Duplicates: {integrity.duplicates}</span>
            <span>Out of scope: {integrity.outOfScope}</span>
          </div>
          <p className="mt-2 text-xs text-amber-700">Authoritative library rows: {integrity.libraryCount}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <ClipboardCheck className="w-5 h-5 text-[#0F1E3C]" />
            <h1 className="text-lg font-bold text-slate-900">Control Assessment</h1>
          </div>

        </div>
        <p className="text-sm text-slate-500 mt-1">
          {integrity.tracked} of {integrity.expected} requirements tracked for {project.target_cmmc_level}.
        </p>

        {/* Filters — client view shows a simplified Status + Level only */}
        {isClient ? (
          <div className="grid sm:grid-cols-2 gap-2 mt-4">
            <FilterSelect label="Status" value={filters.status} options={SIMPLE_STATUSES} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} />
            <FilterSelect label="Level" value={filters.level} options={targetLevels} onChange={(v) => setFilters((f) => ({ ...f, level: v }))} />
          </div>
        ) : (
          <div className="grid sm:grid-cols-5 gap-2 mt-4">
            <FilterSelect label="Status" value={filters.status} options={STATUSES} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} />
            <FilterSelect label="Evidence" value={filters.evidence_status} options={EVIDENCE_STATUSES} onChange={(v) => setFilters((f) => ({ ...f, evidence_status: v }))} />
            <FilterSelect label="Owner" value={filters.owner} options={owners} onChange={(v) => setFilters((f) => ({ ...f, owner: v }))} />
            <FilterSelect label="Risk" value={filters.risk} options={RISKS} onChange={(v) => setFilters((f) => ({ ...f, risk: v }))} />
            <FilterSelect label="Level" value={filters.level} options={targetLevels} onChange={(v) => setFilters((f) => ({ ...f, level: v }))} />
          </div>
        )}
      </div>

      {integrity.inScope.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          No canonical requirements are tracked for this project.
        </div>
      ) : (
        Object.keys(byDomain).sort().map((domain) => {
          const rows = byDomain[domain];
          const open = openDomains[domain] !== false;
          return (
            <div key={domain} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button onClick={() => setOpenDomains((o) => ({ ...o, [domain]: !open }))}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                <span className="text-sm font-bold text-slate-800">{domain} <span className="text-slate-400 font-normal">({rows.length})</span></span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? '' : '-rotate-90'}`} />
              </button>
              {open && (
                <div className="divide-y divide-slate-100 border-t border-slate-100">
                  {rows.sort((a, b) => (libByControl[a.control_id]?.sort_order || 0) - (libByControl[b.control_id]?.sort_order || 0)).map((a) => (
                    <ControlAssessmentRow
                      key={a.id}
                      assessment={a}
                      libEntry={libByControl[a.control_id]}
                      evidence={evidence.filter((e) => (e.control_ids || []).includes(a.control_id))}
                      poams={poams.filter((p) => p.control_id === a.control_id)}
                      readOnly={readOnly}
                      project={project}
                      onUpdate={updateAssessment}
                      onRefresh={load}
                      currentUser={currentUser}
                      isClient={isClient}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <select className="form-input text-xs" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">All {label}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}