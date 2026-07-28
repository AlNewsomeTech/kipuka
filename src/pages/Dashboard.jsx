import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2, ShieldCheck, Image, FileText, AlertTriangle, ListChecks,
  Clock, CheckCircle2, AlertCircle, Package, Layers, FileBarChart, BadgeCheck,
  ArrowRight,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { loadProgressMap, mergeControl } from '@/lib/controlProgress';
import { useClient } from '@/lib/clientContext';
import { useAuth } from '@/lib/AuthContext';
import { useOrg } from '@/lib/orgContext';
import OrgDashboard from '@/components/dashboard/OrgDashboard';
import AdminClientSummary from '@/components/dashboard/AdminClientSummary';
import StatCard from '@/components/StatCard';
import ProgressBar from '@/components/ProgressBar';
import StatusBadge from '@/components/StatusBadge';
import WarningBanner from '@/components/WarningBanner';
import EmptyState from '@/components/EmptyState';
import ProgressSummary from '@/components/dashboard/ProgressSummary';
import ClientProgressOverview from '@/components/dashboard/ClientProgressOverview';
import WeeklyReportModal from '@/components/dashboard/WeeklyReportModal';

export default function Dashboard() {
  const { selectedClient, selectedClientId } = useClient();
  const { user } = useAuth();
  const { isPlatformAdmin, isPacSec, selectedOrgId, selectedOrg } = useOrg();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ controls: [], l2Controls: [], tasks: [], screenshots: [], documents: [], evidence: [], validations: [] });
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (!selectedClientId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      base44.entities.CMMCControl.filter({ level: 'Level 1' }).catch(() => []),
      base44.entities.CMMCControl.filter({ level: 'Level 2' }).catch(() => []),
      base44.entities.DeploymentTask.filter({ client_id: selectedClientId }).catch(() => []),
      base44.entities.Screenshot.filter({ client_id: selectedClientId }).catch(() => []),
      base44.entities.GeneratedDocument.filter({ client_id: selectedClientId }).catch(() => []),
      base44.entities.EvidenceItem.filter({ client_id: selectedClientId }).catch(() => []),
      base44.entities.ControlValidation.filter({ client_id: selectedClientId }).catch(() => []),
      loadProgressMap(selectedClientId),
    ]).then(([l1Controls, l2Controls, tasks, screenshots, documents, evidence, validations, progress]) => {
      setStats({
        controls: l1Controls.map(c => mergeControl(c, progress[c.control_id])),
        l2Controls: l2Controls.map(c => mergeControl(c, progress[c.control_id])),
        tasks, screenshots, documents, evidence, validations,
      });
      setLoading(false);
    });
  }, [selectedClientId]);

  if (!isPlatformAdmin && !isPacSec && selectedOrgId) {
    return <OrgDashboard organizationId={selectedOrgId} orgName={selectedOrg?.organization_name} />;
  }

  if (!selectedClient) {
    if (user?.role === 'admin' || user?.role === 'technician') {
      return <AdminClientSummary />;
    }
    return <EmptyState icon={Building2} title="No client selected" description="Create a client in the Clients section to get started." action={<Link to="/clients" className="text-sm font-semibold text-blue-600 hover:underline">Go to Clients →</Link>} />;
  }

  if (loading) {
    return (
      <div className="space-y-5" aria-busy="true">
        <div className="h-44 animate-pulse rounded-2xl bg-slate-200/70" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/60" />)}
        </div>
      </div>
    );
  }

  const l1Controls = stats.controls;
  const l1Complete = l1Controls.filter(c => c.status === 'Complete' || c.ready_for_assessment).length;
  const l1Pct = l1Controls.length ? (l1Complete / l1Controls.length) * 100 : 0;
  const l2Controls = stats.l2Controls;
  const l2Complete = l2Controls.filter(c => c.status === 'Complete' || c.ready_for_assessment).length;
  const l2Pct = l2Controls.length ? (l2Complete / l2Controls.length) * 100 : 0;

  const openTasks = stats.tasks.filter(t => t.status !== 'Complete' && t.status !== 'Reviewed');
  const blockers = stats.tasks.filter(t => t.status === 'Blocker' || t.priority === 'Critical');
  const missingScreenshots = stats.tasks.filter(t => t.required_screenshots && t.status !== 'Complete').length;
  const missingExports = stats.tasks.filter(t => t.required_exports && t.status !== 'Complete').length;
  const evidenceItems = stats.evidence.length + stats.screenshots.length;
  const recentScreenshots = [...stats.screenshots].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5);
  const recentDocs = [...stats.documents].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5);
  const currentPhase = stats.tasks.find(t => t.status === 'In Progress')?.phase || 'Not Started';
  const approvedEvidenceCount = stats.evidence.filter(e => e.reviewer_status === 'Approved').length + stats.screenshots.filter(s => s.reviewer_status === 'Approved' || s.validation_status === 'Validated').length;
  const approvedDocCount = stats.documents.filter(d => d.status === 'Approved' || d.status === 'Published').length;
  const docsWithPlaceholders = stats.documents.filter(d => /\[[A-Z][A-Z_0-9]{2,}\]/.test(d.body_content || '') && !d.placeholder_waived).length;
  const validatedControls = stats.validations.filter(v => v.status === 'Validated' || v.validation_status === 'Validated').length;
  const packageReady = l1Pct >= 100 && approvedEvidenceCount > 0 && approvedDocCount > 0 && docsWithPlaceholders === 0 && validatedControls > 0;

  const implementationStages = [
    { title: 'Foundation', detail: 'Client, scope, licensing' },
    { title: 'Tenant baseline', detail: 'Identity and security' },
    { title: 'Evidence', detail: 'Capture, export, label' },
    { title: 'Validation', detail: 'Controls and workpapers' },
    { title: 'Delivery', detail: 'SPRS and final package' },
  ];

  return (
    <div className="space-y-6">
      <section className="soft-grid relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a1830] via-[#10284a] to-[#15385e] p-5 text-white shadow-xl shadow-slate-950/10 sm:p-6 lg:p-7">
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#479dcf]/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#8fd0f2]">Client command center</div>
            <h1 className="mt-2 truncate text-2xl font-extrabold tracking-tight text-white sm:text-3xl">{selectedClient.legal_name}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
              A focused view of implementation progress, evidence health, and what needs attention next.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold text-white/70 ring-1 ring-white/10">
                <Building2 className="h-3.5 w-3.5 text-[#8fd0f2]" /> {selectedClient.environment_type || 'Environment not set'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1.5 text-[11px] font-bold text-white/70 ring-1 ring-white/10">
                <Clock className="h-3.5 w-3.5 text-[#8fd0f2]" /> {currentPhase}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ring-1 ${packageReady ? 'bg-emerald-400/10 text-emerald-200 ring-emerald-300/20' : 'bg-amber-400/10 text-amber-200 ring-amber-300/20'}`}>
                <Package className="h-3.5 w-3.5" /> Package {packageReady ? 'ready' : 'not ready'}
              </span>
            </div>
          </div>
          <button type="button" onClick={() => setShowReport(true)} className="inline-flex min-h-11 flex-shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-extrabold text-[#0f2544] shadow-lg transition-transform hover:-translate-y-0.5 hover:shadow-xl">
            <FileBarChart className="h-4 w-4" /> Generate weekly report
          </button>
        </div>
      </section>

      <WarningBanner compact indices={[3]} />

      <section aria-label="Client readiness metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={Clock} label="Current phase" value={currentPhase?.split(' ').slice(0, 2).join(' ') || '—'} sublabel={currentPhase} color="navy" onClick={() => navigate('/board')} />
        <StatCard icon={ShieldCheck} label="Level 1" value={`${l1Complete}/${l1Controls.length}`} sublabel={`${Math.round(l1Pct)}% complete`} color="green" onClick={() => navigate('/controls')} />
        <StatCard icon={Layers} label="Level 2" value={`${l2Complete}/${l2Controls.length}`} sublabel={`${Math.round(l2Pct)}% complete`} color="amber" onClick={() => navigate('/level2')} />
        <StatCard icon={Image} label="Evidence" value={evidenceItems} sublabel={`${approvedEvidenceCount} approved`} color="blue" onClick={() => navigate('/evidence')} />
        <StatCard icon={AlertTriangle} label="Blockers" value={blockers.length} sublabel="Critical items" color={blockers.length ? 'red' : 'green'} onClick={() => navigate('/board')} />
        <StatCard icon={Package} label="Package" value={packageReady ? 'Ready' : 'Not ready'} sublabel={packageReady ? 'Delivery checks passed' : 'Requirements remain'} color={packageReady ? 'green' : 'white'} onClick={() => navigate('/package')} />
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.75fr)]">
        <div className="space-y-4">
          <section className="app-surface p-5 sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="page-kicker">Readiness progression</div>
                <h2 className="mt-2 text-base font-extrabold text-slate-900">Control completion at a glance</h2>
              </div>
              <span className="app-pill">Verified controls only</span>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <ReadinessBar icon={ShieldCheck} title="CMMC Level 1" complete={l1Complete} total={l1Controls.length} value={l1Pct} tone="green" />
              <ReadinessBar icon={Layers} title="CMMC Level 2" complete={l2Complete} total={l2Controls.length} value={l2Pct} tone="amber" />
            </div>
          </section>
          <ProgressSummary l1Controls={l1Controls} l2Controls={l2Controls} tasks={stats.tasks} />
        </div>

        <section className="app-surface overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="page-kicker">Attention queue</div>
            <h2 className="mt-2 text-base font-extrabold text-slate-900">What needs action now</h2>
          </div>
          <div className="divide-y divide-slate-100 px-2">
            <ActionRow icon={AlertTriangle} label="Critical blockers" value={blockers.length} to="/board" tone={blockers.length ? 'red' : 'green'} />
            <ActionRow icon={ListChecks} label="Open tasks" value={openTasks.length} to="/board" tone={openTasks.length ? 'blue' : 'green'} />
            <ActionRow icon={Image} label="Screenshots needed" value={missingScreenshots} to="/screenshots" tone={missingScreenshots ? 'amber' : 'green'} />
            <ActionRow icon={AlertCircle} label="Exports needed" value={missingExports} to="/evidence" tone={missingExports ? 'amber' : 'green'} />
          </div>
          <Link to="/package" className={`m-3 flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold transition-colors ${packageReady ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'}`}>
            <span className="flex items-center gap-2"><Package className="h-4 w-4" /> Final package</span>
            <span className="flex items-center gap-1 text-xs">{packageReady ? 'Ready' : 'Review'} <ArrowRight className="h-3.5 w-3.5" /></span>
          </Link>
        </section>
      </div>

      <Link to="/piee" className="group block overflow-hidden rounded-2xl border border-[#479dcf]/30 bg-gradient-to-r from-[#10294b] to-[#1b4f79] p-5 text-white shadow-lg shadow-blue-950/10 transition-all hover:-translate-y-0.5 hover:shadow-xl sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
              <BadgeCheck className="h-6 w-6 text-[#9bd9f7]" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#8fd0f2]">Submission readiness</div>
              <h2 className="mt-1 text-sm font-extrabold sm:text-base">PIEE / SPRS self-certification walkthrough</h2>
              <p className="mt-1 text-xs leading-5 text-white/55">Guide the client through access, role requests, assessment entry, and AO affirmation.</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 flex-shrink-0 text-white/60 transition-transform group-hover:translate-x-1" />
        </div>
      </Link>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentPanel icon={Image} title="Recent screenshots" to="/screenshots" empty="No screenshots uploaded yet.">
          {recentScreenshots.map(s => (
            <div key={s.id} className="flex items-center gap-3 py-2">
              {s.file_url ? <img src={s.file_url} alt="" className="h-10 w-10 rounded-lg border border-slate-200 object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100"><Image className="h-4 w-4 text-slate-400" /></div>}
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-slate-700">{s.actual_file_name || s.suggested_file_name || 'Untitled'}</div>
                <div className="mt-0.5 text-[10px] font-medium text-slate-400">{s.related_control || 'No control mapped'}</div>
              </div>
              <StatusBadge status={s.validation_status} size="xs" />
            </div>
          ))}
        </RecentPanel>

        <RecentPanel icon={FileText} title="Recent documents" to="/documents" empty="No documents generated yet.">
          {recentDocs.map(d => (
            <div key={d.id} className="flex items-center gap-3 py-2">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50"><FileText className="h-4 w-4 text-blue-600" /></div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-bold text-slate-700">{d.title}</div>
                <div className="mt-0.5 text-[10px] font-medium text-slate-400">Version {d.version || '1'}</div>
              </div>
              <StatusBadge status={d.status} size="xs" />
            </div>
          ))}
        </RecentPanel>
      </div>

      <ClientProgressOverview onlyClientId={selectedClientId} />

      <WarningBanner indices={[0, 1, 2]} />

      <section className="app-surface overflow-hidden p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="page-kicker">Implementation path</div>
            <h2 className="mt-2 text-base font-extrabold text-slate-900">From foundation to delivery</h2>
          </div>
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="relative mt-5 grid gap-3 sm:grid-cols-5">
          <div className="absolute left-[10%] right-[10%] top-5 hidden h-px bg-slate-200 sm:block" />
          {implementationStages.map((stage, index) => (
            <div key={stage.title} className="relative rounded-xl bg-slate-50 p-3 sm:bg-transparent sm:p-0 sm:text-center">
              <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-[#0f2747] text-xs font-extrabold text-white shadow-md sm:mx-auto">{index + 1}</div>
              <div className="mt-2 text-xs font-extrabold text-slate-800">{stage.title}</div>
              <div className="mt-1 text-[10px] font-medium leading-4 text-slate-400">{stage.detail}</div>
            </div>
          ))}
        </div>
      </section>

      {showReport && (
        <WeeklyReportModal
          client={selectedClient}
          l1Controls={l1Controls}
          l2Controls={l2Controls}
          tasks={stats.tasks}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

function ReadinessBar({ icon: Icon, title, complete, total, value, tone }) {
  const iconTone = tone === 'green' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700';
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconTone}`}><Icon className="h-4 w-4" /></div>
          <div>
            <div className="text-xs font-extrabold text-slate-800">{title}</div>
            <div className="mt-0.5 text-[10px] font-medium text-slate-400">{complete} of {total} controls</div>
          </div>
        </div>
        <div className="metric-value text-2xl font-extrabold text-slate-900">{Math.round(value)}%</div>
      </div>
      <ProgressBar value={value} color={tone} size="md" />
    </div>
  );
}

function ActionRow({ icon: Icon, label, value, to, tone }) {
  const tones = {
    red: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
  };
  return (
    <Link to={to} className="group flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone] || tones.blue}`}><Icon className="h-4 w-4" /></div>
      <span className="flex-1 text-xs font-bold text-slate-700">{label}</span>
      <span className="metric-value text-lg font-extrabold text-slate-900">{value}</span>
      <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
    </Link>
  );
}

function RecentPanel({ icon: Icon, title, to, empty, children }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : !!children;
  return (
    <section className="app-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100"><Icon className="h-4 w-4 text-slate-600" /></div>
          <h2 className="text-sm font-extrabold text-slate-800">{title}</h2>
        </div>
        <Link to={to} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
      </div>
      {hasItems ? <div className="divide-y divide-slate-100">{children}</div> : <p className="py-5 text-center text-xs font-medium text-slate-400">{empty}</p>}
    </section>
  );
}