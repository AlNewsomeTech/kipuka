import { useState, useEffect } from 'react';
import { Layers, AlertTriangle, Plus, X, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

const l2Modules = [
  { domain: 'Vulnerability Management', description: 'NinjaOne vulnerability scanning, remediation tracking, and reporting', control: 'RA.L2-3.11.2' },
  { domain: 'Patch Management', description: 'Automated patch policies for macOS and Windows, patch status reporting', control: 'SI.L2-3.14.1' },
  { domain: 'Configuration Management', description: 'Baseline configurations, drift detection, and hardening standards', control: 'CM.L2-3.4.1' },
  { domain: 'Audit and Log Review', description: 'Unified audit logging, log retention, and periodic review', control: 'AU.L2-3.3.1' },
  { domain: 'Device Compliance', description: 'Intune compliance policies, conditional access enforcement', control: 'AC.L2-3.1.18' },
  { domain: 'MDM for macOS', description: 'NinjaOne MDM or Intune macOS enrollment, FileVault, configuration profiles', control: 'AC.L2-3.1.18' },
  { domain: 'Remote Assistance Controls', description: 'NinjaOne remote control logging, approval workflows, session recording', control: 'AC.L2-3.1.12' },
  { domain: 'Risk Tracking', description: 'Risk register, severity scoring, mitigation tracking', control: 'RA.L2-3.11.1' },
  { domain: 'POA&M Tracking', description: 'Plan of Action and Milestones for open weaknesses', control: 'RA.L2-3.11.3' },
  { domain: 'CUI Readiness', description: 'CUI identification, labeling, encryption, and access controls', control: 'AC.L2-3.1.1' },
  { domain: 'Policy Expansion', description: 'Expanded policies for Level 2 requirements', control: 'Multiple' },
  { domain: 'Incident Response Maturity', description: 'IR plan, tabletop exercises, incident logging', control: 'IR.L2-3.6.1' },
  { domain: 'Access Review Maturity', description: 'Periodic access reviews, privileged access management', control: 'AC.L2-3.1.12' },
];

export default function Level2Readiness() {
  const { selectedClientId, selectedClient } = useClient();
  const [risks, setRisks] = useState([]);
  const [poams, setPoams] = useState([]);
  const [poamForm, setPoamForm] = useState({ weakness_description: '', control_id: '', remediation_plan: '', severity: 'Medium', scheduled_completion: '', status: 'Open', owner: '' });
  const [showRisk, setShowRisk] = useState(false);
  const [showPOAM, setShowPOAM] = useState(false);
  const [riskForm, setRiskForm] = useState({ risk_description: '', severity: 'Medium', likelihood: 'Medium', mitigation: '', status: 'Open', owner: '' });

  const load = () => {
    if (!selectedClientId) return;
    base44.entities.RiskItem.filter({ client_id: selectedClientId }).then(setRisks).catch(() => {});
    base44.entities.POAMItem.filter({ client_id: selectedClientId }).then(setPOAM).catch(() => {});
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

  if (!selectedClient) return <EmptyState icon={Layers} title="No client selected" description="Select a client to view Level 2 readiness." />;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-slate-900">Level 2 Readiness</h1>
          <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">Level 2 Ready</span>
        </div>
        <p className="text-sm text-slate-500">Planning modules for controls that exceed Level 1 — kept separate from the Level 1 final package</p>
      </div>

      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <strong>Level 1 package should be completed before Level 2-ready evidence is presented as final.</strong> These modules are available for planning but should not distract from completing Level 1 controls first.
        </div>
      </div>

      {/* Planning modules */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Level 2 Planning Modules</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {l2Modules.map((m) => (
            <div key={m.domain} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-semibold text-slate-800">{m.domain}</h4>
                <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{m.control}</span>
              </div>
              <p className="text-xs text-slate-500">{m.description}</p>
            </div>
          ))}
        </div>
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