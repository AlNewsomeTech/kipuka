import { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertTriangle, Plus, Loader2, Download, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { generatePoamCsv, generatePoamPdf } from '@/lib/reportGenerators';
import { BRAND } from '@/lib/reportBranding';
import PoamRow from './PoamRow';
import PoamFormModal from './PoamFormModal';

const VIEWS = [
  { key: 'all', label: 'All Items' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'high_risk', label: 'High-Risk Open' },
  { key: 'closed', label: 'Closed' },
];

function isOverdue(p) {
  if (!p.target_completion_date || ['Closed', 'Accepted Risk'].includes(p.status)) return false;
  return new Date(p.target_completion_date) < new Date(new Date().toDateString());
}

export default function PoamModule({ project, org, readOnly, currentUser }) {
  const [poams, setPoams] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('all');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [pm, ev] = await Promise.all([
      base44.entities.ProjectPOAM.filter({ project_id: project.id }).catch(() => []),
      base44.entities.ProjectEvidence.filter({ project_id: project.id }).catch(() => []),
    ]);
    setPoams(pm);
    setEvidence(ev);
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const overdue = useMemo(() => poams.filter(isOverdue), [poams]);
  const highRisk = useMemo(() => poams.filter((p) => ['High', 'Critical'].includes(p.risk_rating) && !['Closed', 'Accepted Risk'].includes(p.status)), [poams]);

  const rows = useMemo(() => {
    if (view === 'overdue') return overdue;
    if (view === 'high_risk') return highRisk;
    if (view === 'closed') return poams.filter((p) => ['Closed', 'Accepted Risk'].includes(p.status));
    return poams;
  }, [view, poams, overdue, highRisk]);

  const remove = async (id) => { await base44.entities.ProjectPOAM.delete(id); load(); };
  const genBy = currentUser?.full_name || currentUser?.email;

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-[#0F1E3C]" />
            <h1 className="text-lg font-bold text-slate-900">POA&M Tracker</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => generatePoamCsv({ project, poams, generatedBy: genBy })}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200">
              <Download className="w-4 h-4" /> CSV
            </button>
            <button onClick={() => generatePoamPdf({ project, org, poams, generatedBy: genBy })}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200">
              <FileText className="w-4 h-4" /> PDF
            </button>
            {!readOnly && (
              <button onClick={() => { setEditing(null); setModal(true); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
                <Plus className="w-4 h-4" /> New POA&M
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {VIEWS.map((v) => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${view === v.key ? 'bg-[#0F1E3C] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {v.label}
              {v.key === 'overdue' && overdue.length > 0 && <span className="ml-1.5 text-red-300">({overdue.length})</span>}
              {v.key === 'high_risk' && highRisk.length > 0 && <span className="ml-1.5 text-amber-300">({highRisk.length})</span>}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{BRAND.poamDisclaimer}</span>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">No POA&M items in this view.</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {rows.map((p) => (
            <PoamRow key={p.id} poam={p} readOnly={readOnly} overdue={isOverdue(p)}
              onEdit={() => { setEditing(p); setModal(true); }} onDelete={() => remove(p.id)} />
          ))}
        </div>
      )}

      {modal && (
        <PoamFormModal project={project} existing={editing} evidence={evidence}
          onClose={() => setModal(false)} onSaved={() => { setModal(false); load(); }} />
      )}
    </div>
  );
}