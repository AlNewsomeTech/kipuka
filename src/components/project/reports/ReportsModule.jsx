import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Loader2, FileText, ListChecks, ScrollText, Package, Lock, Sparkles, Clock,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DarkHorizonBadge from '@/components/ui/DarkHorizonBadge';
import PremiumBadge from '@/components/commercial/PremiumBadge';
import { tierHasFeature, FEATURES } from '@/lib/subscriptionTiers';
import {
  generateExecutiveReadiness, generateGapAssessment, generateEvidenceIndex,
  generatePolicyPackage, generateC3PAOHandoff,
} from '@/lib/reportGenerators';

export default function ReportsModule({ project, org, readOnly, currentUser }) {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(null);
  const [preview, setPreview] = useState(null);

  const load = useCallback(async () => {
    const [assessments, evidence, poams, scoping, assets, sspList, policies, exports] = await Promise.all([
      base44.entities.ControlAssessment.filter({ project_id: project.id }).catch(() => []),
      base44.entities.ProjectEvidence.filter({ project_id: project.id }).catch(() => []),
      base44.entities.ProjectPOAM.filter({ project_id: project.id }).catch(() => []),
      base44.entities.ScopingProfile.filter({ project_id: project.id }).catch(() => []),
      base44.entities.Asset.filter({ project_id: project.id }).catch(() => []),
      base44.entities.SystemSecurityPlan.filter({ project_id: project.id }).catch(() => []),
      base44.entities.PolicyTemplate.filter({ project_id: project.id }).catch(() => []),
      base44.entities.ReportExport.filter({ project_id: project.id }, '-generated_date', 15).catch(() => []),
    ]);
    setData({ assessments, evidence, poams, scoping: scoping[0] || null, assets, ssp: sspList[0] || null, policies: policies.filter((p) => !p.is_master_template) });
    setHistory(exports);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const genBy = currentUser?.full_name || currentUser?.email;
  const hasC3PAO = tierHasFeature(org?.subscription_tier, FEATURES.C3PAO_HANDOFF);

  const run = async (key, fn) => {
    setBusy(key);
    try { await fn(); } finally { setBusy(null); load(); }
  };

  if (!data) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  const REPORTS = [
    {
      key: 'exec', icon: Sparkles, title: 'Executive Readiness Report',
      desc: 'Target level, overall status, blockers, readiness %, POA&M and evidence summary, next steps.',
      run: () => generateExecutiveReadiness({ project, org, ...data, generatedBy: genBy }),
    },
    {
      key: 'gap', icon: BarChart3, title: 'Gap Assessment Report',
      desc: 'Implemented / partial / not-implemented controls, evidence gaps, high-risk findings, remediation.',
      run: () => generateGapAssessment({ project, org, ...data, generatedBy: genBy }),
    },
    {
      key: 'evidence', icon: ListChecks, title: 'Evidence Index',
      desc: 'CSV of evidence title, type, linked controls, owner, dates, and review status.',
      run: () => generateEvidenceIndex({ project, evidence: data.evidence, generatedBy: genBy }),
    },
    {
      key: 'policy', icon: ScrollText, title: 'Policy Package',
      desc: 'Approved policies, status, mapped controls, and review dates.',
      run: () => generatePolicyPackage({ project, org, policies: data.policies, generatedBy: genBy }),
    },
    {
      key: 'c3pao', icon: Package, title: 'C3PAO Handoff Package', premium: true,
      desc: 'Full assessor package: exec summary, scope, assets, SSP, POA&M, evidence, control matrix, policies, SPRS, risks, contacts.',
      run: () => generateC3PAOHandoff({ project, org, ...data, generatedBy: genBy }),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="w-5 h-5 text-[#0F1E3C]" />
          <h1 className="text-lg font-bold text-slate-900">Reports &amp; Exports</h1>
          <DarkHorizonBadge />
        </div>
        <p className="text-sm text-slate-500 mt-1">All exports include Pac-Sec branding, generated date, confidentiality footer, and validation disclaimer.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          const locked = r.premium && !hasC3PAO;
          return (
            <div key={r.key} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className="w-4.5 h-4.5 text-[#0F1E3C]" />
                <h3 className="text-sm font-bold text-slate-800">{r.title}</h3>
                {r.premium && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">Premium</span>}
              </div>
              <p className="text-xs text-slate-500 flex-1">{r.desc}</p>
              {locked && <div className="mt-2"><PremiumBadge locked label="Premium L2 Readiness" /></div>}
              <button
                onClick={() => locked ? setPreview(r) : run(r.key, r.run)}
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