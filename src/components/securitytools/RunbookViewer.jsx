import { useState, useEffect, useCallback } from 'react';
import { Loader2, Info, ShieldAlert } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { REVIEW_DISCLAIMER } from '@/lib/securityTools';
import RunbookSection from './RunbookSection';
import EvidenceUploadModal from '@/components/project/evidence/EvidenceUploadModal';
import PoamFormModal from '@/components/project/poam/PoamFormModal';
import RemediationFormModal from '@/components/acolyte/RemediationFormModal';

// Renders a full technician runbook: intro, section jump-nav, and every
// section with persisted checklists. Handles evidence upload + manual gap
// creation (POA&M / ACOLYTE) — never automatic.
export default function RunbookViewer({ runbook, project, readOnly, currentUser, acolyteEnabled }) {
  const [progress, setProgress] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModal, setUploadModal] = useState(false);
  const [gapModal, setGapModal] = useState(null); // 'poam' | 'acolyte' | null

  const load = useCallback(async () => {
    setLoading(true);
    const [prog, asmt] = await Promise.all([
      base44.entities.TechnicianRunbookProgress.filter({ project_id: project.id, tool_name: runbook.tool_name }).catch(() => []),
      base44.entities.ControlAssessment.filter({ project_id: project.id }).catch(() => []),
    ]);
    setProgress(prog);
    setControls(asmt);
    setLoading(false);
  }, [project.id, runbook.tool_name]);

  useEffect(() => { load(); }, [load]);

  // Progress lookup keyed by "section::stepLabel".
  const progressMap = {};
  progress.forEach((p) => { progressMap[`${p.runbook_section}::${p.step_title}`] = p; });

  const completedCount = progress.filter((p) => p.step_status === 'Complete').length;

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  const gapPrefill = {
    poam_title: `${runbook.tool_name} readiness gap`,
    gap_statement: `Gap identified while completing the ${runbook.tool_name} CMMC technician runbook.`,
    risk_rating: 'Moderate', status: 'Open',
  };
  const remediationPrefill = {
    remediation_title: `${runbook.tool_name} readiness gap`,
    remediation_description: `Gap identified while completing the ${runbook.tool_name} CMMC technician runbook.`,
    priority: 'Medium', status: 'Not Started',
    related_control_ids: [], related_poam_ids: [], related_evidence_ids: [],
  };

  return (
    <div className="space-y-4">
      {/* Intro card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900">{runbook.title}</h2>
        <p className="text-sm font-medium text-slate-500 mt-0.5">{runbook.subtitle}</p>
        <p className="text-[15px] text-slate-700 leading-[1.6] mt-3">{runbook.intro}</p>
        <div className="flex items-start gap-2 mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-[13px] text-amber-800 leading-[1.5]">{REVIEW_DISCLAIMER}</p>
        </div>
        <div className="flex items-center gap-2 mt-3 text-[13px] text-slate-500">
          <Info className="w-4 h-4" /> {completedCount} runbook step{completedCount === 1 ? '' : 's'} marked complete.
        </div>
      </div>

      {/* Section jump nav */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Runbook Sections</p>
        <div className="flex flex-wrap gap-1.5">
          {runbook.sections.map((s, i) => (
            <a key={s.key} href={`#section-${s.key}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">
              <span className="font-mono text-slate-400">{i + 1}</span> {s.title}
            </a>
          ))}
        </div>
      </div>

      {/* Sections */}
      {runbook.sections.map((section, i) => (
        <RunbookSection
          key={section.key}
          runbook={runbook}
          section={section}
          index={i + 1}
          project={project}
          toolName={runbook.tool_name}
          progressMap={progressMap}
          currentUser={currentUser}
          readOnly={readOnly}
          onProgressChange={load}
          onUploadEvidence={() => setUploadModal(true)}
          onCreateGap={(type) => {
            if (type === 'acolyte' && !acolyteEnabled) {
              alert('ACOLYTE is not enabled for this project. Create a POA&M item instead, or enable ACOLYTE in the Managed Service module.');
              return;
            }
            setGapModal(type);
          }}
        />
      ))}

      {uploadModal && (
        <EvidenceUploadModal
          project={project}
          currentUser={currentUser}
          controls={controls}
          presetSourceTool={runbook.tool_name}
          onClose={() => setUploadModal(false)}
          onSaved={() => setUploadModal(false)}
        />
      )}

      {gapModal === 'poam' && (
        <PoamFormModal
          project={project}
          existing={gapPrefill}
          onClose={() => setGapModal(null)}
          onSaved={() => setGapModal(null)}
        />
      )}

      {gapModal === 'acolyte' && (
        <RemediationFormModal
          project={project}
          existing={remediationPrefill}
          user={currentUser}
          onClose={() => setGapModal(null)}
          onSaved={() => setGapModal(null)}
        />
      )}
    </div>
  );
}