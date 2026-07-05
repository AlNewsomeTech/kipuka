import { useState, useEffect, useCallback } from 'react';
import { Siren, Loader2, Plus, FileDown, Trash2, ShieldAlert } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createReportPdf, safeFileName, BRAND } from '@/lib/reportBranding';
import { buildIrpBody, DFARS_REQUIREMENTS } from '@/lib/incidentResponsePlan';
import IrTeamEditor from './IrTeamEditor';
import IncidentLogTable from './IncidentLogTable';
import IncidentLogModal from './IncidentLogModal';

// Incident Response module: IR team + plan generator + incident log.
export default function IncidentModule({ project, org, readOnly, currentUser }) {
  const [plan, setPlan] = useState(null);
  const [assets, setAssets] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logModal, setLogModal] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [tab, setTab] = useState('plan');

  const load = useCallback(async () => {
    setLoading(true);
    const [plans, ast, lg] = await Promise.all([
      base44.entities.IncidentResponsePlan.filter({ project_id: project.id }).catch(() => []),
      base44.entities.Asset.filter({ project_id: project.id }).catch(() => []),
      base44.entities.IncidentLog.filter({ project_id: project.id }, '-incident_date').catch(() => []),
    ]);
    setPlan(plans[0] || null);
    setAssets(ast);
    setLogs(lg);
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const ensurePlan = async (patch = {}) => {
    setSaving(true);
    let saved;
    if (plan?.id) saved = await base44.entities.IncidentResponsePlan.update(plan.id, patch);
    else saved = await base44.entities.IncidentResponsePlan.create({
      organization_id: project.organization_id, project_id: project.id,
      plan_status: 'Draft', team_members: [], ...patch,
    });
    setPlan(saved);
    setSaving(false);
    return saved;
  };

  const generateIrp = () => {
    const r = createReportPdf({ title: 'Incident Response Plan', project, org, generatedBy: currentUser?.full_name || currentUser?.email });
    const body = buildIrpBody({ plan, org, project, assets });
    // Render section-by-section using the PDF text helper (strips HTML).
    body.split(/<h[12][^>]*>/i).forEach((chunk, i) => {
      if (i === 0) { if (chunk.trim()) r.text(chunk); return; }
      const [head, ...rest] = chunk.split(/<\/h[12]>/i);
      r.heading(head.replace(/<[^>]+>/g, '').trim());
      r.text(rest.join(' '));
    });
    r.disclaimerNote(BRAND.disclaimer);
    r.save(`${safeFileName(project.project_name)}_Incident_Response_Plan.pdf`);
    ensurePlan({ last_generated_date: new Date().toISOString() });
  };

  const removeLog = async (id) => { await base44.entities.IncidentLog.delete(id); load(); };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2.5">
          <Siren className="w-5 h-5 text-[#0F1E3C]" />
          <h1 className="text-lg font-bold text-slate-900">Incident Response</h1>
        </div>
        <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">
          Build the Incident Response Plan (IRP) and maintain the Incident Log. The generated plan merges your team,
          assets, and environment with the standard IR phases and the DFARS 252.204-7012 reporting requirements.
        </p>
        <div className="flex gap-2 mt-4">
          {[{ k: 'plan', l: 'Response Plan' }, { k: 'log', l: `Incident Log (${logs.length})` }].map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === t.k ? 'bg-[#0F1E3C] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t.l}</button>
          ))}
        </div>
      </div>

      {tab === 'plan' && (
        <>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-1.5 text-sm font-bold text-amber-800 mb-2">
              <ShieldAlert className="w-4 h-4" /> DFARS 252.204-7012 Reporting Requirements
            </div>
            <ul className="space-y-1">
              {DFARS_REQUIREMENTS.map((d, i) => <li key={i} className="text-xs text-amber-700 leading-relaxed">• {d}</li>)}
            </ul>
          </div>

          <IrTeamEditor plan={plan} readOnly={readOnly} saving={saving}
            onSave={(members) => ensurePlan({ team_members: members })}
            onField={(patch) => ensurePlan(patch)} />

          <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm font-bold text-slate-800">Generate Incident Response Plan</div>
              <div className="text-xs text-slate-500">
                {plan?.last_generated_date ? `Last generated ${new Date(plan.last_generated_date).toLocaleString()}` : 'Not generated yet.'}
              </div>
            </div>
            {!readOnly && (
              <button onClick={generateIrp}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
                <FileDown className="w-4 h-4" /> Generate IRP (PDF)
              </button>
            )}
          </div>
        </>
      )}

      {tab === 'log' && (
        <div className="space-y-3">
          {!readOnly && (
            <div className="flex justify-end">
              <button onClick={() => { setEditingLog(null); setLogModal(true); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
                <Plus className="w-4 h-4" /> Log Incident
              </button>
            </div>
          )}
          <IncidentLogTable logs={logs} readOnly={readOnly}
            onEdit={(l) => { setEditingLog(l); setLogModal(true); }} onDelete={removeLog} />
        </div>
      )}

      {logModal && (
        <IncidentLogModal project={project} existing={editingLog}
          onClose={() => setLogModal(false)} onSaved={() => { setLogModal(false); load(); }} />
      )}
    </div>
  );
}