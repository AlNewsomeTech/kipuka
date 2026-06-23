import { useState, useEffect } from 'react';
import { Package, CheckCircle2, AlertCircle, XCircle, FileText, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import ProgressBar from '@/components/ProgressBar';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

const packageChecklist = [
  'Level 1 Control Matrix', 'Evidence Index', 'Scope Statement', 'Asset Inventory',
  'User Inventory', 'Device Inventory', 'Policies', 'Screenshots',
  'Exports', 'NinjaOne Reports', 'SPRS Workpapers', 'Executive Attestation', 'Final Summary'
];

export default function FinalPackage() {
  const { selectedClientId, selectedClient } = useClient();
  const [controls, setControls] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [screenshots, setScreenshots] = useState([]);
  const [docs, setDocs] = useState([]);
  const [packages, setPackages] = useState([]);
  const [preparing, setPreparing] = useState(false);

  const load = () => {
    if (!selectedClientId) return;
    base44.entities.CMMCControl.filter({ level: 'Level 1' }).then(setControls).catch(() => {});
    base44.entities.EvidenceItem.filter({ client_id: selectedClientId }).then(setEvidence).catch(() => {});
    base44.entities.Screenshot.filter({ client_id: selectedClientId }).then(setScreenshots).catch(() => {});
    base44.entities.GeneratedDocument.filter({ client_id: selectedClientId }).then(setDocs).catch(() => {});
    base44.entities.AssessmentPackage.filter({ client_id: selectedClientId }).then(setPackages).catch(() => {});
  };
  useEffect(load, [selectedClientId]);

  const l1Complete = controls.filter(c => c.status === 'Complete' || c.ready_for_assessment).length;
  const l1Pct = controls.length ? (l1Complete / controls.length) * 100 : 0;
  const missingControls = controls.filter(c => c.status !== 'Complete' && !c.ready_for_assessment);
  const controlsNoEvidence = controls.filter(c => (c.evidence_count || 0) === 0);
  const evidenceWithoutReview = [...evidence, ...screenshots].filter(e => e.reviewer_status === 'Not Reviewed' || !e.reviewer_status);
  const screenshotsNoFilename = screenshots.filter(s => !s.actual_file_name);
  const docsNotApproved = docs.filter(d => d.status !== 'Approved' && d.status !== 'Published');
  const includedEvidence = [...evidence, ...screenshots].filter(e => e.include_in_final_package).length;

  const checklistStatus = packageChecklist.map(item => {
    if (item === 'Level 1 Control Matrix') return { item, done: l1Pct >= 100, detail: `${l1Complete}/${controls.length} controls complete` };
    if (item === 'Evidence Index') return { item, done: evidence.length + screenshots.length > 0, detail: `${evidence.length + screenshots.length} items` };
    if (item === 'Scope Statement') return { item, done: docs.some(d => d.title?.includes('Scope')), detail: docs.some(d => d.title?.includes('Scope')) ? 'Generated' : 'Not generated' };
    if (item === 'Policies') return { item, done: docs.filter(d => d.status === 'Approved').length > 0, detail: `${docs.filter(d => d.status === 'Approved').length} approved` };
    if (item === 'Screenshots') return { item, done: screenshots.length > 0, detail: `${screenshots.length} screenshots` };
    if (item === 'NinjaOne Reports') return { item, done: true, detail: 'See NinjaOne section' };
    if (item === 'Executive Attestation') return { item, done: docs.some(d => d.title?.includes('Attestation')), detail: docs.some(d => d.title?.includes('Attestation')) ? 'Generated' : 'Not generated' };
    return { item, done: false, detail: 'Pending' };
  });

  const completedItems = checklistStatus.filter(c => c.done).length;
  const packagePct = (completedItems / packageChecklist.length) * 100;

  const preparePackage = () => {
    setPreparing(true);
    base44.entities.AssessmentPackage.create({
      client_id: selectedClientId, package_name: `${selectedClient.legal_name} - Level 1 Package`, level: 'Level 1',
      percent_complete: Math.round(packagePct),
      missing_controls: missingControls.map(c => c.control_id).join(', '),
      controls_no_evidence: controlsNoEvidence.map(c => c.control_id).join(', '),
      evidence_without_review: evidenceWithoutReview.length.toString(),
      screenshots_no_filename: screenshotsNoFilename.length.toString(),
      documents_not_approved: docsNotApproved.length.toString(),
      level1_ready: l1Pct >= 100 && evidenceWithoutReview.length === 0,
      level2_supplemental_status: 'Available - not included in Level 1 package',
      checklist: JSON.stringify(checklistStatus),
      status: 'Draft'
    }).then(() => { setPreparing(false); load(); });
  };

  if (!selectedClient) return <EmptyState icon={Package} title="No client selected" description="Select a client to prepare the final package." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Final Package</h1>
          <p className="text-sm text-slate-500 mt-1">Level 1 assessment package readiness and preparation</p>
        </div>
        <button onClick={preparePackage} disabled={preparing} className="flex items-center gap-2 bg-[#0F1E3C] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#1E2D4A] disabled:opacity-50">
          <Package className="w-4 h-4" /> {preparing ? 'Preparing...' : 'Prepare Level 1 Package'}
        </button>
      </div>

      {/* Readiness score */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${packagePct >= 100 ? 'bg-green-100' : packagePct >= 50 ? 'bg-amber-100' : 'bg-slate-100'}`}>
            <span className={`text-xl font-bold ${packagePct >= 100 ? 'text-green-700' : packagePct >= 50 ? 'text-amber-700' : 'text-slate-500'}`}>{Math.round(packagePct)}%</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Package Readiness Score</h3>
            <p className="text-xs text-slate-500">{completedItems} of {packageChecklist.length} checklist items complete</p>
          </div>
        </div>
        <ProgressBar value={packagePct} color={packagePct >= 100 ? 'green' : 'amber'} size="md" />
      </div>

      {/* Issues */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        <IssueCard icon={ShieldCheck} label="Missing Controls" count={missingControls.length} items={missingControls.map(c => c.control_id)} color="red" />
        <IssueCard icon={AlertCircle} label="Controls with No Evidence" count={controlsNoEvidence.length} items={controlsNoEvidence.map(c => c.control_id)} color="amber" />
        <IssueCard icon={AlertCircle} label="Evidence Without Review" count={evidenceWithoutReview.length} color="amber" />
        <IssueCard icon={AlertCircle} label="Screenshots Without File Names" count={screenshotsNoFilename.length} color="amber" />
        <IssueCard icon={FileText} label="Documents Not Approved" count={docsNotApproved.length} color="amber" />
        <IssueCard icon={CheckCircle2} label="Evidence Included in Package" count={includedEvidence} color="green" />
      </div>

      {/* Checklist */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Package Checklist</h3>
        <div className="grid md:grid-cols-2 gap-2">
          {checklistStatus.map(({ item, done, detail }) => (
            <div key={item} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
              {done ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-slate-300 flex-shrink-0" />}
              <div className="flex-1">
                <div className={`text-sm ${done ? 'text-slate-700' : 'text-slate-500'}`}>{item}</div>
                <div className="text-[10px] text-slate-400">{detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Level 1 vs Level 2 status */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2"><ShieldCheck className="w-5 h-5 text-green-600" /><h3 className="text-sm font-semibold text-slate-800">Level 1 Ready Status</h3></div>
          <StatusBadge status={l1Pct >= 100 && evidenceWithoutReview.length === 0 ? 'Complete' : 'In Progress'} />
          <p className="text-xs text-slate-500 mt-2">{l1Complete} of {controls.length} controls complete. {evidenceWithoutReview.length} items need review.</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2"><Package className="w-5 h-5 text-amber-600" /><h3 className="text-sm font-semibold text-slate-800">Level 2-Ready Supplemental</h3></div>
          <span className="text-xs text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full font-medium">Available — Not in L1 Package</span>
          <p className="text-xs text-slate-500 mt-2">Level 2-ready evidence is tracked separately and should not be included in the Level 1 final package unless explicitly marked as supplemental.</p>
        </div>
      </div>

      {/* Previous packages */}
      {packages.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Generated Packages</h3>
          <div className="space-y-2">
            {packages.map(p => (
              <div key={p.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                <Package className="w-4 h-4 text-slate-400" />
                <div className="flex-1"><div className="text-sm text-slate-700">{p.package_name}</div><div className="text-[10px] text-slate-400">{p.percent_complete}% complete</div></div>
                <StatusBadge status={p.status} size="xs" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function IssueCard({ icon: Icon, label, count, items, color }) {
  const colorMap = { red: 'text-red-600 bg-red-50', amber: 'text-amber-600 bg-amber-50', green: 'text-green-600 bg-green-50' };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-2"><div className={`w-8 h-8 rounded-lg ${colorMap[color]} flex items-center justify-center`}><Icon className="w-4 h-4" /></div><span className="text-xs font-medium text-slate-600">{label}</span></div>
      <div className="text-2xl font-bold text-slate-800 mb-1">{count}</div>
      {items && items.length > 0 && <div className="text-[10px] font-mono text-slate-400 truncate">{items.join(', ')}</div>}
    </div>
  );
}