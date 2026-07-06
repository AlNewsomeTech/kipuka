import { useState, useEffect, useCallback, useMemo } from 'react';
import { ScrollText, Loader2, Plus, FileDown, Package, Library, CheckCircle2, XCircle, ShieldCheck, Upload } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';
import { buildPolicySeed, mergePolicyBody } from '@/lib/policyTemplates';
import { buildFamilyDocSeed, auditFamilyCoverage } from '@/lib/policyFamilyCoverage';
import { generatePolicyPackage } from '@/lib/reportGenerators';
import { createReportPdf, safeFileName, BRAND } from '@/lib/reportBranding';
import { buildMergeMap, resolveMergeVariables } from '@/lib/mergeVariables';
import PolicyEditorModal from './PolicyEditorModal';
import TemplatePickerModal from './TemplatePickerModal';
import PolicyImportModal from '@/components/policies/PolicyImportModal';
import PolicyLibraryGroups from '@/components/policies/PolicyLibraryGroups';

export default function PoliciesModule({ project, org, readOnly, currentUser }) {
  const [templates, setTemplates] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [picker, setPicker] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [tpl, pol, cp] = await Promise.all([
      base44.entities.PolicyTemplate.filter({ is_master_template: true }).catch(() => []),
      base44.entities.PolicyTemplate.filter({ project_id: project.id }).catch(() => []),
      project.organization_id
        ? base44.entities.CompanyProfile.filter({ organization_id: project.organization_id }).catch(() => [])
        : Promise.resolve([]),
    ]);
    setTemplates(tpl);
    setPolicies(pol.filter((p) => !p.is_master_template));
    setCompanyProfile(cp[0] || null);
    setLoading(false);
  }, [project.id, project.organization_id]);

  useEffect(() => { load(); }, [load]);

  const seedTemplates = async () => {
    setSeeding(true);
    await base44.entities.PolicyTemplate.bulkCreate(buildPolicySeed());
    await load();
    setSeeding(false);
  };

  const level = project.target_cmmc_level === 'Level 1' ? 'Level 1' : 'Level 2';
  const coverage = useMemo(() => auditFamilyCoverage(policies, level), [policies, level]);
  const missingFamilies = coverage.filter((c) => !c.hasPolicy || !c.hasProcedure);

  // Clone the family-complete Policy + Procedure set for every family that's
  // missing one, so all 14 families (or 6 for L1) have both documents.
  const generateFamilyDocs = async () => {
    setSeeding(true);
    const today = new Date().toISOString().slice(0, 10);
    const merge = {
      organization_name: org?.organization_name || '', environment: project.assessment_path || '',
      owner: currentUser?.full_name || currentUser?.email || '', effective_date: today, version: '1.0',
    };
    const seed = buildFamilyDocSeed(level);
    const toCreate = [];
    coverage.forEach((c) => {
      const need = [];
      if (!c.hasPolicy) need.push('Policy');
      if (!c.hasProcedure) need.push('Procedure');
      need.forEach((kind) => {
        const tpl = seed.find((s) => s.family_code === c.code && s.doc_kind === kind);
        if (!tpl) return;
        toCreate.push({
          organization_id: project.organization_id, project_id: project.id,
          policy_name: tpl.policy_name, policy_category: tpl.policy_category,
          mapped_control_ids: tpl.mapped_control_ids || [],
          policy_body: mergePolicyBody(tpl.policy_body, merge),
          version: '1.0', owner: merge.owner, effective_date: today,
          approval_status: 'Draft', is_master_template: false,
          family_code: tpl.family_code, doc_kind: tpl.doc_kind,
        });
      });
    });
    if (toCreate.length) await base44.entities.PolicyTemplate.bulkCreate(toCreate);
    await load();
    setSeeding(false);
  };

  const cloneTemplate = async (tpl) => {
    const today = new Date().toISOString().slice(0, 10);
    const mergeMap = buildMergeMap({
      companyProfile, org, project,
      owner: currentUser?.full_name || currentUser?.email || '',
    });
    const { body, unresolved } = resolveMergeVariables(tpl.policy_body, mergeMap);
    await base44.entities.PolicyTemplate.create({
      organization_id: project.organization_id, project_id: project.id,
      policy_name: tpl.policy_name, policy_category: tpl.policy_category,
      mapped_control_ids: tpl.mapped_control_ids || [],
      policy_body: body,
      version: '1.0', owner: mergeMap.owner || '', effective_date: today,
      approval_status: 'Draft', is_master_template: false,
      family_code: tpl.family_code || '', doc_kind: tpl.doc_kind || '',
      unresolved_placeholders: unresolved.join(', '),
      unresolved_placeholders_count: unresolved.length,
    });
    setPicker(false);
    load();
  };

  const remove = async (id) => { await base44.entities.PolicyTemplate.delete(id); load(); };

  const exportPolicy = (p) => {
    const r = createReportPdf({ title: p.policy_name, project, org, generatedBy: currentUser?.full_name || currentUser?.email });
    r.label('Status', p.approval_status);
    r.label('Owner', p.owner || '—');
    r.label('Version', p.version || '1.0');
    r.label('Mapped Controls', (p.mapped_control_ids || []).join(', ') || '—');
    r.space();
    r.text(p.policy_body || '—');
    r.disclaimerNote(BRAND.disclaimer);
    r.save(`${safeFileName(project.project_name)}_${safeFileName(p.policy_name)}.pdf`);
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <ScrollText className="w-5 h-5 text-[#0F1E3C]" />
            <h1 className="text-lg font-bold text-slate-900">Policy Library</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            {policies.length > 0 && (
              <button onClick={() => generatePolicyPackage({ project, org, policies, generatedBy: currentUser?.full_name || currentUser?.email })}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200">
                <Package className="w-4 h-4" /> Export Package
              </button>
            )}
            {!readOnly && (
              <button onClick={() => setImporting(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200">
                <Upload className="w-4 h-4" /> Import Policies
              </button>
            )}
            {!readOnly && (
              <button onClick={() => setPicker(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
                <Plus className="w-4 h-4" /> New from Template
              </button>
            )}
          </div>
        </div>
        {templates.length === 0 && !readOnly && (
          <div className="mt-4 flex items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <span className="text-sm text-blue-700">Load the default CMMC policy template set to start building policies.</span>
            <button onClick={seedTemplates} disabled={seeding}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0F1E3C] disabled:opacity-60">
              {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Library className="w-3.5 h-3.5" />} Load Templates
            </button>
          </div>
        )}
      </div>

      {/* Full-family coverage audit (14 families for L2, 6 for L1) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <ShieldCheck className="w-4 h-4" /> {level} Policy &amp; Procedure Coverage
            <span className="text-xs font-normal text-slate-500">({coverage.filter((c) => c.hasPolicy && c.hasProcedure).length}/{coverage.length} families complete)</span>
          </div>
          {!readOnly && missingFamilies.length > 0 && (
            <button onClick={generateFamilyDocs} disabled={seeding}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-60">
              {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Generate {missingFamilies.length} missing document set(s)
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {coverage.map((c) => (
            <div key={c.code} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs">
              <span className="font-mono font-bold text-slate-500 w-6">{c.code}</span>
              <span className="flex-1 truncate text-slate-600">{c.name}</span>
              <span title="Policy">{c.hasPolicy ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-slate-300" />}</span>
              <span title="Procedure">{c.hasProcedure ? <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> : <XCircle className="w-3.5 h-3.5 text-slate-300" />}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-2">Green = Policy present · Blue = Procedure present. Each generated document lists which controls it satisfies.</p>
      </div>

      {policies.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          No policies created yet. {!readOnly && 'Use "New from Template", "Import Policies", or "Generate missing document set(s)" above.'}
        </div>
      ) : (
        <PolicyLibraryGroups
          policies={policies}
          renderActions={(p) => (
            <div className="flex items-center gap-2">
              <button onClick={() => exportPolicy(p)} className="text-slate-400 hover:text-slate-700" title="Export policy"><FileDown className="w-4 h-4" /></button>
              {!readOnly && <button onClick={() => setEditing(p)} className="text-xs font-semibold text-[#0F1E3C] hover:underline">Edit</button>}
            </div>
          )}
        />
      )}

      {picker && (
        <TemplatePickerModal templates={templates} onClone={cloneTemplate} onClose={() => setPicker(false)} />
      )}
      {importing && (
        <PolicyImportModal mode="project" project={project} org={org} currentUser={currentUser}
          onClose={() => setImporting(false)} onImported={() => { setImporting(false); load(); }} />
      )}
      {editing && (
        <PolicyEditorModal policy={editing} onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }} onDelete={() => { remove(editing.id); setEditing(null); }} />
      )}
    </div>
  );
}