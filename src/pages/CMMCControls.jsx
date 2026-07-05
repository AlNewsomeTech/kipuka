import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Search, LayoutGrid, Rows3, CheckCircle2, Image, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import { loadProgressMap, mergeControl } from '@/lib/controlProgress';
import { resolveProjectIdForClient, assessmentToConsultantStatus, consultantToAssessmentStatus } from '@/lib/clientProject';
import StatusBadge from '@/components/StatusBadge';
import ProgressBar from '@/components/ProgressBar';
import EmptyState from '@/components/EmptyState';
import MetaBadge, { CountBadge } from '@/components/ui/MetaBadge';
import ControlBulkBar from '@/components/controls/ControlBulkBar';

const VIEW_KEY = 'cmmc_controls_view';

export default function CMMCControls() {
  const { selectedClientId } = useClient();
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [view, setView] = useState(() => localStorage.getItem(VIEW_KEY) || 'comfortable');
  const [selected, setSelected] = useState([]);
  const [savingBulk, setSavingBulk] = useState(false);
  const [projectId, setProjectId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { localStorage.setItem(VIEW_KEY, view); }, [view]);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const pid = await resolveProjectIdForClient(selectedClientId);
        setProjectId(pid);
        const [defs, progress, assessments] = await Promise.all([
          base44.entities.CMMCControl.filter({ level: 'Level 1' }),
          loadProgressMap(selectedClientId),
          pid ? base44.entities.ControlAssessment.filter({ project_id: pid }).catch(() => []) : Promise.resolve([]),
        ]);
        // ControlAssessment is the PRIMARY source. Fall back to legacy
        // ControlProgress (read-only) only where no assessment exists.
        const asmtByControl = Object.fromEntries(assessments.map(a => [a.control_id, a]));
        setControls(defs.map((c) => {
          const merged = mergeControl(c, progress[c.control_id]);
          const asmt = asmtByControl[c.control_id];
          if (asmt) {
            merged.status = assessmentToConsultantStatus(asmt.status);
            merged._assessmentId = asmt.id;
            merged.ready_for_assessment = asmt.status === 'Ready for Assessment' || merged.ready_for_assessment;
          }
          return merged;
        }));
      } catch (e) {
        setControls([]);
        alert('Error loading Level 1 controls: ' + e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedClientId]);

  const families = [...new Set(controls.map(c => c.control_family))];
  const filtered = controls.filter(c => {
    const matchSearch = !search || c.control_id.toLowerCase().includes(search.toLowerCase()) || c.control_title.toLowerCase().includes(search.toLowerCase());
    const matchFamily = familyFilter === 'all' || c.control_family === familyFilter;
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchFamily && matchStatus;
  });

  const counts = {
    total: controls.length,
    complete: controls.filter(c => c.status === 'Complete').length,
    inProgress: controls.filter(c => ['In Progress', 'Evidence Needed', 'Ready for Review', 'Reviewed'].includes(c.status)).length,
    notStarted: controls.filter(c => c.status === 'Not Started').length,
    gaps: controls.filter(c => (c.evidence_count || 0) === 0 && (c.screenshot_count || 0) === 0).length,
    ready: controls.filter(c => c.ready_for_assessment).length,
  };
  const pct = counts.total ? (controls.filter(c => c.status === 'Complete' || c.ready_for_assessment).length / counts.total) * 100 : 0;

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const allVisibleSelected = filtered.length > 0 && filtered.every(c => selected.includes(c.id));
  const toggleSelectAll = () => setSelected(allVisibleSelected ? [] : filtered.map(c => c.id));

  // Writes go exclusively to ControlAssessment (the single source of truth),
  // upserting by project_id + control_id.
  const applyBulkStatus = async (status) => {
    if (!projectId) { alert('This client has no linked organization project yet. Create a project for the client’s organization before updating controls.'); return; }
    setSavingBulk(true);
    const targets = controls.filter(c => selected.includes(c.id));
    const asmtStatus = consultantToAssessmentStatus(status);
    try {
      await Promise.all(targets.map(async (c) => {
        if (c._assessmentId) {
          await base44.entities.ControlAssessment.update(c._assessmentId, { status: asmtStatus });
        } else {
          const created = await base44.entities.ControlAssessment.create({
            project_id: projectId,
            control_id: c.control_id,
            control_title: c.control_title,
            domain: c.control_family || '',
            cmmc_level: c.level || 'Level 1',
            status: asmtStatus,
          });
          c._assessmentId = created.id;
        }
      }));
      setControls(controls.map(c => selected.includes(c.id) ? { ...c, status } : c));
      setSelected([]);
    } catch (e) {
      alert('Error updating controls: ' + e.message);
    } finally {
      setSavingBulk(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-[#0F1E3C] rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">CMMC Level 1 Controls</h1>
        <p className="text-[15px] text-slate-600 mt-1.5">All 17 Level 1 controls — complete these first before Level 2.</p>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <CountTile label="Total" value={counts.total} tone="slate" />
        <CountTile label="Complete" value={counts.complete} tone="green" />
        <CountTile label="In Progress" value={counts.inProgress} tone="blue" />
        <CountTile label="Not Started" value={counts.notStarted} tone="slate" />
        <CountTile label="Evidence Gaps" value={counts.gaps} tone="amber" />
        <CountTile label="Ready" value={counts.ready} tone="green" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <ProgressBar value={pct} label="Level 1 Completion" color="green" />
      </div>

      {/* Filters + view toggle */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
          <input
            placeholder="Search by control ID or title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 text-[15px] text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>
        <select value={familyFilter} onChange={e => setFamilyFilter(e.target.value)} className="px-3.5 py-2.5 text-[15px] font-medium text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="all">All Families</option>
          {families.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3.5 py-2.5 text-[15px] font-medium text-slate-800 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="all">All Statuses</option>
          {['Not Started', 'In Progress', 'Evidence Needed', 'Ready for Review', 'Reviewed', 'Complete'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden bg-white">
          <button onClick={() => setView('comfortable')} className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[14px] font-medium transition-colors ${view === 'comfortable' ? 'bg-[#0F1E3C] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            <LayoutGrid className="w-4 h-4" /> Comfortable
          </button>
          <button onClick={() => setView('compact')} className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[14px] font-medium transition-colors ${view === 'compact' ? 'bg-[#0F1E3C] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Rows3 className="w-4 h-4" /> Compact
          </button>
        </div>
      </div>

      {selectedClientId && (
        <ControlBulkBar count={selected.length} saving={savingBulk} onApply={applyBulkStatus} onClear={() => setSelected([])} />
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState icon={ShieldCheck} title="No controls found" description="Try adjusting your search or filters." />
        </div>
      ) : view === 'comfortable' ? (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(c => <ControlCard key={c.id} control={c} onClick={() => navigate(`/controls/${c.id}`)} />)}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                {selectedClientId && (
                  <th className="px-4 py-3.5 w-10">
                    <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300 accent-[#0F1E3C] cursor-pointer" />
                  </th>
                )}
                <th className="text-left text-[13px] font-bold text-slate-700 px-4 py-3.5">Control ID</th>
                <th className="text-left text-[13px] font-bold text-slate-700 px-4 py-3.5 hidden md:table-cell">Title</th>
                <th className="text-left text-[13px] font-bold text-slate-700 px-4 py-3.5 hidden lg:table-cell">Family</th>
                <th className="text-center text-[13px] font-bold text-slate-700 px-4 py-3.5">Evidence</th>
                <th className="text-left text-[13px] font-bold text-slate-700 px-4 py-3.5">Status</th>
                <th className="text-center text-[13px] font-bold text-slate-700 px-4 py-3.5">Ready</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <tr key={c.id} className={`hover:bg-slate-50 cursor-pointer ${selected.includes(c.id) ? 'bg-blue-50/60' : ''}`} onClick={() => navigate(`/controls/${c.id}`)}>
                  {selectedClientId && (
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} className="w-4 h-4 rounded border-slate-300 accent-[#0F1E3C] cursor-pointer" />
                    </td>
                  )}
                  <td className="px-4 py-3.5"><Link to={`/controls/${c.id}`} className="text-[14px] font-mono font-bold text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>{c.control_id}</Link></td>
                  <td className="px-4 py-3.5 hidden md:table-cell text-[15px] text-slate-800">{c.control_title}</td>
                  <td className="px-4 py-3.5 hidden lg:table-cell text-[14px] text-slate-600">{c.control_family}</td>
                  <td className="px-4 py-3.5 text-center text-[15px] font-semibold text-slate-700">{c.evidence_count || 0}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3.5 text-center">{c.ready_for_assessment ? <CheckCircle2 className="w-5 h-5 text-green-600 inline" /> : <span className="text-slate-300">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CountTile({ label, value, tone }) {
  const tones = {
    slate: 'text-slate-900',
    green: 'text-green-700',
    blue: 'text-blue-700',
    amber: 'text-amber-700',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
      <div className={`text-2xl font-bold ${tones[tone] || tones.slate}`}>{value}</div>
      <div className="text-[13px] font-medium text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function ControlCard({ control: c, onClick }) {
  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all flex flex-col"
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="min-w-0">
          <span className="inline-block text-[14px] font-mono font-bold text-blue-700 bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-md mb-2">{c.control_id}</span>
          <h3 className="text-[17px] font-bold text-slate-900 leading-snug">{c.control_title}</h3>
        </div>
        <StatusBadge status={c.status} size="md" />
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <MetaBadge variant="family">{c.control_family}</MetaBadge>
        {c.ready_for_assessment && <MetaBadge variant="ready" icon={CheckCircle2}>Ready</MetaBadge>}
      </div>
      {c.explanation && (
        <p className="text-[15px] text-slate-600 leading-[1.55] line-clamp-2 mb-4">{c.explanation}</p>
      )}
      <div className="flex items-center gap-2 mt-auto pt-3 border-t border-slate-100">
        <CountBadge icon={FileText} label="evidence" value={c.evidence_count} />
        <CountBadge icon={Image} label="screenshots" value={c.screenshot_count} />
        <span className="ml-auto text-[14px] font-semibold text-blue-600 group-hover:underline">Open →</span>
      </div>
    </div>
  );
}