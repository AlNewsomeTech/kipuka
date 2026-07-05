import { useState, useEffect, useCallback, useMemo } from 'react';
import { ClipboardCheck, Loader2, RefreshCw, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ControlAssessmentRow from './ControlAssessmentRow';

const STATUSES = ['Not Started', 'Implementation Planned', 'Implementation In Progress', 'Implemented Pending Evidence', 'Gap Identified', 'POA&M Linked', 'Ready for Documentation', 'Implemented', 'Partially Implemented', 'Not Implemented', 'Not Applicable', 'Needs Review', 'Ready for Assessment'];
const EVIDENCE_STATUSES = ['No Evidence', 'Evidence Uploaded', 'Needs Better Evidence', 'Accepted', 'Expired'];
const RISKS = ['Low', 'Moderate', 'High', 'Critical'];

export default function AssessmentModule({ project, readOnly, currentUser }) {
  const [library, setLibrary] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [poams, setPoams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filters, setFilters] = useState({ status: '', evidence_status: '', owner: '', risk: '', level: '' });
  const [openDomains, setOpenDomains] = useState({});

  const targetLevels = useMemo(() => {
    if (project.target_cmmc_level === 'Level 2') return ['Level 1', 'Level 2'];
    if (project.target_cmmc_level === 'Level 3') return ['Level 1', 'Level 2', 'Level 3'];
    return ['Level 1'];
  }, [project.target_cmmc_level]);

  const load = useCallback(async () => {
    setLoading(true);
    const [lib, asmt, ev, pm] = await Promise.all([
      base44.entities.ControlLibrary.filter({ active: true }).catch(() => []),
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

  // Generate assessment rows from the library for any control not yet tracked.
  const seedAssessments = async () => {
    setSeeding(true);
    const existing = new Set(assessments.map((a) => a.control_id));
    const toCreate = library
      .filter((c) => !existing.has(c.control_id))
      .map((c) => ({
        organization_id: project.organization_id,
        project_id: project.id,
        control_id: c.control_id,
        control_title: c.control_title,
        domain: c.domain,
        cmmc_level: c.cmmc_level,
        status: 'Not Started',
        evidence_status: 'No Evidence',
        risk_rating: 'Moderate',
        ssp_statement: c.ssp_statement_starter || '',
        evidence_required: c.example_evidence || '',
      }));
    if (toCreate.length > 0) await base44.entities.ControlAssessment.bulkCreate(toCreate);
    await load();
    setSeeding(false);
  };

  const updateAssessment = async (id, patch) => {
    await base44.entities.ControlAssessment.update(id, {
      ...patch,
      last_reviewed_by: currentUser?.full_name || currentUser?.email || '',
      last_reviewed_date: new Date().toISOString().slice(0, 10),
    });
    setAssessments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const owners = useMemo(() => [...new Set(assessments.map((a) => a.responsible_owner).filter(Boolean))], [assessments]);

  const filtered = useMemo(() => assessments.filter((a) => {
    if (filters.status && a.status !== filters.status) return false;
    if (filters.evidence_status && a.evidence_status !== filters.evidence_status) return false;
    if (filters.owner && a.responsible_owner !== filters.owner) return false;
    if (filters.risk && a.risk_rating !== filters.risk) return false;
    if (filters.level && a.cmmc_level !== filters.level) return false;
    return true;
  }), [assessments, filters]);

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

  const untracked = library.filter((c) => !assessments.some((a) => a.control_id === c.control_id)).length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <ClipboardCheck className="w-5 h-5 text-[#0F1E3C]" />
            <h1 className="text-lg font-bold text-slate-900">Control Assessment</h1>
          </div>
          {!readOnly && untracked > 0 && (
            <button onClick={seedAssessments} disabled={seeding}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-60">
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Generate {untracked} control{untracked !== 1 ? 's' : ''}
            </button>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-1">
          {assessments.length} of {library.length} controls tracked for {project.target_cmmc_level}.
        </p>

        {/* Filters */}
        <div className="grid sm:grid-cols-5 gap-2 mt-4">
          <FilterSelect label="Status" value={filters.status} options={STATUSES} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} />
          <FilterSelect label="Evidence" value={filters.evidence_status} options={EVIDENCE_STATUSES} onChange={(v) => setFilters((f) => ({ ...f, evidence_status: v }))} />
          <FilterSelect label="Owner" value={filters.owner} options={owners} onChange={(v) => setFilters((f) => ({ ...f, owner: v }))} />
          <FilterSelect label="Risk" value={filters.risk} options={RISKS} onChange={(v) => setFilters((f) => ({ ...f, risk: v }))} />
          <FilterSelect label="Level" value={filters.level} options={targetLevels} onChange={(v) => setFilters((f) => ({ ...f, level: v }))} />
        </div>
      </div>

      {assessments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          No controls tracked yet. {!readOnly && 'Use "Generate controls" above to build the assessment from the control library.'}
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