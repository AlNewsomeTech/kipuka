import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, AlertTriangle, Plus, X, ShieldCheck, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import { loadProgressMap, mergeControl, saveProgress } from '@/lib/controlProgress';
import StatusBadge from '@/components/StatusBadge';
import ProgressBar from '@/components/ProgressBar';
import EmptyState from '@/components/EmptyState';
import ControlBulkBar from '@/components/controls/ControlBulkBar';

export default function Level2Readiness() {
  const { selectedClientId, selectedClient } = useClient();
  const [controls, setControls] = useState([]);
  const [risks, setRisks] = useState([]);
  const [poams, setPoams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState('all');
  const [selected, setSelected] = useState([]);
  const [savingBulk, setSavingBulk] = useState(false);
  const [showRisk, setShowRisk] = useState(false);
  const [showPOAM, setShowPOAM] = useState(false);
  const [riskForm, setRiskForm] = useState({ risk_description: '', severity: 'Medium', likelihood: 'Medium', mitigation: '', status: 'Open', owner: '' });
  const [poamForm, setPoamForm] = useState({ weakness_description: '', control_id: '', remediation_plan: '', severity: 'Medium', scheduled_completion: '', status: 'Open', owner: '' });
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      base44.entities.CMMCControl.list('-control_id', 200),
      loadProgressMap(selectedClientId),
    ])
      .then(([defs, progress]) => setControls(defs.map(c => mergeControl(c, progress[c.control_id]))))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedClientId]);

  const load = () => {
    if (!selectedClientId) return;
    base44.entities.RiskItem.filter({ client_id: selectedClientId }).then(setRisks).catch(() => {});
    base44.entities.POAMItem.filter({ client_id: selectedClientId }).then(setPoams).catch(() => {});
  };

  useEffect(load, [selectedClientId]);

  const saveRisk = () => {
    base44.entities.RiskItem.create({ ...riskForm, client_id: selectedClientId })
      .then(() => { setShowRisk(false); setRiskForm({ risk_description: '', severity: 'Medium', likelihood: 'Medium', mitigation: '', status: 'Open', owner: '' }); load(); });
  };
  const savePOAM = () => {
    base44.entities.POAMItem.create({ ...poamForm, client_id: selectedClientId })
      .then(() => { setShowPOAM(false); setPoamForm({ weakness_description: '', control_id: '', remediation_plan: '', severity: 'Medium', scheduled_completion: '', status: 'Open', owner: '' }); load(); });
  };

  const families = [...new Set(controls.map(c => c.control_family))];
  const filtered = controls.filter(c => {
    const matchSearch = !search || c.control_id.toLowerCase().includes(search.toLowerCase()) || c.control_title.toLowerCase().includes(search.toLowerCase());
    const matchFamily = familyFilter === 'all' || c.control_family === familyFilter;
    return matchSearch && matchFamily;
  });

  const complete = controls.filter(c => c.status === 'Complete' || c.ready_for_assessment).length;
  const pct = controls.length ? (complete / controls.length) * 100 : 0;

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const allVisibleSelected = filtered.length > 0 && filtered.every(c => selected.includes(c.id));
  const toggleSelectAll = () => setSelected(allVisibleSelected ? [] : filtered.map(c => c.id));

  const applyBulkStatus = async (status) => {
    setSavingBulk(true);
    const targets = controls.filter(c => selected.includes(c.id));
    try {
      await Promise.all(targets.map(c => saveProgress(selectedClientId, c.control_id, c.level, { status })));
      setControls(controls.map(c => selected.includes(c.id) ? { ...c, status } : c));
      setSelected([]);
    } catch (e) {
      alert('Error updating controls: ' + e.message);
    } finally {
      setSavingBulk(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-[#0F1E3C] rounded-full animate-spin" /></div>;
  if (!selectedClient) return <EmptyState icon={Layers} title="No client selected" description="Select a client to view Level 2 readiness." />;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-slate-900">CMMC Level 2 Controls</h1>
          <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">Level 2 Ready</span>
        </div>
        <p className="text-sm text-slate-500">All 110 Level 2 controls (includes the 17 Level 1 controls) — complete Level 1 first, then work through these</p>
      </div>

      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <strong>Level 1 package should be completed before Level 2-ready evidence is presented as final.</strong> These controls are available for planning but should not distract from completing Level 1 controls first.
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <ProgressBar value={pct} label="Level 2 Completion" color="amber" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Search Level 2 controls..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
        <select value={familyFilter} onChange={e => setFamilyFilter(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="all">All Families</option>
          {families.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <ControlBulkBar count={selected.length} saving={savingBulk} onApply={applyBulkStatus} onClear={() => setSelected([])} />

      {/* Control table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 w-10">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300 accent-[#0F1E3C] cursor-pointer" />
              </th>
              <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Control ID</th>
              <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3 hidden md:table-cell">Title</th>
              <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3 hidden lg:table-cell">Family</th>
              <th className="text-center text-xs font-semibold text-slate-600 px-4 py-3">Evidence</th>
              <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Status</th>
              <th className="text-center text-xs font-semibold text-slate-600 px-4 py-3">Ready</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((c) => (
              <tr key={c.id} className={`hover:bg-slate-50 cursor-pointer ${selected.includes(c.id) ? 'bg-blue-50/60' : ''}`} onClick={() => navigate(`/controls/${c.id}`)}>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} className="w-4 h-4 rounded border-slate-300 accent-[#0F1E3C] cursor-pointer" />
                </td>
                <td className="px-4 py-3"><Link to={`/controls/${c.id}`} className="text-sm font-mono font-medium text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>{c.control_id}</Link></td>
                <td className="px-4 py-3 hidden md:table-cell text-sm text-slate-700">{c.control_title}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">{c.control_family}</td>
                <td className="px-4 py-3 text-center text-sm text-slate-600">{c.evidence_count || 0}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status} size="xs" /></td>
                <td className="px-4 py-3 text-center">{c.ready_for_assessment ? '✅' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState icon={ShieldCheck} title="No controls found" description="Try adjusting your search or filters." />}
      </div>

      {/* Risk Register */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-800">Risk Register</h3>
          <button onClick={() => setShowRisk(true)} className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200"><Plus className="w-3.5 h-3.5" /> Add Risk</button>
        </div>
        {risks.length === 0 ? <p className="text-xs text-slate-400 py-4">No risks tracked yet.</p> : (
          <div className="space-y-2">
            {risks.map(r => (
              <div key={r.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-700 truncate">{r.risk_description}</div>
                  <div className="text-[10px] text-slate-400">Owner: {r.owner || '—'}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${r.severity === 'Critical' ? 'bg-red-100 text-red-700' : r.severity === 'High' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{r.severity}</span>
                <StatusBadge status={r.status} size="xs" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* POA&M */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-800">POA&M Tracking</h3>
          <button onClick={() => setShowPOAM(true)} className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200"><Plus className="w-3.5 h-3.5" /> Add POA&M Item</button>
        </div>
        {poams.length === 0 ? <p className="text-xs text-slate-400 py-4">No POA&M items tracked yet.</p> : (
          <div className="space-y-2">
            {poams.map(p => (
              <div key={p.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-700 truncate">{p.weakness_description}</div>
                  <div className="text-[10px] text-slate-400">{p.control_id || '—'} • Due: {p.scheduled_completion || '—'}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${p.severity === 'High' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{p.severity}</span>
                <StatusBadge status={p.status} size="xs" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showRisk && (
        <Modal title="Add Risk Item" onClose={() => setShowRisk(false)} onSave={saveRisk}>
          <Field label="Risk Description"><textarea className="form-input" value={riskForm.risk_description} onChange={e => setRiskForm({...riskForm, risk_description: e.target.value})} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Severity"><select className="form-input" value={riskForm.severity} onChange={e => setRiskForm({...riskForm, severity: e.target.value})}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></Field>
            <Field label="Likelihood"><select className="form-input" value={riskForm.likelihood} onChange={e => setRiskForm({...riskForm, likelihood: e.target.value})}><option>Low</option><option>Medium</option><option>High</option></select></Field>
          </div>
          <Field label="Mitigation"><textarea className="form-input" value={riskForm.mitigation} onChange={e => setRiskForm({...riskForm, mitigation: e.target.value})} /></Field>
          <Field label="Owner"><input className="form-input" value={riskForm.owner} onChange={e => setRiskForm({...riskForm, owner: e.target.value})} /></Field>
        </Modal>
      )}
      {showPOAM && (
        <Modal title="Add POA&M Item" onClose={() => setShowPOAM(false)} onSave={savePOAM}>
          <Field label="Weakness Description"><textarea className="form-input" value={poamForm.weakness_description} onChange={e => setPoamForm({...poamForm, weakness_description: e.target.value})} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Control ID"><input className="form-input" value={poamForm.control_id} onChange={e => setPoamForm({...poamForm, control_id: e.target.value})} /></Field>
            <Field label="Severity"><select className="form-input" value={poamForm.severity} onChange={e => setPoamForm({...poamForm, severity: e.target.value})}><option>Low</option><option>Medium</option><option>High</option></select></Field>
          </div>
          <Field label="Remediation Plan"><textarea className="form-input" value={poamForm.remediation_plan} onChange={e => setPoamForm({...poamForm, remediation_plan: e.target.value})} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Scheduled Completion"><input type="date" className="form-input" value={poamForm.scheduled_completion} onChange={e => setPoamForm({...poamForm, scheduled_completion: e.target.value})} /></Field>
            <Field label="Owner"><input className="form-input" value={poamForm.owner} onChange={e => setPoamForm({...poamForm, owner: e.target.value})} /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, onSave, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200"><h2 className="text-lg font-bold text-slate-900">{title}</h2><button onClick={onClose} className="text-slate-400"><X className="w-5 h-5" /></button></div>
        <div className="p-5 space-y-3">{children}</div>
        <div className="flex justify-end gap-2 p-5 border-t border-slate-200"><button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button><button onClick={onSave} className="px-4 py-2 text-sm bg-[#0F1E3C] text-white rounded-lg hover:bg-[#1E2D4A]">Save</button></div>
      </div>
    </div>
  );
}
function Field({ label, children }) { return <div><label className="text-xs font-medium text-slate-600 mb-1 block">{label}</label>{children}</div>; }