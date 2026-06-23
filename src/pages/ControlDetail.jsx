import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Image, FileText, Download, CheckCircle2, Save, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import BulkScreenshotUpload from '@/components/BulkScreenshotUpload';

const statuses = ['Not Started', 'In Progress', 'Evidence Needed', 'Ready for Review', 'Reviewed', 'Complete'];

export default function ControlDetail() {
  const { id } = useParams();
  const { selectedClientId } = useClient();
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
    base44.entities.CMMCControl.get(id)
      .then(c => { setControl(c); setForm(c); })
      .catch(() => {})
      .finally(() => setLoading(false));
    if (selectedClientId) {
      base44.entities.Screenshot.filter({ client_id: selectedClientId, related_control: control?.control_id }).then(setScreenshots).catch(() => {});
      base44.entities.EvidenceItem.filter({ client_id: selectedClientId, control_id: control?.control_id }).then(setEvidence).catch(() => {});
    }
  }, [id, selectedClientId, control?.control_id]);

  const handleSave = () => {
    base44.entities.CMMCControl.update(id, form)
      .then(() => { setControl(form); setEditing(false); })
      .catch(e => alert(e.message));
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-[#0F1E3C] rounded-full animate-spin" /></div>;
  if (!control) return <EmptyState icon={ShieldCheck} title="Control not found" action={<Link to="/controls" className="text-blue-600 hover:underline">← Back to controls</Link>} />;

  const current = editing ? form : control;

  return (
    <div className="space-y-6">
      <Link to="/controls" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="w-4 h-4" /> Back to Controls</Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{control.control_id}</span>
              <span className="text-xs text-slate-500">{control.control_family}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">{control.control_title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={control.status} />
            {editing ? (
              <button onClick={handleSave} className="flex items-center gap-1.5 bg-[#0F1E3C] text-white text-sm px-3 py-1.5 rounded-lg hover:bg-[#1E2D4A]"><Save className="w-3.5 h-3.5" /> Save</button>
            ) : (
              <button onClick={() => setEditing(true)} className="text-sm text-blue-600 hover:underline">Edit</button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Section title="Plain-English Explanation" content={current.explanation} editing={editing} field="explanation" form={form} setForm={setForm} />
          <Section title="Implementation Guidance" content={current.implementation_guidance} editing={editing} field="implementation_guidance" form={form} setForm={setForm} />
        </div>
      </div>

      {/* Evidence by system */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        <EvidenceSection title="Microsoft 365 Evidence" content={current.m365_evidence} icon={ShieldCheck} />
        <EvidenceSection title="SharePoint Evidence" content={current.sharepoint_evidence} icon={FileText} />
        <EvidenceSection title="Entra ID Evidence" content={current.entra_evidence} icon={ShieldCheck} />
        <EvidenceSection title="Exchange Evidence" content={current.exchange_evidence} icon={FileText} />
        <EvidenceSection title="NinjaOne Evidence" content={current.ninjaone_evidence} icon={Image} />
        <EvidenceSection title="Physical Security Evidence" content={current.physical_evidence} icon={ShieldCheck} />
      </div>

      {/* Required items */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-800">Required Evidence & Validation</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <ReqList title="Required Screenshots" items={current.required_screenshots} icon={Image} />
          <ReqList title="Required Exports" items={current.required_exports} icon={Download} />
          <ReqList title="Required Policies" items={current.required_policies} icon={FileText} />
          <ReqList title="Validation Steps" items={current.required_validation_steps} icon={CheckCircle2} />
        </div>
      </div>

      {/* Uploaded screenshots */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Screenshot Gallery</h3>
        {selectedClientId ? (
          <div className="mb-4">
            <BulkScreenshotUpload
              clientId={selectedClientId}
              controlId={control.control_id}
              onUploaded={loadScreenshots}
            />
          </div>
        ) : (
          <p className="text-xs text-amber-600 mb-3">Select a client to upload screenshots.</p>
        )}
        {screenshots.length === 0 ? (
          <p className="text-xs text-slate-400">No screenshots uploaded for this control yet. <Link to="/screenshots" className="text-blue-600 hover:underline">Upload evidence →</Link></p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {screenshots.map(s => (
              <div key={s.id} className="border border-slate-200 rounded-lg overflow-hidden">
                {s.file_url ? <img src={s.file_url} alt="" className="w-full h-24 object-cover" /> : <div className="w-full h-24 bg-slate-100 flex items-center justify-center"><Image className="w-6 h-6 text-slate-400" /></div>}
                <div className="p-2"><div className="text-[10px] text-slate-600 truncate">{s.actual_file_name || 'Untitled'}</div></div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Control narrative */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Control Narrative Draft</h3>
        {editing ? (
          <textarea className="form-input min-h-[120px]" value={form.control_narrative || ''} onChange={e => setForm({...form, control_narrative: e.target.value})} />
        ) : (
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{control.control_narrative || 'No narrative drafted yet. Click Edit to add the control narrative for the assessment package.'}</p>
        )}
      </div>

      {/* Reviewer notes & status */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Status</label>
            {editing ? (
              <select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>{statuses.map(s => <option key={s}>{s}</option>)}</select>
            ) : <StatusBadge status={control.status} />}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Assigned Owner</label>
            {editing ? <input className="form-input" value={form.assigned_owner || ''} onChange={e => setForm({...form, assigned_owner: e.target.value})} /> : <span className="text-sm text-slate-700">{control.assigned_owner || '—'}</span>}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 mb-1 block">Reviewer Notes</label>
          {editing ? <textarea className="form-input" value={form.reviewer_notes || ''} onChange={e => setForm({...form, reviewer_notes: e.target.value})} /> : <p className="text-sm text-slate-600">{control.reviewer_notes || '—'}</p>}
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.ready_for_assessment || false} onChange={e => { setForm({...form, ready_for_assessment: e.target.checked}); if (!editing) base44.entities.CMMCControl.update(id, { ready_for_assessment: e.target.checked }); }} className="w-4 h-4 rounded border-slate-300" />
          <span className="text-sm font-medium text-slate-700">Ready for Assessment</span>
        </label>
      </div>
    </div>
  );
}

function Section({ title, content, editing, field, form, setForm }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{title}</h4>
      {editing ? (
        <textarea className="form-input min-h-[80px]" value={form[field] || ''} onChange={e => setForm({...form, [field]: e.target.value})} />
      ) : (
        <p className="text-sm text-slate-600 whitespace-pre-wrap">{content || '—'}</p>
      )}
    </div>
  );
}

function EvidenceSection({ title, content, icon: Icon }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" /> {title}</h4>
      <p className="text-sm text-slate-600 whitespace-pre-wrap">{content || '—'}</p>
    </div>
  );
}

function ReqList({ title, items, icon: Icon }) {
  const list = items ? items.split('\n').filter(Boolean) : [];
  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" /> {title}</h4>
      {list.length === 0 ? <p className="text-xs text-slate-400">—</p> : (
        <ul className="space-y-1">
          {list.map((item, i) => <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5"><span className="text-slate-300 mt-0.5">•</span> {item}</li>)}
        </ul>
      )}
    </div>
  );
}