import { ShieldCheck, FileText, Image, CheckCircle2, AlertCircle } from 'lucide-react';

const statusConfig = {
  'Implemented': { color: 'text-green-600', bg: 'bg-green-50', dot: 'bg-green-500' },
  'Partially Implemented': { color: 'text-amber-600', bg: 'bg-amber-50', dot: 'bg-amber-500' },
  'Planned': { color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  'Not Started': { color: 'text-slate-500', bg: 'bg-slate-50', dot: 'bg-slate-400' },
  'Not Applicable': { color: 'text-slate-400', bg: 'bg-slate-50', dot: 'bg-slate-300' },
};

export default function ControlNarrativesTab({ synthesis }) {
  const narratives = synthesis.control_narratives || [];
  const byFamily = synthesis.narratives_by_family || {};
  const families = Object.keys(byFamily).sort();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-xs text-slate-500">Total Controls</div>
          <div className="text-xl font-bold text-slate-800">{narratives.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-xs text-slate-500">With Narratives</div>
          <div className="text-xl font-bold text-green-600">{narratives.filter(n => n.has_narrative).length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-xs text-slate-500">With Evidence</div>
          <div className="text-xl font-bold text-blue-600">{narratives.filter(n => n.has_evidence).length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-xs text-slate-500">Ready for Assessment</div>
          <div className="text-xl font-bold text-green-600">{narratives.filter(n => n.ready_for_assessment).length}</div>
        </div>
      </div>

      {families.map(fam => (
        <div key={fam} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-800">{fam}</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {byFamily[fam].map(n => {
              const cfg = statusConfig[n.implementation_status] || statusConfig['Not Started'];
              return (
                <div key={n.control_id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-700">{n.control_id}</span>
                        <span className="text-sm font-medium text-slate-800">{n.control_title}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{n.level} • Owner: {n.responsible_owner}</div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} flex-shrink-0`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {n.implementation_status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5 mt-2">
                    {n.implementation_narrative}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px]">
                    <span className="flex items-center gap-1 text-slate-500"><FileText className="w-3 h-3" /> {n.evidence_items} evidence</span>
                    <span className="flex items-center gap-1 text-slate-500"><Image className="w-3 h-3" /> {n.screenshots} screenshots</span>
                    <span className="flex items-center gap-1 text-slate-500"><CheckCircle2 className="w-3 h-3" /> {n.validations} validations{n.validated ? ' ✅' : ''}</span>
                    {n.poam_items > 0 && <span className="flex items-center gap-1 text-amber-600"><AlertCircle className="w-3 h-3" /> {n.poam_items} POA&M</span>}
                    {n.ready_for_assessment && <span className="flex items-center gap-1 text-green-600 font-medium"><CheckCircle2 className="w-3 h-3" /> Ready</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}