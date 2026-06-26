import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Layers, Cpu, Building, ChevronRight } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import ProgressBar from '@/components/ProgressBar';
import { LEVEL2_DOMAINS } from '@/lib/level2Phases';
import { loadProgressMap, mergeControl, saveProgress } from '@/lib/controlProgress';

const STATUSES = ['Not Started', 'In Progress', 'Evidence Needed', 'Ready for Review', 'Reviewed', 'Complete'];
const DOMAIN_ICONS = { technical: Cpu, physical: Building };

export default function Level2Board({ clientId, client }) {
  const navigate = useNavigate();
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const cloudOnly = client?.cloud_only === true;

  const load = () => {
    if (!clientId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      base44.entities.CMMCControl.filter({ level: 'Level 2' }, 'control_id', 200),
      loadProgressMap(clientId),
    ])
      .then(([defs, progressMap]) => {
        setControls(defs.map(c => mergeControl(c, progressMap[c.control_id])));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [clientId]);

  const handleStatusChange = (control, status) => {
    setControls(prev => prev.map(c => c.control_id === control.control_id ? { ...c, status } : c));
    saveProgress(clientId, control.control_id, 'Level 2', { status }).catch(() => load());
  };

  const completePct = controls.length
    ? Math.round((controls.filter(c => c.status === 'Complete').length / controls.length) * 100)
    : 0;

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-slate-200 border-t-[#0F1E3C] rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Level 2 Deployment Board</h2>
            <p className="text-sm text-slate-500">{controls.length} controls organized into technical &amp; physical security phases</p>
          </div>
        </div>
        <div className="w-48 hidden sm:block">
          <ProgressBar value={completePct} label="L2 Complete" color="navy" size="sm" />
        </div>
      </div>

      {LEVEL2_DOMAINS.map((domain) => {
        const DomainIcon = DOMAIN_ICONS[domain.key];
        const domainPhases = domain.phases
          .map(phase => ({ phase, items: controls.filter(c => c.control_family === phase) }))
          .filter(p => p.items.length > 0);
        const domainCount = domainPhases.reduce((n, p) => n + p.items.length, 0);
        if (domainCount === 0) return null;

        const physicalNA = domain.key === 'physical' && cloudOnly;

        return (
          <div key={domain.key} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-start gap-3 p-4 border-b border-slate-200 bg-slate-50">
              <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                <DomainIcon className="w-5 h-5 text-slate-700" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{domain.label}</h3>
                  <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{domainCount} controls</span>
                  {physicalNA && <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">Cloud-Only — N/A</span>}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{domain.description}</p>
              </div>
            </div>

            {physicalNA ? (
              <div className="p-4 text-sm text-slate-500 bg-blue-50/40">
                This client is <span className="font-medium text-blue-700">Cloud Only</span> with no in-scope physical location. Physical Protection controls are inherited from the cloud service provider (e.g. Microsoft 365 data-center physical security) and documented via the Service Provider Responsibility Matrix rather than implemented on-site.
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto p-3">
                {domainPhases.map(({ phase, items }) => {
                  const done = items.filter(c => c.status === 'Complete').length;
                  return (
                    <div key={phase} className="flex-shrink-0 w-72 bg-slate-100/70 rounded-xl p-2.5">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-xs font-semibold text-slate-700">{phase}</span>
                        <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{done}/{items.length}</span>
                      </div>
                      <div className="space-y-2">
                        {items.map((control) => (
                          <div key={control.control_id} className="bg-white rounded-lg p-3 shadow-sm border border-slate-200/60">
                            <button
                              type="button"
                              onClick={() => navigate(`/controls/${encodeURIComponent(control.control_id)}`)}
                              className="flex items-start gap-1.5 mb-2 w-full text-left hover:bg-slate-50 -m-1 p-1 rounded transition-colors group"
                            >
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0 group-hover:text-slate-600" />
                              <div className="min-w-0">
                                <div className="text-[10px] font-mono text-slate-400">{control.control_id}</div>
                                <div className="text-xs font-medium text-slate-800 leading-tight group-hover:text-slate-900">{control.control_title}</div>
                              </div>
                            </button>
                            <div className="flex items-center justify-between gap-2">
                              <StatusBadge status={control.status} size="xs" />
                              <select
                                value={control.status}
                                onChange={(e) => handleStatusChange(control, e.target.value)}
                                className="text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/30 max-w-[120px]"
                              >
                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}