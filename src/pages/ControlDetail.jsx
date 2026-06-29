import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Image, FileText, Download, CheckCircle2, Save, BookOpen, ClipboardList, FolderArchive, Pencil } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import { mergeControl, saveProgress } from '@/lib/controlProgress';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import BulkScreenshotUpload from '@/components/BulkScreenshotUpload';
import TechnicianInstructions from '@/components/TechnicianInstructions';
import CollapsibleSection from '@/components/ui/Collapsible';
import ProseBlock from '@/components/ui/ProseBlock';
import MetaBadge, { LevelBadge, CountBadge } from '@/components/ui/MetaBadge';

const statuses = ['Not Started', 'In Progress', 'Evidence Needed', 'Ready for Review', 'Reviewed', 'Complete'];

export default function ControlDetail() {
  const { id } = useParams();
  const { selectedClientId, selectedClient } = useClient();
  const [control, setControl] = useState(null);
  const [screenshots, setScreenshots] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  const loadScreenshots = useCallback(() => {
    if (selectedClientId && control?.control_id) {
      base44.entities.Screenshot.filter({ client_id: selectedClientId, related_control: control.control_id }).then(setScreenshots).catch(() => {});
    }
  }, [selectedClientId, control?.control_id]);

  useEffect(() => {
    setLoading(true);
    base44.entities.CMMCControl.get(id)
      .then(async (def) => {
        let progressRow = null;
        if (selectedClientId && def?.control_id) {
          const rows = await base44.entities.ControlProgress.filter({ client_id: selectedClientId, control_id: def.control_id }).catch(() => []);
          progressRow = rows[0] || null;
        }
        const merged = mergeControl(def, progressRow);
        setControl(merged);
        setForm(merged);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    if (selectedClientId && control?.control_id) {
      base44.entities.Screenshot.filter({ client_id: selectedClientId, related_control: control.control_id }).then(setScreenshots).catch(() => {});
      base44.entities.EvidenceItem.filter({ client_id: selectedClientId, control_id: control.control_id }).then(setEvidence).catch(() => {});
    }
  }, [id, selectedClientId, control?.control_id]);

  const handleSave = () => {
    if (!selectedClientId) { alert('Select a client before saving control progress.'); return; }
    saveProgress(selectedClientId, control.control_id, control.level, form)
      .then(() => { setControl(form); setEditing(false); })
      .catch(e => alert(e.message));
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-[#0F1E3C] rounded-full animate-spin" /></div>;
  if (!control) return <EmptyState icon={ShieldCheck} title="Control not found" action={<Link to="/controls" className="text-blue-600 hover:underline">← Back to controls</Link>} />;

  const current = editing ? form : control;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <Link to="/controls" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-500 hover:text-slate-800"><ArrowLeft className="w-4 h-4" /> Back to Controls</Link>

      {/* ===== Header card ===== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-7">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-block text-[16px] font-mono font-bold text-blue-700 bg-blue-100 border border-blue-200 px-3 py-1 rounded-lg mb-3">{control.control_id}</span>
            <h1 className="text-2xl md:text-[28px] font-bold text-slate-900 leading-tight">{control.control_title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <LevelBadge level={control.level} />
              <MetaBadge variant="family">{control.control_family}</MetaBadge>
              <StatusBadge status={control.status} size="md" />
              {control.ready_for_assessment && <MetaBadge variant="ready" icon={CheckCircle2}>Ready for Assessment</MetaBadge>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {editing ? (
              <button onClick={handleSave} className="flex items-center gap-2 bg-[#0F1E3C] text-white text-[15px] font-semibold px-4 py-2.5 rounded-lg hover:bg-[#1E2D4A]"><Save className="w-4 h-4" /> Save</button>
            ) : (
              <button onClick={() => setEditing(true)} className="flex items-center gap-2 border border-slate-300 text-slate-700 text-[15px] font-semibold px-4 py-2.5 rounded-lg hover:bg-slate-50"><Pencil className="w-4 h-4" /> Edit</button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-slate-100">
          <CountBadge icon={FileText} label="evidence items" value={evidence.length || control.evidence_count} />
          <CountBadge icon={Image} label="screenshots" value={screenshots.length || control.screenshot_count} />
          <CountBadge icon={Download} label="exports" value={control.export_count} />
        </div>
      </div>

      {/* ===== Summary ===== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-7">
        <h2 className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4" /> What This Control Requires</h2>
        {editing ? (
          <textarea className="form-input min-h-[100px] text-[15px] leading-relaxed" value={form.explanation || ''} onChange={e => setForm({...form, explanation: e.target.value})} />
        ) : (
          <ProseBlock content={current.explanation} clampLines={5} />
        )}
      </div>

      {/* ===== Implementation (collapsible) ===== */}
      <CollapsibleSection title="Implementation Guidance" icon={ClipboardList} defaultOpen>
        {editing ? (
          <textarea className="form-input min-h-[120px] text-[15px] leading-relaxed mt-3" value={form.implementation_guidance || ''} onChange={e => setForm({...form, implementation_guidance: e.target.value})} />
        ) : (
          <div className="mt-3"><ProseBlock content={current.implementation_guidance} clampLines={6} /></div>
        )}
      </CollapsibleSection>

      {/* ===== Technician step-by-step ===== */}
      <TechnicianInstructions control={control} clientName={selectedClient?.legal_name} ninjaoneInScope={selectedClient?.ninjaone_in_scope} cortexXdrInScope={selectedClient?.cortex_xdr_in_scope} />

      {/* ===== Evidence by system (collapsible) ===== */}
      <CollapsibleSection title="Evidence by System" icon={ShieldCheck} defaultOpen>
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <EvidenceSection title="Microsoft 365" content={current.m365_evidence} />
          <EvidenceSection title="SharePoint" content={current.sharepoint_evidence} />
          <EvidenceSection title="Entra ID" content={current.entra_evidence} />
          <EvidenceSection title="Exchange" content={current.exchange_evidence} />
          {selectedClient?.ninjaone_in_scope && <EvidenceSection title="NinjaOne" content={current.ninjaone_evidence} />}
          {selectedClient?.cortex_xdr_in_scope && <EvidenceSection title="Cortex XDR" content={current.cortex_xdr_evidence} />}
          {selectedClient?.has_physical_location && <EvidenceSection title="Physical Security" content={current.physical_evidence} />}
        </div>
      </CollapsibleSection>

      {/* ===== Required items (collapsible) ===== */}
      <CollapsibleSection title="Required Evidence & Validation" icon={ClipboardList}>
        <div className="grid md:grid-cols-2 gap-5 mt-4">
          <ReqList title="Required Screenshots" items={current.required_screenshots} icon={Image} />
          <ReqList title="Required Exports" items={current.required_exports} icon={Download} />
          <ReqList title="Required Policies" items={current.required_policies} icon={FileText} />
          <ReqList title="Validation Steps" items={current.required_validation_steps} icon={CheckCircle2} />
        </div>
      </CollapsibleSection>

      {/* ===== Screenshot gallery ===== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-[15px] font-bold text-slate-900 mb-4 flex items-center gap-2"><Image className="w-[18px] h-[18px] text-slate-500" /> Screenshot Gallery</h3>
        {selectedClientId ? (
          <div className="mb-4">
            <BulkScreenshotUpload clientId={selectedClientId} controlId={control.control_id} onUploaded={loadScreenshots} />
          </div>
        ) : (
          <p className="text-[14px] text-amber-700 mb-3">Select a client to upload screenshots.</p>
        )}
        {screenshots.length === 0 ? (
          <p className="text-[14px] text-slate-500">No screenshots uploaded for this control yet. <Link to="/screenshots" className="text-blue-600 font-semibold hover:underline">Upload evidence →</Link></p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {screenshots.map(s => (
              <div key={s.id} className="border border-slate-200 rounded-lg overflow-hidden">
                {s.file_url ? <img src={s.file_url} alt="" className="w-full h-24 object-cover" /> : <div className="w-full h-24 bg-slate-100 flex items-center justify-center"><Image className="w-6 h-6 text-slate-400" /></div>}
                <div className="p-2"><div className="text-[12px] text-slate-600 truncate">{s.actual_file_name || 'Untitled'}</div></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Control narrative ===== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-[15px] font-bold text-slate-900 mb-4 flex items-center gap-2"><FolderArchive className="w-[18px] h-[18px] text-slate-500" /> Control Narrative Draft</h3>
        {editing ? (
          <textarea className="form-input min-h-[120px] text-[15px] leading-relaxed" value={form.control_narrative || ''} onChange={e => setForm({...form, control_narrative: e.target.value})} />
        ) : control.control_narrative ? (
          <ProseBlock content={control.control_narrative} clampLines={8} />
        ) : (
          <p className="text-[15px] text-slate-400 italic">No narrative drafted yet. Click Edit to add the control narrative for the assessment package.</p>
        )}
      </div>

      {/* ===== Status & reviewer ===== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <h3 className="text-[15px] font-bold text-slate-900 flex items-center gap-2"><ClipboardList className="w-[18px] h-[18px] text-slate-500" /> Status & Review</h3>
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Status</label>
            {editing ? (
              <select className="form-input text-[15px]" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>{statuses.map(s => <option key={s}>{s}</option>)}</select>
            ) : <StatusBadge status={control.status} size="md" />}
          </div>
          <div>
            <label className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Assigned Owner</label>
            {editing ? <input className="form-input text-[15px]" value={form.assigned_owner || ''} onChange={e => setForm({...form, assigned_owner: e.target.value})} /> : <span className="text-[15px] text-slate-800">{control.assigned_owner || '—'}</span>}
          </div>
        </div>
        <div>
          <label className="text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Reviewer Notes</label>
          {editing ? <textarea className="form-input text-[15px] leading-relaxed" value={form.reviewer_notes || ''} onChange={e => setForm({...form, reviewer_notes: e.target.value})} /> : (control.reviewer_notes ? <ProseBlock content={control.reviewer_notes} clampLines={6} /> : <p className="text-[15px] text-slate-400 italic">No reviewer notes yet.</p>)}
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer pt-1">
          <input type="checkbox" checked={form.ready_for_assessment || false} onChange={e => { const updated = {...form, ready_for_assessment: e.target.checked}; setForm(updated); setControl(updated); if (!editing && selectedClientId) saveProgress(selectedClientId, control.control_id, control.level, updated); }} className="w-5 h-5 rounded border-slate-300" />
          <span className="text-[15px] font-semibold text-slate-800">Ready for Assessment</span>
        </label>
      </div>
    </div>
  );
}

function EvidenceSection({ title, content }) {
  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
      <h4 className="text-[13px] font-bold text-slate-600 uppercase tracking-wide mb-2">{title}</h4>
      {content && content.trim() && content.trim() !== 'N/A for Level 1' ? (
        <ProseBlock content={content} clampLines={4} />
      ) : (
        <p className="text-[14px] text-slate-400 italic">Not applicable.</p>
      )}
    </div>
  );
}

function ReqList({ title, items, icon: Icon }) {
  const list = items ? items.split('\n').filter(Boolean) : [];
  return (
    <div>
      <h4 className="text-[13px] font-bold text-slate-600 uppercase tracking-wide mb-2.5 flex items-center gap-1.5"><Icon className="w-4 h-4" /> {title}</h4>
      {list.length === 0 ? <p className="text-[14px] text-slate-400 italic">None listed.</p> : (
        <ul className="space-y-2">
          {list.map((item, i) => <li key={i} className="text-[15px] text-slate-700 leading-[1.5] flex items-start gap-2"><span className="text-slate-400 mt-0.5 flex-shrink-0">•</span> {item.replace(/^\s*[-•*]\s*/, '')}</li>)}
        </ul>
      )}
    </div>
  );
}