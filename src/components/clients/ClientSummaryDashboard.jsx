import { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, FileText, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { loadProgressMap } from '@/lib/controlProgress';

const OPEN_POAM = ['Open', 'Mitigating', 'In Progress', 'Not Started'];

const sevTone = {
  Critical: 'bg-red-50 text-red-700',
  High: 'bg-orange-50 text-orange-600',
  Moderate: 'bg-amber-50 text-amber-700',
  Medium: 'bg-amber-50 text-amber-700',
  Low: 'bg-slate-100 text-slate-600',
};

function relTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

// High-level per-client summary: CMMC progress %, active POA&M items, recent doc updates.
export default function ClientSummaryDashboard({ clientId, expanded, onToggle }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!clientId || !expanded || data) return;
    let active = true;
    (async () => {
      const [l1, l2, progress, poams, docs] = await Promise.all([
        base44.entities.CMMCControl.filter({ level: 'Level 1' }).catch(() => []),
        base44.entities.CMMCControl.filter({ level: 'Level 2' }).catch(() => []),
        loadProgressMap(clientId),
        base44.entities.POAMItem.filter({ client_id: clientId }).catch(() => []),
        base44.entities.GeneratedDocument.filter({ client_id: clientId }, '-updated_date', 4).catch(() => []),
      ]);
      if (!active) return;
      const allControls = [...l1, ...l2];
      const total = allControls.length;
      const complete = allControls.filter((c) => {
        const p = progress[c.control_id];
        return p && (p.status === 'Complete' || p.ready_for_assessment);
      }).length;
      const pct = total ? Math.round((complete / total) * 100) : 0;
      const activePoams = poams.filter((p) => OPEN_POAM.includes(p.status));
      setData({ pct, complete, total, activePoams, docs });
    })();
    return () => { active = false; };
  }, [clientId, expanded, data]);

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0F1E3C] transition-colors"
      >
        <TrendingUp className="w-3.5 h-3.5" />
        Progress Summary
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
          {!data ? (
            <div className="h-24 bg-slate-50 rounded-lg animate-pulse" />
          ) : (
            <>
              {/* CMMC progress */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-600">CMMC Progress</span>
                  <span className="text-xs font-bold text-slate-800">{data.pct}% <span className="font-normal text-slate-400">({data.complete}/{data.total})</span></span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${data.pct}%` }} />
                </div>
              </div>

              {/* Active POA&M items */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-medium text-slate-600">Active POA&amp;M</span>
                  <span className="text-xs font-bold text-slate-800">{data.activePoams.length}</span>
                </div>
                {data.activePoams.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No open POA&amp;M items.</p>
                ) : (
                  <div className="space-y-1">
                    {data.activePoams.slice(0, 3).map((p) => (
                      <div key={p.id} className="flex items-center gap-2 text-xs">
                        <span className={`px-1.5 py-0.5 rounded-full font-semibold text-[10px] ${sevTone[p.severity] || 'bg-slate-100 text-slate-600'}`}>{p.severity || '—'}</span>
                        <span className="text-slate-700 truncate flex-1">{p.weakness_description || p.control_id || 'Untitled'}</span>
                      </div>
                    ))}
                    {data.activePoams.length > 3 && (
                      <p className="text-[11px] text-slate-400">+{data.activePoams.length - 3} more</p>
                    )}
                  </div>
                )}
              </div>

              {/* Recent documentation updates */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs font-medium text-slate-600">Recent Documentation</span>
                </div>
                {data.docs.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No documents yet.</p>
                ) : (
                  <div className="space-y-1">
                    {data.docs.map((d) => (
                      <div key={d.id} className="flex items-center gap-2 text-xs">
                        <span className="text-slate-700 truncate flex-1">{d.title || d.document_type || 'Document'}</span>
                        <span className="text-slate-400 flex-shrink-0">{relTime(d.updated_date)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}