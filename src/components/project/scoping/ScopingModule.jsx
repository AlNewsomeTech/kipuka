import { useState, useEffect, useCallback } from 'react';
import { Crosshair, Save, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { SCOPING_QUESTIONS } from '@/lib/scopingQuestions';
import RichTextField from '@/components/ui/RichTextField';
import StatusBadge from '@/components/StatusBadge';
import TagListField from './TagListField';

const ENV_TYPES = ['Entire Enterprise', 'Enclave', 'Hybrid', 'Unknown'];
const SCOPE_STATUSES = ['Not Started', 'Draft', 'Needs Review', 'Approved'];

export default function ScopingModule({ project, readOnly, currentUser }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const existing = await base44.entities.ScopingProfile.filter({ project_id: project.id });
      if (existing.length > 0) {
        setProfile(existing[0]);
      } else {
        setProfile({
          organization_id: project.organization_id,
          project_id: project.id,
          scope_name: `${project.project_name} — Assessment Scope`,
          handles_fci: false, handles_cui: false,
          environment_type: 'Unknown',
          included_locations: [], excluded_locations: [],
          wizard_answers: {},
          scope_status: 'Not Started',
        });
      }
    } catch (error) {
      setLoadError(error?.response?.data?.error || error?.message || 'Kipuka could not verify the complete scoping profile.');
    } finally {
      setLoading(false);
    }
  }, [project.id, project.organization_id, project.project_name]);

  useEffect(() => { load(); }, [load]);

  const set = (field, value) => setProfile((p) => ({ ...p, [field]: value }));
  const setAnswer = (key, value) => setProfile((p) => ({ ...p, wizard_answers: { ...(p.wizard_answers || {}), [key]: value } }));
  const scopeApprovalChecks = [
    { label: 'Scope name is complete', pass: Boolean(String(profile?.scope_name || '').trim()) },
    { label: 'Environment type is selected', pass: profile?.environment_type && profile.environment_type !== 'Unknown' },
    { label: 'Assessment boundary is documented', pass: Boolean(String(profile?.boundary_summary || '').trim()) },
    { label: 'Included systems are documented', pass: Boolean(String(profile?.included_systems_summary || '').trim()) },
    { label: 'Data flow is documented', pass: Boolean(String(profile?.data_flow_summary || '').trim()) },
    { label: 'FCI description is complete when FCI is handled', pass: !profile?.handles_fci || Boolean(String(profile?.fci_description || '').trim()) },
    { label: 'CUI description is complete when CUI is handled', pass: !profile?.handles_cui || Boolean(String(profile?.cui_description || '').trim()) },
    { label: 'Every scoping question is answered', pass: SCOPING_QUESTIONS.every((q) => Boolean(String((profile?.wizard_answers || {})[q.key] || '').trim())) },
  ];
  const scopeCanApprove = scopeApprovalChecks.every((c) => c.pass);

  const save = async (extra = {}) => {
    setSaveError(null);
    const payload = { ...profile, ...extra };
    if (payload.scope_status === 'Approved' && !scopeCanApprove) {
      setSaveError('Scope cannot be approved until every validation item below passes.');
      return;
    }
    setSaving(true);
    try {
      const result = profile.id
        ? await base44.entities.ScopingProfile.update(profile.id, payload)
        : await base44.entities.ScopingProfile.create(payload);
      setProfile(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      setSaveError(error?.response?.data?.error || error?.message || 'Scope was not saved.');
    } finally {
      setSaving(false);
    }
  };

  const approve = () => save({
    scope_status: 'Approved',
    approved_by: currentUser?.full_name || currentUser?.email || 'Unknown',
    approved_date: new Date().toISOString().slice(0, 10),
  });

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }
  if (loadError) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-red-800"><AlertTriangle className="w-4 h-4" /> Scoping profile could not be verified</div>
      <p className="text-[13px] text-red-700 mt-2">{loadError}</p>
      <p className="text-xs text-red-600 mt-1">Kipuka will not display a blank scope or allow approval from a partial load.</p>
      <button onClick={load} className="mt-3 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-700 hover:bg-red-800">Retry complete load</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
          <div className="flex items-center gap-2.5">
            <Crosshair className="w-5 h-5 text-[#0F1E3C]" />
            <h1 className="text-lg font-bold text-slate-900">Preliminary Scope</h1>
          </div>
          <StatusBadge status={profile.scope_status} size="md" />
        </div>
        <p className="text-sm text-slate-500 max-w-2xl">
          Establish an early working CUI/FCI boundary, in-scope systems, and assessment scope. This is refined as
          controls are implemented — final asset validation happens later in the Final Inventory &amp; Scope phase.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mt-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Scope Name</label>
            <input className="form-input" value={profile.scope_name || ''} disabled={readOnly}
              onChange={(e) => set('scope_name', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Environment Type</label>
            <select className="form-input" value={profile.environment_type} disabled={readOnly}
              onChange={(e) => set('environment_type', e.target.value)}>
              {ENV_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={!!profile.handles_fci} disabled={readOnly}
              onChange={(e) => set('handles_fci', e.target.checked)} /> Handles FCI
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={!!profile.handles_cui} disabled={readOnly}
              onChange={(e) => set('handles_cui', e.target.checked)} /> Handles CUI
          </label>
        </div>

        <div className="grid gap-4 mt-4">
          <RichTextField label="FCI Description" value={profile.fci_description} disabled={readOnly}
            onChange={(v) => set('fci_description', v)} placeholder="Describe the Federal Contract Information handled." />
          <RichTextField label="CUI Description" value={profile.cui_description} disabled={readOnly}
            onChange={(v) => set('cui_description', v)} placeholder="Describe the Controlled Unclassified Information handled." />
          <RichTextField label="Boundary Summary" value={profile.boundary_summary} disabled={readOnly}
            onChange={(v) => set('boundary_summary', v)} placeholder="Summarize the assessment boundary." />
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <TagListField label="Included Locations" values={profile.included_locations || []} disabled={readOnly}
            onChange={(v) => set('included_locations', v)} placeholder="Add a location…" />
          <TagListField label="Excluded Locations" values={profile.excluded_locations || []} disabled={readOnly}
            onChange={(v) => set('excluded_locations', v)} placeholder="Add a location…" />
        </div>

        <div className="grid gap-4 mt-4">
          <RichTextField label="Included Users Summary" value={profile.included_users_summary} disabled={readOnly} onChange={(v) => set('included_users_summary', v)} />
          <RichTextField label="Included Systems Summary" value={profile.included_systems_summary} disabled={readOnly} onChange={(v) => set('included_systems_summary', v)} />
          <RichTextField label="Excluded Systems Summary" value={profile.excluded_systems_summary} disabled={readOnly} onChange={(v) => set('excluded_systems_summary', v)} />
          <RichTextField label="External Service Providers" value={profile.external_service_providers} disabled={readOnly} onChange={(v) => set('external_service_providers', v)} />
          <RichTextField label="Cloud Services Summary" value={profile.cloud_services_summary} disabled={readOnly} onChange={(v) => set('cloud_services_summary', v)} />
          <RichTextField label="Data Flow Summary" value={profile.data_flow_summary} disabled={readOnly} onChange={(v) => set('data_flow_summary', v)} />
        </div>
      </div>

      {/* Scoping Wizard */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-bold text-slate-900 mb-1">Scoping Wizard</h2>
        <p className="text-sm text-slate-500 mb-4">Answer these questions to document how you scoped the environment.</p>
        <div className="space-y-4">
          {SCOPING_QUESTIONS.map((q, i) => (
            <div key={q.key}>
              <label className="block text-sm font-semibold text-slate-700">{i + 1}. {q.label}</label>
              <p className="text-xs text-slate-400 mb-1.5">{q.hint}</p>
              <textarea rows={2} className="form-input" disabled={readOnly}
                value={(profile.wizard_answers || {})[q.key] || ''}
                onChange={(e) => setAnswer(q.key, e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      {!readOnly && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-bold text-slate-700">Before approving final scope</div>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">
            {scopeApprovalChecks.map((check) => (
              <li key={check.label} className={`flex items-center gap-2 text-xs ${check.pass ? 'text-green-700' : 'text-amber-700'}`}>
                {check.pass ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />} {check.label}
              </li>
            ))}
          </ul>
          {saveError && <p className="mt-2 text-xs font-semibold text-red-700">{saveError}</p>}
        </div>
      )}

      {!readOnly && (
        <div className="flex items-center gap-3 flex-wrap">
          <select className="form-input max-w-[180px]" value={profile.scope_status}
            onChange={(e) => set('scope_status', e.target.value)}>
            {SCOPE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => save()} disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Scope
          </button>
          <button onClick={approve} disabled={saving || !scopeCanApprove}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200">
            <CheckCircle2 className="w-4 h-4" /> Approve Scope
          </button>
          {saved && <span className="text-sm text-green-600 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Saved</span>}
          {profile.approved_by && <span className="text-xs text-slate-400">Approved by {profile.approved_by} on {profile.approved_date}</span>}
        </div>
      )}
    </div>
  );
}