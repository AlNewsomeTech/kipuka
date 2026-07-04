import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, LayoutDashboard, ClipboardCheck, Crosshair, Boxes, ShieldCheck,
  FolderArchive, FileStack, ListChecks, BookMarked, BadgeCheck, FileBarChart,
  PlayCircle, Download, CheckCircle2, Circle, ArrowLeft, ShieldAlert, Sparkles, Radar,
} from 'lucide-react';
import { postureStyle, severityStyle } from '@/lib/acolyte';
import { useOrg } from '@/lib/orgContext';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { DemoBanner, DemoSection, ValueStatement, SampleChip, downloadDemoReport } from '@/components/demo/DemoPrimitives';
import ProductTourModal from '@/components/demo/ProductTourModal';
import {
  DEMO_ORG, DEMO_EXEC, DEMO_ONBOARDING, DEMO_SCOPING, DEMO_ASSETS, DEMO_ASSESSMENT,
  DEMO_EVIDENCE, DEMO_SSP, DEMO_POAM, DEMO_POLICIES, DEMO_SPRS, DEMO_REPORTS, DEMO_ACOLYTE,
} from '@/lib/demoData';

const toneMap = {
  green: 'bg-green-50 text-green-700 border-green-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
};

export default function DemoWorkspace() {
  const { isPlatformAdmin } = useOrg();
  const navigate = useNavigate();
  const [tourOpen, setTourOpen] = useState(false);

  if (!isPlatformAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-16">
        <EmptyState icon={ShieldAlert} title="Restricted area" description="The Demo Workspace is available to Pac-Sec administrators and support staff only." />
      </div>
    );
  }

  const exitTo = (path) => { setTourOpen(false); navigate(path); };

  return (
    <div className="max-w-5xl mx-auto">
      <DemoBanner />

      {/* Header */}
      <div className="bg-[#0F1E3C] rounded-xl p-6 mb-5 text-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5" />
              <h1 className="text-xl font-bold">{DEMO_ORG.organization_name}</h1>
              <span className="text-xs font-semibold bg-white/15 px-2 py-0.5 rounded-full">{DEMO_ORG.short_name}</span>
            </div>
            <p className="text-white/70 text-sm">{DEMO_ORG.industry} · {DEMO_ORG.project_name}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-white/70">
              <span>Target: <b className="text-white">{DEMO_ORG.target_cmmc_level}</b></span>
              <span>Path: <b className="text-white">{DEMO_ORG.assessment_path}</b></span>
              <span>UEI: <b className="text-white">{DEMO_ORG.uei}</b></span>
              <span>CAGE: <b className="text-white">{DEMO_ORG.cage_code}</b></span>
              <span>Tier: <b className="text-white">{DEMO_ORG.subscription_tier}</b></span>
              <span>Status: <b className="text-white">{DEMO_ORG.project_status}</b></span>
            </div>
            <p className="text-[11px] text-white/50 mt-3">
              Prepared by {DEMO_ORG.prepared_by} · Powered by {DEMO_ORG.powered_by}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => setTourOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white text-[#0F1E3C] rounded-lg hover:bg-slate-100">
              <PlayCircle className="w-4 h-4" /> Start Product Tour
            </button>
            <button onClick={() => navigate('/saas-admin')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white/10 text-white rounded-lg hover:bg-white/20">
              <ArrowLeft className="w-4 h-4" /> Return to SaaS Admin
            </button>
          </div>
        </div>
      </div>

      {/* 1. Executive Dashboard */}
      <DemoSection id="exec" title="Executive Dashboard" icon={LayoutDashboard}>
        <div className="flex flex-col sm:flex-row items-center gap-5 mb-4">
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-slate-100" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-blue-500" strokeWidth="3"
                strokeDasharray={`${DEMO_EXEC.overallReadiness} 100`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-slate-900">{DEMO_EXEC.overallReadiness}%</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wide">Readiness</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 flex-1 w-full">
            <MetricTile label="Controls complete" value={`${DEMO_EXEC.controlsComplete} / ${DEMO_EXEC.controlsTotal}`} />
            <MetricTile label="Needing evidence" value={DEMO_EXEC.controlsNeedingEvidence} />
            <MetricTile label="Open POA&M items" value={DEMO_EXEC.openPoam} />
            <MetricTile label="High-risk blockers" value={DEMO_EXEC.highRiskBlockers} tone="red" />
            <MetricTile label="SSP status" value={DEMO_EXEC.sspStatus} small />
            <MetricTile label="Evidence package" value={DEMO_EXEC.evidencePackageStatus} small />
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600 mb-4">
          <BadgeCheck className="w-4 h-4 text-slate-400" /> SPRS status: <b className="text-slate-800">{DEMO_EXEC.sprsStatus}</b>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Next recommended steps</div>
          <ul className="space-y-1.5">
            {DEMO_EXEC.nextSteps.map((s) => (
              <li key={s} className="flex items-center gap-2 text-sm text-slate-700">
                <Circle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" /> {s}
              </li>
            ))}
          </ul>
        </div>
        <ValueStatement>{DEMO_EXEC.valueStatement}</ValueStatement>
      </DemoSection>

      {/* 2. Onboarding */}
      <DemoSection id="onboarding" title="Project Onboarding" icon={ClipboardCheck} darkHorizon>
        <div className="grid sm:grid-cols-2 gap-2">
          {DEMO_ONBOARDING.items.map((it) => (
            <div key={it.label} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> {it.label}
            </div>
          ))}
        </div>
        <ValueStatement>{DEMO_ONBOARDING.explanation}</ValueStatement>
      </DemoSection>

      {/* 3. Scoping */}
      <DemoSection id="scoping" title="Scoping Module" icon={Crosshair} darkHorizon>
        <div className="space-y-2 mb-4">
          {DEMO_SCOPING.rows.map((r) => (
            <div key={r.label} className="grid sm:grid-cols-3 gap-1 border-b border-slate-100 pb-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{r.label}</div>
              <div className="sm:col-span-2 text-sm text-slate-700">{r.value}</div>
            </div>
          ))}
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">CUI Boundary Summary</div>
          <p className="text-sm text-slate-700 leading-relaxed">{DEMO_SCOPING.boundarySummary}</p>
        </div>
        <ValueStatement>{DEMO_SCOPING.valueStatement}</ValueStatement>
      </DemoSection>

      {/* 4. Asset Inventory */}
      <DemoSection id="assets" title="Asset Inventory" icon={Boxes}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-3">Asset</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Scope</th>
                <th className="py-2">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {DEMO_ASSETS.rows.map((a) => (
                <tr key={a.name}>
                  <td className="py-2 pr-3 font-medium text-slate-800">{a.name}</td>
                  <td className="py-2 pr-3 text-slate-600">{a.type}</td>
                  <td className="py-2 pr-3">
                    <span className={`text-xs font-semibold ${a.scope === 'In Scope' ? 'text-green-700' : 'text-slate-400'}`}>{a.scope}</span>
                  </td>
                  <td className="py-2 text-slate-600 text-xs">{a.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ValueStatement>{DEMO_ASSETS.valueStatement}</ValueStatement>
      </DemoSection>

      {/* 5. Control Assessment */}
      <DemoSection id="assessment" title="Control Assessment" icon={ShieldCheck}>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          {DEMO_ASSESSMENT.summary.map((s) => (
            <div key={s.label} className={`border rounded-lg p-3 text-center ${toneMap[s.tone]}`}>
              <div className="text-xl font-bold">{s.count}</div>
              <div className="text-[11px] font-medium">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {DEMO_ASSESSMENT.cards.map((c) => (
            <div key={c.control_id} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs font-mono font-semibold text-slate-500">{c.control_id}</span>
                <SampleChip />
              </div>
              <div className="text-sm font-semibold text-slate-800 mb-2">{c.control_title}</div>
              <div className="space-y-1 text-xs text-slate-600">
                <div>Status: <StatusBadge status={c.status} size="xs" /></div>
                <div>Owner: <b className="text-slate-700">{c.owner}</b></div>
                <div>Evidence: <StatusBadge status={c.evidence_status} size="xs" /></div>
                {c.linked_poam && <div className="text-amber-700 font-medium">Linked POA&M: Yes</div>}
              </div>
              <p className="text-xs text-slate-500 italic mt-2 leading-relaxed">"{c.notes}"</p>
            </div>
          ))}
        </div>
        <ValueStatement>{DEMO_ASSESSMENT.valueStatement}</ValueStatement>
      </DemoSection>

      {/* 6. Evidence Vault */}
      <DemoSection id="evidence" title="Evidence Vault" icon={FolderArchive}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-3">Evidence</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Controls</th>
                <th className="py-2 pr-3">Owner</th>
                <th className="py-2 pr-3">Review</th>
                <th className="py-2 pr-3">Date</th>
                <th className="py-2">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {DEMO_EVIDENCE.items.map((e) => (
                <tr key={e.title}>
                  <td className="py-2 pr-3 font-medium text-slate-800">{e.title}</td>
                  <td className="py-2 pr-3 text-slate-600 text-xs">{e.type}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-slate-500">{e.controls}</td>
                  <td className="py-2 pr-3 text-slate-600 text-xs">{e.owner}</td>
                  <td className="py-2 pr-3"><StatusBadge status={e.review_status} size="xs" /></td>
                  <td className="py-2 pr-3 text-slate-500 text-xs">{e.evidence_date}</td>
                  <td className="py-2 text-slate-500 text-xs">{e.expiration_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ValueStatement>{DEMO_EVIDENCE.valueStatement}</ValueStatement>
      </DemoSection>

      {/* 7. SSP Builder */}
      <DemoSection id="ssp" title="SSP Builder" icon={FileStack} darkHorizon>
        <div className="grid sm:grid-cols-2 gap-2 mb-4">
          {DEMO_SSP.sections.map((s) => (
            <div key={s.label} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <span className="text-sm text-slate-700">{s.label}</span>
              <StatusBadge status={s.status.includes('%') || s.status === 'In progress' ? 'In Progress' : s.status} size="xs" />
            </div>
          ))}
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Sample Implementation Statement · AC.L2-3.1.1</div>
          <p className="text-sm text-slate-700 leading-relaxed">{DEMO_SSP.sampleStatement}</p>
        </div>
        <ValueStatement>{DEMO_SSP.valueStatement}</ValueStatement>
      </DemoSection>

      {/* 8. POA&M Tracker */}
      <DemoSection id="poam" title="POA&M Tracker" icon={ListChecks}>
        <div className="space-y-2">
          {DEMO_POAM.items.map((p) => (
            <div key={p.title} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-sm font-semibold text-slate-800">{p.title}</span>
                <SampleChip />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                <span>Control: <b className="font-mono text-slate-700">{p.control}</b></span>
                <span>Risk: <StatusBadge status={p.risk === 'High' ? 'Open' : 'Mitigating'} size="xs" /></span>
                <span>Owner: <b className="text-slate-700">{p.owner}</b></span>
                <span>Status: <StatusBadge status={p.status} size="xs" /></span>
                <span>Target: <b className="text-slate-700">{p.target}</b></span>
              </div>
            </div>
          ))}
        </div>
        <ValueStatement>{DEMO_POAM.valueStatement}</ValueStatement>
      </DemoSection>

      {/* 9. Policy Library */}
      <DemoSection id="policies" title="Policy Library" icon={BookMarked} darkHorizon>
        <div className="grid sm:grid-cols-2 gap-2">
          {DEMO_POLICIES.items.map((p) => (
            <div key={p.name} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <span className="text-sm text-slate-700">{p.name}</span>
              <StatusBadge status={p.status} size="xs" />
            </div>
          ))}
        </div>
        <ValueStatement>{DEMO_POLICIES.valueStatement}</ValueStatement>
      </DemoSection>

      {/* 10. PIEE / SPRS Tracker */}
      <DemoSection id="sprs" title="PIEE / SPRS Tracker" icon={BadgeCheck}>
        <div className="grid sm:grid-cols-2 gap-2">
          {DEMO_SPRS.rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between border-b border-slate-100 py-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{r.label}</span>
              <span className="text-sm font-medium text-slate-800">{r.value}</span>
            </div>
          ))}
        </div>
        <ValueStatement>{DEMO_SPRS.valueStatement}</ValueStatement>
      </DemoSection>

      {/* 10b. ACOLYTE Operations */}
      <DemoSection id="acolyte" title="ACOLYTE Operations (Managed Cyber Readiness)" icon={Radar}>
        <div className="flex flex-col sm:flex-row items-center gap-5 mb-4">
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-slate-100" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-blue-500" strokeWidth="3"
                strokeDasharray={`${DEMO_ACOLYTE.profile.readiness_score} 100`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-slate-900">{DEMO_ACOLYTE.profile.readiness_score}%</span>
              <span className="text-[9px] text-slate-500 uppercase tracking-wide">Readiness</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1 w-full">
            <MetricTile label="Service tier" value={DEMO_ACOLYTE.profile.service_tier} small />
            <MetricTile label="Service status" value={DEMO_ACOLYTE.profile.service_status} small />
            <MetricTile label="Review cadence" value={DEMO_ACOLYTE.profile.review_cadence} small />
            <MetricTile label="Service lead" value={DEMO_ACOLYTE.profile.pacsec_service_lead} small />
            <MetricTile label="Last review" value={DEMO_ACOLYTE.profile.last_review_date} small />
            <MetricTile label="Next review" value={DEMO_ACOLYTE.profile.next_review_target_date} small />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {DEMO_ACOLYTE.posture.map((p) => (
            <div key={p.label} className={`border rounded-lg px-3 py-2 flex items-center justify-between ${postureStyle(p.status)}`}>
              <span className="text-xs font-medium">{p.label}</span>
              <span className="text-[11px] font-bold">{p.status}</span>
            </div>
          ))}
        </div>

        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Sample Cyber Findings</div>
        <div className="space-y-2 mb-4">
          {DEMO_ACOLYTE.findings.map((f) => (
            <div key={f.title} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-sm font-semibold text-slate-800">{f.title}</span>
                <SampleChip />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 items-center">
                <span>Category: <b className="text-slate-700">{f.category}</b></span>
                <span className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${severityStyle(f.severity)}`}>{f.severity}</span>
                <StatusBadge status={f.status} size="xs" />
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Incident Readiness</div>
        <div className="grid sm:grid-cols-2 gap-2">
          {DEMO_ACOLYTE.incident.map((r) => (
            <div key={r.label} className="flex items-center justify-between border-b border-slate-100 py-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{r.label}</span>
              <span className="text-sm font-medium text-slate-800">{r.value}</span>
            </div>
          ))}
        </div>
        <ValueStatement>{DEMO_ACOLYTE.valueStatement}</ValueStatement>
      </DemoSection>

      {/* 11. Reports */}
      <DemoSection id="reports" title="Reports" icon={FileBarChart}>
        <div className="flex flex-wrap gap-2 mb-4">
          {DEMO_REPORTS.available.map((r) => (
            <button
              key={r}
              onClick={() => downloadDemoReport(r, [`This is a sample "${r}" for Acme Defense Components (ADC).`, 'All values shown are fictional demonstration data.'])}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-white"
            >
              <Download className="w-3.5 h-3.5" /> {r}
            </button>
          ))}
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {DEMO_REPORTS.previews.map((p) => (
            <div key={p.title} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <FileBarChart className="w-4 h-4 text-[#0F1E3C]" />
                <span className="text-sm font-semibold text-slate-800">{p.title}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          All demo exports are watermarked <b>"DEMO ONLY"</b> and cannot be submitted, affirmed, or sent externally.
        </div>
        <ValueStatement>{DEMO_REPORTS.valueStatement}</ValueStatement>
      </DemoSection>

      {/* 12. Product Tour launcher */}
      <div className="bg-gradient-to-r from-[#0F1E3C] to-[#1E2D4A] rounded-xl p-6 text-center text-white mb-5">
        <Sparkles className="w-6 h-6 mx-auto mb-2 text-white/80" />
        <h2 className="text-lg font-bold mb-1">Guided Product Tour</h2>
        <p className="text-white/70 text-sm mb-4 max-w-lg mx-auto">
          Walk a prospect through the full CMMC readiness journey — onboarding to assessor handoff — in ten simple steps.
        </p>
        <button onClick={() => setTourOpen(true)} className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-white text-[#0F1E3C] rounded-lg hover:bg-slate-100">
          <PlayCircle className="w-4 h-4" /> Start Product Tour
        </button>
      </div>

      <ProductTourModal open={tourOpen} onClose={() => setTourOpen(false)} onExit={exitTo} />
    </div>
  );
}

function MetricTile({ label, value, tone, small }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
      <div className="text-[11px] text-slate-500 font-medium mb-0.5">{label}</div>
      <div className={`font-bold text-slate-900 ${small ? 'text-sm' : 'text-lg'} ${tone === 'red' ? 'text-red-600' : ''}`}>{value}</div>
    </div>
  );
}