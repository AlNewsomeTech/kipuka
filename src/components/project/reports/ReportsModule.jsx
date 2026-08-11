import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Loader2, FileText, ListChecks, ScrollText, Package, Lock, Sparkles, Clock,
  FolderArchive, CheckCircle2, AlertTriangle, Download,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PremiumBadge from '@/components/commercial/PremiumBadge';
import { planHasFeature, PLAN_FEATURES } from '@/lib/planTiers';
import {
  generateExecutiveReadiness, generateGapAssessment, generateEvidenceIndex,
  generatePolicyPackage, generateC3PAOHandoff, generateEvidencePackageZip, previewEvidencePackage,
} from '@/lib/reportGenerators';
import {
  computeReadiness, handoffPrechecks, allPass, FINAL_DOC_WARNING,
  validApprovedSsp, validApprovedPolicies,
} from '@/lib/readinessGate';
import ReadinessPrecheck from '@/components/project/ReadinessPrecheck';

export default function ReportsModule({ project, org, readOnly, currentUser }) {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [preview, setPreview] = useState(null);
  const [gate, setGate] = useState(null); // { report, checks, title }
  const [pkgResult, setPkgResult] = useState(null); // completeness result after building the ZIP

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [assessments, evidence, objectiveLibrary, objectiveLinks, poams, scoping, assets, sspList, policies, sprsList, exports] = await Promise.all([
        base44.entities.ControlAssessment.filter({ project_id: project.id }),
        base44.entities.ProjectEvidence.filter({ project_id: project.id }),
        base44.entities.AssessmentObjectiveLibrary.filter({ active: true, cmmc_level: project.target_cmmc_level }, 'sort_order', 500),
        base44.entities.ObjectiveEvidenceLink.filter({ project_id: project.id }, 'objective_id', 500),
        base44.entities.ProjectPOAM.filter({ project_id: project.id }),
        base44.entities.ScopingProfile.filter({ project_id: project.id }),
        base44.entities.Asset.filter({ project_id: project.id }),
        base44.entities.SystemSecurityPlan.filter({ project_id: project.id }),
        base44.entities.PolicyTemplate.filter({ project_id: project.id }),
        base44.entities.SPRSRecord.filter({ project_id: project.id }),
        base44.entities.ReportExport.filter({ project_id: project.id }, '-generated_date', 15),
      ]);
      setData({ assessments, evidence, objectiveLibrary, objectiveLinks, poams, scoping: scoping[0] || null, assets, ssp: sspList[0] || null, policies: policies.filter((p) => !p.is_master_template), sprs: sprsList[0] || null });
      setHistory(exports);
    } catch (error) {
      setData(null);
      setHistory([]);
      setLoadError(error?.response?.data?.error || error?.message || 'Kipuka could not load the complete final-document data set.');
    }
  }, [project.id, project.target_cmmc_level]);

  useEffect(() => { load(); }, [load]);

  const genBy = currentUser?.full_name || currentUser?.email;
  const hasC3PAO = planHasFeature(org, PLAN_FEATURES.C3PAO_EXPORT);

  const run = async (key, fn) => {
    setBusy(key);
    setActionError(null);
    try {
      await fn();
      setGate(null);
      await load();
    } catch (error) {
      setActionError(error?.response?.data?.error || error?.message || 'The export did not complete. No final output was recorded.');
    } finally {
      setBusy(null);
    }
  };

  if (loadError) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-red-800"><AlertTriangle className="w-4 h-4" /> Final-document data could not be verified</div>
      <p className="text-[13px] text-red-700 mt-2">{loadError}</p>
      <p className="text-xs text-red-600 mt-1">Kipuka will not show empty readiness data or generate a final export from a partial load.</p>
      <button onClick={load} className="mt-3 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-700 hover:bg-red-800">Retry complete load</button>
    </div>
  );

  if (!data) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  const readiness = computeReadiness({ ...data, project });
  const sspApproved = validApprovedSsp(data.ssp);
  const policiesApproved = validApprovedPolicies(data.policies);
  const evidenceIndexReviewed = readiness.evTotal > 0 && readiness.evValidFinal === readiness.evTotal;
  const sprsUploaded = (data.sprs?.evidence_item_ids || []).length > 0;
  const handoffChecks = handoffPrechecks(readiness, {
    sspApproved,
    policiesApproved,
    evidenceIndexReviewed,
    sprsUploaded,
  });
  const finalReadyChecks = handoffPrechecks(readiness, {
    sspApproved,
    policiesApproved,
    evidenceIndexReviewed,
    requireSprs: false,
  });

  // gated=true reports are strict final outputs. Draft/progress reports remain available separately.
  const REPORTS = [
    {
      key: 'exec', icon: Sparkles, title: 'Executive Progress Report', badge: 'Progress',
      desc: 'Generate during implementation — target level, overall status, blockers, readiness %, POA&M and evidence summary.',
      run: () => generateExecutiveReadiness({ project, org, ...data, generatedBy: genBy }),
    },
    {
      key: 'gap', icon: BarChart3, title: 'Draft Gap Assessment', badge: 'Draft',
      desc: 'Implemented / partial / not-implemented controls, evidence gaps, high-risk findings, remediation.',
      run: () => generateGapAssessment({ project, org, ...data, generatedBy: genBy }),
    },
    {
      key: 'final_readiness', icon: Sparkles, title: 'Final Readiness Report', badge: 'Final', gated: true,
      checks: finalReadyChecks,
      desc: 'Gated until controls & evidence are validated — control %, evidence acceptance %, open high-risk POA&M, missing inventory & scope.',
      run: () => generateExecutiveReadiness({ project, org, ...data, isFinal: true, generatedBy: genBy }),
    },
    {
      key: 'evidence', icon: ListChecks, title: 'Evidence Index (CSV)', badge: 'Draft',
      desc: 'CSV of evidence title, type, linked controls, owner, dates, and review status.',
      run: () => generateEvidenceIndex({ project, evidence: data.evidence, generatedBy: genBy }),
    },
    {
      key: 'policy', icon: ScrollText, title: 'Draft Policy Register', badge: 'Draft',
      desc: 'Working register of policy status, mappings, review dates, and independently approved counts. This is not an assessor-ready package.',
      run: () => generatePolicyPackage({ project, org, policies: data.policies, generatedBy: genBy }),
    },
    {
      key: 'c3pao', icon: Package, title: 'C3PAO Handoff Package', premium: true, gated: true,
      checks: handoffChecks, badge: 'Final',
      desc: 'Full assessor package: exec summary, scope, assets, SSP, POA&M, evidence, control matrix, policies, SPRS, risks, contacts.',
      run: async () => {
        const preflight = await previewEvidencePackage({ project });
        if (preflight.blocked || preflight.hard_blockers?.length) {
          throw new Error(`C3PAO handoff is blocked: ${(preflight.hard_blockers || []).join(' ')}`);
        }
        return generateC3PAOHandoff({ project, org, ...data, generatedBy: genBy });
      },
    },
    {
      key: 'evidence_zip', icon: FolderArchive, title: 'C3PAO Evidence Package (ZIP)', premium: true, gated: true,
      checks: handoffChecks, badge: 'Final',
      desc: 'Downloadable ZIP with the actual evidence files organized by NIST control family, plus SSP, policies, an evidence index, and a completeness report.',
      run: async () => { const r = await generateEvidencePackageZip({ project }); setPkgResult(r); },
    },
  ];

  const clickReport = (r, locked) => {
    if (locked) { setPreview(r); return; }
    if (r.gated && !allPass(r.checks)) { setGate(r); return; }
    run(r.key, r.run);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="w-5 h-5 text-[#0F1E3C]" />
          <h1 className="text-lg font-bold text-slate-900">Reports &amp; Exports</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">All exports include Pac-Sec branding, generated date, confidentiality footer, and validation disclaimer.</p>
        <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">
          Progress reports can be generated during implementation. Final readiness documents should be generated
          after controls and evidence have been validated.
        </p>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-[13px] text-red-800">
          <div className="font-bold">Export failed closed</div>
          <p className="mt-1">{actionError}</p>
        </div>
      )}

      {gate && (
        <div className="space-y-3">
          <ReadinessPrecheck title={`${gate.title} — Readiness Pre-Check`} checks={gate.checks} warning={FINAL_DOC_WARNING} />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setGate(null)}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">Return to Implementation Checklist</button>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          const locked = r.premium && !hasC3PAO;
          return (
            <div key={r.key} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Icon className="w-4.5 h-4.5 text-[#0F1E3C]" />
                <h3 className="text-sm font-bold text-slate-800">{r.title}</h3>
                {r.badge && <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${r.badge === 'Final' ? 'bg-green-100 text-green-700' : r.badge === 'Progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{r.badge}</span>}
                {r.premium && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">Premium</span>}
              </div>
              <p className="text-xs text-slate-500 flex-1">{r.desc}</p>
              {locked && <div className="mt-2"><PremiumBadge locked label="Premium L2 Readiness" /></div>}
              <button
                onClick={() => clickReport(r, locked)}
                disabled={busy === r.key}
                className={`mt-3 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold ${locked ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'text-white bg-[#0F1E3C] hover:bg-[#152a52]'} disabled:opacity-60`}>
                {locked ? <><Lock className="w-4 h-4" /> Preview (Premium)</>
                  : busy === r.key ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                  : <><FileText className="w-4 h-4" /> Generate</>}
              </button>
            </div>
          );
        })}
      </div>

      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 text-sm font-bold text-slate-800">Recent Exports</div>
          <div className="divide-y divide-slate-100">
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-700">{h.report_title || h.report_type}</span>
                <span className="ml-auto text-xs text-slate-400">{h.generated_date ? new Date(h.generated_date).toLocaleString() : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {pkgResult && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPkgResult(null)}>
          <div className="bg-white rounded-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 mb-1">
              <FolderArchive className="w-5 h-5 text-[#0F1E3C]" />
              <h3 className="text-base font-bold text-slate-800">Evidence Package Generated</h3>
            </div>
            <p className="text-sm text-slate-500">
              {pkgResult.placed_file_count ?? 0} file(s) packed into <span className="font-medium text-slate-700">{pkgResult.root_folder_name}</span>. The ZIP download has started.
            </p>

            {pkgResult.completeness && (
              <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <div className="text-xs text-slate-500">Controls with evidence</div>
                  <div className="font-semibold text-slate-800">{pkgResult.completeness.controls_with_evidence} / {pkgResult.completeness.controls_total}</div>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <div className="text-xs text-slate-500">Evidence accepted</div>
                  <div className="font-semibold text-slate-800">{pkgResult.completeness.evidence_accepted} / {pkgResult.completeness.evidence_total}</div>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <div className="text-xs text-slate-500">Policies included</div>
                  <div className="font-semibold text-slate-800">{pkgResult.completeness.policies_included}</div>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <div className="text-xs text-slate-500">SSP approved</div>
                  <div className="font-semibold text-slate-800">{pkgResult.completeness.ssp_approved ? 'Yes' : 'No'}</div>
                </div>
              </div>
            )}

            {pkgResult.warnings?.length > 0 ? (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 mb-1.5">
                  <AlertTriangle className="w-4 h-4" /> {pkgResult.warnings.length} completeness warning(s)
                </div>
                <ul className="text-xs text-amber-700 space-y-1 list-disc pl-4">
                  {pkgResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
                <p className="text-[11px] text-amber-600 mt-2">The package was still generated. Review these items and regenerate before formal submission. Generated content must be reviewed by Pac-Sec staff.</p>
              </div>
            ) : (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-1.5 text-sm font-semibold text-green-700">
                <CheckCircle2 className="w-4 h-4" /> No completeness warnings.
              </div>
            )}

            <div className="flex items-center gap-2 mt-5">
              {pkgResult.zip_file_url && (
                <a href={pkgResult.zip_file_url} download className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
                  <Download className="w-4 h-4" /> Download Again
                </a>
              )}
              <button onClick={() => setPkgResult(null)} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">Close</button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-xl w-full max-w-md p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-purple-500" />
            </div>
            <PremiumBadge locked label="Premium L2 Readiness" />
            <h3 className="text-base font-bold text-slate-800 mt-2">{preview.title}</h3>
            <p className="text-sm text-slate-500 mt-1.5">{preview.desc}</p>
            <p className="text-xs text-slate-400 mt-3">This is a read-only preview. Upgrade to Premium L2 Readiness or Pac-Sec Managed to generate the full {preview.title}.</p>
            <div className="flex items-center justify-center gap-2 mt-5">
              <a href="/help/contact" className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">Contact Pac-Sec to Upgrade</a>
              <button onClick={() => setPreview(null)} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}