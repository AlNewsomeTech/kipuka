import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { AlertTriangle, ChevronDown, ChevronUp, ClipboardCheck, FileImage, History, Loader2, Plus, Save, Settings2, ShieldCheck, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import EvidenceUploadModal from '@/components/project/evidence/EvidenceUploadModal';

const LIFECYCLE = ['Draft', 'Review Requested', 'Approved for Assignment', 'Assigned/Implemented', 'Evidence Required', 'Evidence Submitted', 'Evidence Accepted'];
const SYSTEMS = ['Microsoft 365', 'Entra', 'Intune', 'Defender', 'NinjaOne', 'PreVeil', 'Other'];
const RISKS = ['Low', 'Moderate', 'High', 'Critical'];
const TRAINING_FIELDS = ['Control Understanding', 'Policy Accuracy', 'Evidence Quality', 'Assistance Required', 'Independent Competency'];
const TENANT_ROLES = ['Organization Owner', 'Organization Admin', 'Compliance Manager', 'IT Admin', 'Evidence Contributor', 'Executive Viewer', 'Auditor Viewer', 'Pac-Sec Support', 'Pac-Sec Admin'];
const PERMISSION_LABELS = { create: 'Create', approve: 'Approve', assign: 'Assign', accept_evidence: 'Accept evidence' };
const SAFE_EVIDENCE = 'Capture only the configuration, assignment, and result needed to prove the control. Redact secrets, tokens, credentials, CUI content, personal data, and unrelated tenant details.';

function unwrap(response) {
  return response?.data || response || {};
}
function errorText(error) {
  return error?.response?.data?.error || error?.message || 'The workflow action could not be completed.';
}
function guidanceFor(control, system) {
  const variants = control?.how_to_implement || {};
  const keys = Object.keys(variants);
  const normalized = system.toLowerCase().replace(/[^a-z0-9]/g, '');
  const key = keys.find((item) => item.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalized))
    || keys.find((item) => item.toLowerCase().includes('generic'))
    || keys[0];
  return key ? variants[key] : null;
}
function evidenceText(control, guidance) {
  const items = Array.isArray(guidance?.capture_items)
    ? guidance.capture_items.map((item) => `• ${item.title || 'Screenshot'}: ${item.instructions || ''}`).join('\n')
    : '';
  return items || guidance?.screenshot_instructions || guidance?.evidence_description || control?.example_evidence || 'Capture the final configuration and assignment state, including the page title and relevant setting values.';
}
function eventLabel(action) {
  return String(action || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function PolicyWorkflowPage() {
  const { project, readOnly } = useOutletContext();
  const [workflows, setWorkflows] = useState([]);
  const [events, setEvents] = useState([]);
  const [settings, setSettings] = useState(null);
  const [caps, setCaps] = useState({});
  const [canConfigure, setCanConfigure] = useState(false);
  const [controls, setControls] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [creating, setCreating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [uploadFor, setUploadFor] = useState(null);
  const [selectedEvidence, setSelectedEvidence] = useState([]);
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    task_title: '', control_id: '', implementation_system: 'Microsoft 365',
    draft_policy_configuration: '', business_rationale: '', affected_systems_users: '',
    implementation_risk: '', risk_level: 'Moderate', assignment_plan: '',
    evidence_requirements: '', evidence_safety_note: SAFE_EVIDENCE, training_metadata: {},
  });

  const load = async () => {
    setError('');
    const [workflowResponse, library, evidenceRows] = await Promise.all([
      base44.functions.invoke('managePolicyWorkflow', { action: 'list', project_id: project.id }),
      base44.entities.ControlLibrary.filter({ active: true }).catch(() => []),
      base44.entities.ProjectEvidence.filter({ project_id: project.id }, '-uploaded_date', 500).catch(() => []),
    ]);
    const payload = unwrap(workflowResponse);
    const eligibleControls = library.filter((row) => !project.target_cmmc_level || row.cmmc_level === project.target_cmmc_level);
    const projectControls = [...new Map(eligibleControls.map((row) => [row.control_id, row])).values()]
      .sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0));
    setWorkflows(payload.workflows || []);
    setEvents(payload.events || []);
    setSettings(payload.settings || null);
    setCaps(payload.capabilities || {});
    setCanConfigure(payload.can_configure === true);
    setControls(projectControls);
    setEvidence(evidenceRows);
    if (selected) setSelected((payload.workflows || []).find((row) => row.id === selected.id) || null);
  };

  useEffect(() => { load().catch((loadError) => setError(errorText(loadError))); }, [project.id]);

  const selectedControl = useMemo(() => controls.find((row) => row.control_id === form.control_id), [controls, form.control_id]);
  const guidance = useMemo(() => guidanceFor(selectedControl, form.implementation_system), [selectedControl, form.implementation_system]);
  const selectedEvents = selected ? events.filter((event) => event.workflow_id === selected.id) : [];
  const matchingEvidence = selected ? evidence.filter((item) => item.control_ids?.includes(selected.control_id)) : [];

  useEffect(() => {
    if (!selectedControl) return;
    setForm((current) => ({
      ...current,
      task_title: current.task_title || `${selectedControl.control_id} ${selectedControl.control_title}`,
      business_rationale: current.business_rationale || selectedControl.why_it_matters || selectedControl.plain_english_summary || '',
      evidence_requirements: evidenceText(selectedControl, guidance),
    }));
  }, [selectedControl, guidance]);

  const invoke = async (action, workflow, extra = {}) => {
    setBusy(action);
    setError('');
    try {
      const response = await base44.functions.invoke('managePolicyWorkflow', {
        action,
        transition_id: crypto.randomUUID(),
        project_id: project.id,
        workflow_id: workflow?.id,
        comments,
        ...extra,
      });
      setComments('');
      await load();
      return unwrap(response);
    } catch (actionError) {
      setError(errorText(actionError));
      throw actionError;
    } finally {
      setBusy('');
    }
  };

  const create = async () => {
    await invoke('create', null, form);
    setCreating(false);
    setForm({
      task_title: '', control_id: '', implementation_system: 'Microsoft 365',
      draft_policy_configuration: '', business_rationale: '', affected_systems_users: '',
      implementation_risk: '', risk_level: 'Moderate', assignment_plan: '',
      evidence_requirements: '', evidence_safety_note: SAFE_EVIDENCE, training_metadata: {},
    });
  };

  const submitEvidence = async () => {
    if (!selectedEvidence.length) return setError('Select at least one evidence record.');
    setBusy('submit_evidence');
    setError('');
    try {
      for (const id of selectedEvidence) {
        const item = evidence.find((row) => row.id === id);
        if (item?.review_status === 'Draft') {
          await base44.functions.invoke('manageProjectEvidence', {
            action: 'submit_review', transition_id: crypto.randomUUID(),
            project_id: project.id, evidence_id: id, note: `Submitted from policy workflow ${selected.id}.`,
          });
        }
      }
      await invoke('submit_evidence', selected, { linked_evidence_ids: selectedEvidence });
      setSelectedEvidence([]);
    } catch (submitError) {
      setError(errorText(submitError));
      setBusy('');
    }
  };

  const acceptEvidence = async () => {
    setBusy('accept_evidence');
    setError('');
    try {
      for (const id of selected.linked_evidence_ids || []) {
        const item = evidence.find((row) => row.id === id);
        if (item?.review_status === 'Needs Review') {
          await base44.functions.invoke('manageProjectEvidence', {
            action: 'accept', transition_id: crypto.randomUUID(),
            project_id: project.id, evidence_id: id, note: comments || `Accepted from policy workflow ${selected.id}.`,
          });
        }
      }
      await load();
      await invoke('accept_evidence', selected);
    } catch (acceptError) {
      setError(errorText(acceptError));
      setBusy('');
    }
  };

  const rejectEvidence = async () => {
    if (!comments.trim()) return setError('Reviewer comments are required.');
    setBusy('reject_evidence');
    setError('');
    try {
      for (const id of selected.linked_evidence_ids || []) {
        const item = evidence.find((row) => row.id === id);
        if (item?.review_status === 'Needs Review') {
          await base44.functions.invoke('manageProjectEvidence', {
            action: 'reject', transition_id: crypto.randomUUID(),
            project_id: project.id, evidence_id: id, note: comments,
          });
        }
      }
      await invoke('reject_evidence', selected);
    } catch (rejectError) {
      setError(errorText(rejectError));
      setBusy('');
    }
  };

  const saveSettings = async () => {
    setBusy('settings');
    setError('');
    try {
      await base44.functions.invoke('managePolicyWorkflow', { action: 'update_settings', project_id: project.id, settings });
      setShowSettings(false);
      await load();
    } catch (settingsError) {
      setError(errorText(settingsError));
    } finally {
      setBusy('');
    }
  };

  const togglePermission = (role, permission) => {
    setSettings((current) => ({
      ...current,
      role_permissions: {
        ...(current?.role_permissions || {}),
        [role]: {
          ...(current?.role_permissions?.[role] || {}),
          [permission]: !current?.role_permissions?.[role]?.[permission],
        },
      },
    }));
  };

  return (
    <div className="space-y-4">
      <div className="app-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="page-kicker">Controlled implementation</div>
            <h1 className="mt-1 text-xl font-extrabold text-slate-900">Policy and Configuration Approval</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">Draft, approve, assign, implement, and validate CMMC policies or configurations with tenant-defined permissions and an auditable separation of duties.</p>
          </div>
          <div className="flex gap-2">
            {canConfigure && <button className="btn-secondary" onClick={() => setShowSettings(true)}><Settings2 className="h-4 w-4" /> Permissions</button>}
            {caps.create && !readOnly && <button className="btn-primary" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New workflow</button>}
          </div>
        </div>
      </div>

      {error && <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800"><AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />{error}</div>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">
        <div className="space-y-3">
          {workflows.length === 0 && <div className="app-surface p-8 text-center"><ClipboardCheck className="mx-auto h-8 w-8 text-slate-300" /><h2 className="mt-3 text-sm font-extrabold text-slate-700">No approval workflows yet</h2><p className="mt-1 text-xs text-slate-500">Create the first policy or configuration implementation request for this project.</p></div>}
          {workflows.map((workflow) => {
            const currentIndex = LIFECYCLE.indexOf(workflow.status);
            return <button key={workflow.id} onClick={() => { setSelected(workflow); setSelectedEvidence(workflow.linked_evidence_ids || []); }} className={`app-surface app-surface-interactive w-full p-4 text-left ${selected?.id === workflow.id ? 'ring-2 ring-blue-400' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><div className="font-mono text-[11px] font-bold text-blue-700">{workflow.control_id} · {workflow.implementation_system}</div><h2 className="mt-1 text-sm font-extrabold text-slate-900">{workflow.task_title}</h2><p className="mt-1 text-xs text-slate-500">Creator: {workflow.creator_name || workflow.creator_email}</p></div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${workflow.status === 'Changes Required' ? 'bg-red-100 text-red-800' : workflow.status === 'Evidence Accepted' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{workflow.status}</span>
              </div>
              <div className="mt-3 flex gap-1">
                {LIFECYCLE.map((stage, index) => <div key={stage} title={stage} className={`h-1.5 flex-1 rounded-full ${currentIndex >= index ? 'bg-blue-500' : 'bg-slate-200'}`} />)}
              </div>
            </button>;
          })}
        </div>

        <div>
          {!selected ? <div className="app-surface p-8 text-center text-sm text-slate-500">Select a workflow to review its details and available actions.</div> : (
            <div className="app-surface overflow-hidden">
              <div className="border-b border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-extrabold text-slate-900">{selected.task_title}</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-700">{selected.status}</span></div>
                <p className="mt-1 text-xs text-slate-500">{selected.control_id} · {selected.control_title}</p>
              </div>
              <div className="space-y-3 p-4">
                <Detail label="Why it is needed" value={selected.business_rationale} />
                <Detail label="Draft policy or configuration" value={selected.draft_policy_configuration} />
                <Detail label="Affected systems and users" value={selected.affected_systems_users} />
                <Detail label={`Implementation risk · ${selected.risk_level}`} value={selected.implementation_risk} />
                <Detail label="Assignment and implementation plan" value={selected.assignment_plan} />
                <Detail label="Required screenshots and evidence" value={selected.evidence_requirements} />
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"><ShieldCheck className="mr-1 inline h-4 w-4" />{selected.evidence_safety_note || SAFE_EVIDENCE}</div>
                {settings?.training_metadata_enabled && Object.keys(selected.training_metadata || {}).length > 0 && <Detail label="Optional competency metadata" value={Object.entries(selected.training_metadata).map(([key, value]) => `${key}: ${value || 'Not rated'}`).join('\n')} />}
                {selected.change_request_comments && <div className="rounded-lg border border-red-200 bg-red-50 p-3"><div className="text-[10px] font-extrabold uppercase text-red-700">Changes required</div><p className="mt-1 whitespace-pre-wrap text-xs text-red-900">{selected.change_request_comments}</p></div>}

                {selected.status === 'Evidence Required' && <>
                  <button className="btn-secondary w-full justify-center" onClick={() => setUploadFor(selected)}><Upload className="h-4 w-4" /> Capture and upload evidence</button>
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="text-xs font-extrabold text-slate-700">Link canonical evidence for {selected.control_id}</div>
                    <div className="mt-2 max-h-44 space-y-2 overflow-y-auto">
                      {matchingEvidence.length === 0 && <p className="text-xs text-slate-500">Upload evidence first. It will appear here after secure ingestion.</p>}
                      {matchingEvidence.map((item) => <label key={item.id} className="flex items-start gap-2 text-xs text-slate-700"><input className="mt-0.5" type="checkbox" checked={selectedEvidence.includes(item.id)} onChange={() => setSelectedEvidence((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} /><span>{item.evidence_title}<span className="block text-[10px] text-slate-400">{item.review_status} · {item.file_name}</span></span></label>)}
                    </div>
                  </div>
                </>}

                {selected.linked_evidence_ids?.length > 0 && <div className="rounded-lg border border-slate-200 p-3"><div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700"><FileImage className="h-4 w-4" /> Linked evidence</div>{selected.linked_evidence_ids.map((id) => { const item = evidence.find((row) => row.id === id); return <div key={id} className="mt-2 text-xs text-slate-600">{item?.evidence_title || id} <span className="font-bold">({item?.review_status || 'Unavailable'})</span></div>; })}</div>}

                <textarea className="form-input min-h-20" value={comments} onChange={(event) => setComments(event.target.value)} placeholder="Reviewer or implementation comments" />

                <ActionButtons selected={selected} caps={caps} busy={busy} comments={comments} invoke={invoke} submitEvidence={submitEvidence} acceptEvidence={acceptEvidence} rejectEvidence={rejectEvidence} />

                <button className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs font-extrabold text-slate-700" onClick={() => setExpanded((current) => ({ ...current, [selected.id]: !current[selected.id] }))}><span className="flex items-center gap-1.5"><History className="h-4 w-4" /> Audit trail ({selectedEvents.length})</span>{expanded[selected.id] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
                {expanded[selected.id] && <div className="space-y-2">{selectedEvents.map((event) => <div key={event.id} className="border-l-2 border-blue-200 pl-3 text-xs"><div className="font-bold text-slate-700">{eventLabel(event.action)} · {event.actor_name || event.actor_email}</div><div className="text-[10px] text-slate-400">{new Date(event.event_date).toLocaleString()} · {event.actor_role}</div>{event.comments && <p className="mt-1 whitespace-pre-wrap text-slate-600">{event.comments}</p>}</div>)}</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {creating && <WorkflowModal title="New policy or configuration workflow" onClose={() => setCreating(false)} onSave={create} busy={busy} form={form} setForm={setForm} controls={controls} settings={settings} guidance={guidance} />}
      {showSettings && settings && <SettingsModal settings={settings} setSettings={setSettings} togglePermission={togglePermission} onClose={() => setShowSettings(false)} onSave={saveSettings} busy={busy} />}
      {uploadFor && <EvidenceUploadModal project={project} controls={controls} presetControlIds={[uploadFor.control_id]} presetSourceTool={uploadFor.implementation_system} presetSourceSystem={uploadFor.implementation_system} presetEvidenceTitle={`${uploadFor.control_id} ${uploadFor.task_title} implementation evidence`} presetEvidenceType="Screenshot" presetDescription={uploadFor.evidence_requirements} fileNameDescription="Approved_Policy_Assignment" onClose={() => setUploadFor(null)} onSaved={async () => { setUploadFor(null); await load(); }} />}
    </div>
  );
}

function Detail({ label, value }) {
  if (!value) return null;
  return <div><div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">{label}</div><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-700">{value}</p></div>;
}

function ActionButtons({ selected, caps, busy, comments, invoke, submitEvidence, acceptEvidence, rejectEvidence }) {
  const loading = (name) => busy === name ? <Loader2 className="h-4 w-4 animate-spin" /> : null;
  return <div className="grid gap-2 sm:grid-cols-2">
    {['Draft', 'Changes Required'].includes(selected.status) && caps.create && <button className="btn-primary justify-center" onClick={() => invoke('submit_review', selected)}>{loading('submit_review')}Request review</button>}
    {selected.status === 'Review Requested' && caps.approve && <><button className="btn-primary justify-center" onClick={() => invoke('approve', selected)}>{loading('approve')}Approve for assignment</button><button className="btn-secondary justify-center" disabled={!comments.trim()} onClick={() => invoke('request_changes', selected)}>{loading('request_changes')}Return with comments</button></>}
    {selected.status === 'Approved for Assignment' && caps.assign && <button className="btn-primary justify-center sm:col-span-2" onClick={() => invoke('mark_assigned', selected)}>{loading('mark_assigned')}Record assigned or implemented</button>}
    {selected.status === 'Assigned/Implemented' && caps.assign && <button className="btn-primary justify-center sm:col-span-2" onClick={() => invoke('require_evidence', selected)}>{loading('require_evidence')}Require evidence</button>}
    {selected.status === 'Evidence Required' && caps.create && <button className="btn-primary justify-center sm:col-span-2" onClick={submitEvidence}>{loading('submit_evidence')}Submit linked evidence</button>}
    {selected.status === 'Evidence Submitted' && caps.accept_evidence && <><button className="btn-primary justify-center" onClick={acceptEvidence}>{loading('accept_evidence')}Accept evidence</button><button className="btn-secondary justify-center" disabled={!comments.trim()} onClick={rejectEvidence}>{loading('reject_evidence')}Reject with comments</button></>}
  </div>;
}

function WorkflowModal({ title, onClose, onSave, busy, form, setForm, controls, settings, guidance }) {
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}><div className="app-surface max-h-[92vh] w-full max-w-3xl overflow-y-auto" onClick={(event) => event.stopPropagation()}>
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-4"><h2 className="text-sm font-extrabold text-slate-900">{title}</h2><button onClick={onClose} className="text-slate-500">Close</button></div>
    <div className="space-y-4 p-4">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900"><strong>Role-neutral workflow:</strong> The creator may be a trainee, contractor, technician, or sysadmin. Production assignment remains blocked until an authorized role approves and assigns it.</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="CMMC control *"><select className="form-input" value={form.control_id} onChange={(event) => set('control_id', event.target.value)}><option value="">Select control</option>{controls.map((control) => <option key={control.id} value={control.control_id}>{control.control_id} · {control.control_title}</option>)}</select></Field>
        <Field label="Implementation system *"><select className="form-input" value={form.implementation_system} onChange={(event) => set('implementation_system', event.target.value)}>{SYSTEMS.map((system) => <option key={system}>{system}</option>)}</select></Field>
      </div>
      {guidance && <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700"><div className="font-extrabold">Control guidance</div><p className="mt-1">{guidance.outcome || guidance.setting_to_change || 'Follow the approved runbook for this implementation stack.'}</p></div>}
      <Field label="Task title *"><input className="form-input" value={form.task_title} onChange={(event) => set('task_title', event.target.value)} /></Field>
      <Field label="Draft policy or configuration *"><textarea className="form-input min-h-28" value={form.draft_policy_configuration} onChange={(event) => set('draft_policy_configuration', event.target.value)} placeholder="Describe the exact policy, setting, values, exclusions, and intended configuration." /></Field>
      <Field label="Why this is needed *"><textarea className="form-input min-h-24" value={form.business_rationale} onChange={(event) => set('business_rationale', event.target.value)} /></Field>
      <Field label="Affected systems and users"><textarea className="form-input min-h-20" value={form.affected_systems_users} onChange={(event) => set('affected_systems_users', event.target.value)} placeholder="Tenants, groups, devices, users, workloads, and exclusions." /></Field>
      <div className="grid gap-3 sm:grid-cols-[160px_1fr]"><Field label="Risk level"><select className="form-input" value={form.risk_level} onChange={(event) => set('risk_level', event.target.value)}>{RISKS.map((risk) => <option key={risk}>{risk}</option>)}</select></Field><Field label="Potential implementation risk"><textarea className="form-input min-h-20" value={form.implementation_risk} onChange={(event) => set('implementation_risk', event.target.value)} /></Field></div>
      <Field label="Assignment and implementation plan"><textarea className="form-input min-h-20" value={form.assignment_plan} onChange={(event) => set('assignment_plan', event.target.value)} placeholder="Pilot group, approval window, assignment scope, rollback, and validation." /></Field>
      <Field label="Exact screenshot and evidence requirements"><textarea className="form-input min-h-24" value={form.evidence_requirements} onChange={(event) => set('evidence_requirements', event.target.value)} /></Field>
      <Field label="Evidence safety note"><textarea className="form-input min-h-20" value={form.evidence_safety_note} onChange={(event) => set('evidence_safety_note', event.target.value)} /></Field>
      {settings?.training_metadata_enabled && <div className="rounded-xl border border-purple-200 bg-purple-50 p-3"><div className="text-xs font-extrabold text-purple-900">Optional competency metadata</div><div className="mt-3 grid gap-3 sm:grid-cols-2">{TRAINING_FIELDS.map((field) => <Field key={field} label={field}><input className="form-input" value={form.training_metadata?.[field] || ''} onChange={(event) => set('training_metadata', { ...(form.training_metadata || {}), [field]: event.target.value })} placeholder="Optional" /></Field>)}</div></div>}
    </div>
    <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white p-4"><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={onSave} disabled={!!busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save draft</button></div>
  </div></div>;
}

function SettingsModal({ settings, setSettings, togglePermission, onClose, onSave, busy }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}><div className="app-surface max-h-[92vh] w-full max-w-4xl overflow-y-auto" onClick={(event) => event.stopPropagation()}>
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-4"><div><h2 className="text-sm font-extrabold text-slate-900">Tenant workflow permissions</h2><p className="mt-1 text-xs text-slate-500">Map organization roles to workflow authority. App roles do not replace tenant roles.</p></div><button onClick={onClose}>Close</button></div>
    <div className="space-y-4 p-4">
      <label className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" className="mt-1" checked={settings.training_metadata_enabled === true} onChange={(event) => setSettings({ ...settings, training_metadata_enabled: event.target.checked })} /><span><strong>Show optional training metadata</strong><span className="block text-xs text-slate-500">Enable Pac-Sec competency fields. Normal customers can leave these hidden.</span></span></label>
      <label className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" className="mt-1" checked={settings.enforce_creator_approver_separation !== false} onChange={(event) => setSettings({ ...settings, enforce_creator_approver_separation: event.target.checked })} /><span><strong>Separate creator and approver</strong></span></label>
      <label className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" className="mt-1" checked={settings.enforce_creator_evidence_acceptor_separation !== false} onChange={(event) => setSettings({ ...settings, enforce_creator_evidence_acceptor_separation: event.target.checked })} /><span><strong>Separate creator or submitter from evidence acceptor</strong></span></label>
      <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-xs"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-3 text-left">Organization role</th>{Object.values(PERMISSION_LABELS).map((label) => <th key={label} className="p-3 text-center">{label}</th>)}</tr></thead><tbody>{TENANT_ROLES.map((role) => <tr key={role} className="border-t border-slate-100"><td className="p-3 font-bold text-slate-700">{role}</td>{Object.keys(PERMISSION_LABELS).map((permission) => <td key={permission} className="p-3 text-center"><input type="checkbox" checked={settings.role_permissions?.[role]?.[permission] === true} onChange={() => togglePermission(role, permission)} /></td>)}</tr>)}</tbody></table></div>
    </div>
    <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white p-4"><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={onSave} disabled={!!busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save permissions</button></div>
  </div></div>;
}

function Field({ label, children }) {
  return <div><label className="mb-1 block text-xs font-extrabold text-slate-600">{label}</label>{children}</div>;
}
