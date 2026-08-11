import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, ChevronLeft, Clock, Star, HelpCircle, Loader2, Layers,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useOrg } from '@/lib/orgContext';
import { useAuth } from '@/lib/AuthContext';
import { pointValueFor } from '@/lib/sprsScoring';
import { buildGuidedQueue, estimatedMinutes, targetLevelsFor } from '@/lib/doNextEngine';
import { stackKeyForProject, resolveVariant } from '@/lib/implementationStacks';
import { buildEvidenceFilePlan } from '@/lib/evidenceFilename';
import { GUIDED_DONE_STATUS, GUIDED_STUCK_STATUS } from '@/lib/simpleStatus';
import { loadGuidedProgress, saveGuidedProgress } from '@/lib/guidedProgress';
import GuidedStepper from '@/components/guided/GuidedStepper';
import StepUnderstand from '@/components/guided/StepUnderstand';
import StepDo from '@/components/guided/StepDo';
import StepCapture from '@/components/guided/StepCapture';
import StepUpload from '@/components/guided/StepUpload';
import StepVerify from '@/components/guided/StepVerify';
import ApplicabilityPanel from '@/components/guided/ApplicabilityPanel';
import ConfidentialityFooter from '@/components/legal/ConfidentialityFooter';

function actionErrorMessage(error, fallback) {
  return error?.response?.data?.error || error?.message || fallback;
}

export default function GuidedWalkthrough() {
  const { id: projectId, controlId } = useParams();
  const navigate = useNavigate();
  const { organizations, readOnly } = useOrg();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [library, setLibrary] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [selectedStack, setSelectedStack] = useState('');
  const [checks, setChecks] = useState({});
  const [saving, setSaving] = useState(false);
  const [savingChecks, setSavingChecks] = useState(false);
  const [stuckOpen, setStuckOpen] = useState(false);
  const [stuckNote, setStuckNote] = useState('');
  const [savingStuck, setSavingStuck] = useState(false);
  const [savingApplicability, setSavingApplicability] = useState(false);
  const [applicabilityWorkflow, setApplicabilityWorkflow] = useState(null);
  const [actionError, setActionError] = useState('');
  const [progressError, setProgressError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const p = await base44.entities.Project.get(projectId);
      if (!p) {
        setProject(null);
        setLoadError('Kipuka could not find this project.');
        return;
      }
      const levels = targetLevelsFor(p);
      const [lib, asmt, prog, applicabilityResponse] = await Promise.all([
        base44.entities.ControlLibrary.filter({ active: true }),
        base44.entities.ControlAssessment.filter({ project_id: projectId }),
        loadGuidedProgress(projectId, controlId),
        base44.functions.invoke('manageControlApplicability', {
          action: 'get',
          project_id: projectId,
          control_id: controlId,
        }),
      ]);
      setProject(p);
      setLibrary(lib.filter((c) => levels.includes(c.cmmc_level)));
      setAssessments(asmt);
      setApplicabilityWorkflow(applicabilityResponse?.data || null);
      setProgress(prog);
      setStep(prog?.current_step || 1);
      setCompletedSteps(prog?.completed_steps || []);
      setSelectedStack(prog?.selected_stack || '');
      setChecks(prog?.verify_checks || {});
    } catch (error) {
      setLoadError(actionErrorMessage(
        error,
        'Kipuka could not load the complete guided workflow. No empty or missing state has been assumed. Retry when the connection is available.',
      ));
    } finally {
      setLoading(false);
    }
  }, [projectId, controlId]);

  useEffect(() => { load(); }, [load]);

  const queue = useMemo(() => buildGuidedQueue(library, assessments, project || {}), [library, assessments, project]);
  const queueIndex = useMemo(() => queue.findIndex((q) => q.control_id === controlId), [queue, controlId]);
  const prevControl = queueIndex > 0 ? queue[queueIndex - 1] : null;
  const nextControl = queueIndex >= 0 && queueIndex < queue.length - 1 ? queue[queueIndex + 1] : null;

  const libEntry = useMemo(() => library.find((c) => c.control_id === controlId), [library, controlId]);
  const assessment = useMemo(() => assessments.find((a) => a.control_id === controlId), [assessments, controlId]);
  const projectStackKey = project ? stackKeyForProject(project) : 'generic';
  const organization = useMemo(
    () => organizations.find((org) => org.id === project?.organization_id),
    [organizations, project?.organization_id],
  );

  // Persist progress without pretending a failed save succeeded.
  const persist = useCallback(async (patch) => {
    setProgressError('');
    try {
      const org = project?.organization_id;
      const saved = await saveGuidedProgress(progress, {
        projectId, organizationId: org, controlId, patch,
      });
      if (!saved?.id) throw new Error('Kipuka did not return a saved walkthrough record.');
      setProgress(saved);
      return saved;
    } catch (error) {
      setProgressError(actionErrorMessage(
        error,
        'Your walkthrough position could not be saved. Keep this page open and try that step again.',
      ));
      return null;
    }
  }, [progress, project, projectId, controlId]);

  const goToStep = (n) => {
    setStep(n);
    const done = completedSteps.includes(n - 1) || n <= step ? completedSteps : Array.from(new Set([...completedSteps, ...Array.from({ length: n - 1 }, (_, i) => i + 1)]));
    persist({ current_step: n });
  };

  const advance = () => {
    const nextCompleted = Array.from(new Set([...completedSteps, step]));
    setCompletedSteps(nextCompleted);
    const n = Math.min(5, step + 1);
    setStep(n);
    persist({ current_step: n, completed_steps: nextCompleted });
  };

  const back = () => {
    const n = Math.max(1, step - 1);
    setStep(n);
    persist({ current_step: n });
  };

  const onSelectStack = (key) => {
    setSelectedStack(key);
    persist({ selected_stack: key });
  };

  const toggleCheck = async (i) => {
    if (readOnly || savingChecks) return;
    const next = { ...checks, [i]: !checks[i] };
    setSavingChecks(true);
    try {
      const saved = await persist({ verify_checks: next });
      if (saved?.id) setChecks(saved.verify_checks || next);
    } finally {
      setSavingChecks(false);
    }
  };

  const manageApplicability = async (action, payload = {}) => {
    setSavingApplicability(true);
    try {
      const response = await base44.functions.invoke('manageControlApplicability', {
        action,
        project_id: projectId,
        control_id: controlId,
        transition_id: crypto.randomUUID(),
        ...payload,
      });
      await load();
      return response?.data;
    } finally {
      setSavingApplicability(false);
    }
  };

  // VERIFY → save the canonical status first. Never show Done after a rejected write.
  const markDone = async () => {
    if (readOnly) {
      setActionError('Your access is read-only. Ask an authorized project member to finish this implementation step.');
      return;
    }
    if (!assessment?.id) {
      setActionError('Kipuka cannot mark this control done because its assessment record is missing.');
      return;
    }
    setActionError('');
    setSaving(true);
    try {
      const savedAssessment = await base44.entities.ControlAssessment.update(assessment.id, {
        status: GUIDED_DONE_STATUS,
        last_reviewed_by: user?.full_name || user?.email || '',
        last_reviewed_date: new Date().toISOString().slice(0, 10),
      });
      if (!savedAssessment?.id) throw new Error('Kipuka did not confirm the control status update.');
      setAssessments((prev) => prev.map((row) => (
        row.id === assessment.id ? { ...row, ...savedAssessment } : row
      )));
      const nextCompleted = Array.from(new Set([...completedSteps, 5]));
      setCompletedSteps(nextCompleted);
      await persist({ completed_steps: nextCompleted });
    } catch (error) {
      setActionError(actionErrorMessage(
        error,
        'Kipuka could not mark this control done. No completion was recorded; try again or contact Pac-Sec support.',
      ));
    } finally {
      setSaving(false);
    }
  };

  // "I'm stuck" → reuse an existing open guided POA&M item, then set Gap Identified.
  const submitStuck = async () => {
    if (!assessment?.id) {
      setActionError('Kipuka cannot flag this control because its assessment record is missing.');
      return;
    }
    setActionError('');
    setSavingStuck(true);
    const poamTitle = `${controlId} — needs help`;
    try {
      const existingItems = await base44.entities.ProjectPOAM.filter({ project_id: projectId, control_id: controlId });
      const reusable = existingItems.find((item) => (
        item.poam_title === poamTitle && !['Closed', 'Deferred', 'Accepted Risk'].includes(item.status)
      ));
      if (!reusable) {
        const created = await base44.entities.ProjectPOAM.create({
          organization_id: project.organization_id,
          project_id: projectId,
          control_id: controlId,
          poam_title: poamTitle,
          gap_statement: stuckNote.trim() || `User flagged ${controlId} as stuck during guided implementation.`,
          remediation_plan: libEntry?.poam_gap_starter || '',
          risk_rating: assessment.risk_rating || 'Moderate',
          status: 'Open',
        });
        if (!created?.id) throw new Error('Kipuka did not confirm the POA&M item.');
      }
      const savedAssessment = await base44.entities.ControlAssessment.update(assessment.id, { status: GUIDED_STUCK_STATUS });
      if (!savedAssessment?.id) throw new Error('Kipuka did not confirm the control status update.');
      setAssessments((prev) => prev.map((row) => (
        row.id === assessment.id ? { ...row, ...savedAssessment } : row
      )));
      setStuckOpen(false);
      setStuckNote('');
    } catch (error) {
      setActionError(actionErrorMessage(
        error,
        'Kipuka could not finish the stuck-control update. Retry is safe and will reuse an existing open to-do.',
      ));
    } finally {
      setSavingStuck(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }
  if (loadError) {
    return (
      <div role="alert" className="max-w-2xl mx-auto rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
        <div className="font-semibold">{loadError}</div>
        <button onClick={load} className="mt-3 rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white">
          Retry guided workflow
        </button>
      </div>
    );
  }
  if (!project) return <div className="p-6 text-sm text-slate-500">Project not found. <Link to="/projects" className="text-blue-600 hover:underline">Back to projects</Link></div>;
  if (!libEntry) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <p className="text-sm text-slate-600">This control isn't in your target level's library.</p>
        <Link to={`/projects/${projectId}/assessment`} className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-blue-600 hover:underline">
          <ChevronLeft className="w-4 h-4" /> Back to Control Implementation
        </Link>
      </div>
    );
  }

  const points = pointValueFor(controlId);
  const minutes = estimatedMinutes(libEntry, controlId);
  const { variant } = resolveVariant(libEntry, selectedStack || projectStackKey);
  const filenamePlan = buildEvidenceFilePlan({
    organization,
    project,
    libEntry,
    variant,
    controlType: 'Screenshot',
  });
  const suggestedFilename = filenamePlan.baseName;

  const goToControl = (cid) => cid && navigate(`/projects/${projectId}/guided/${cid}`);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Back to list */}
      <Link to={`/projects/${projectId}/assessment`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ChevronLeft className="w-4 h-4" /> All controls
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-semibold text-slate-500">{libEntry.control_id}</span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{libEntry.domain}</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 mt-1">{libEntry.control_title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
              <Star className="w-3.5 h-3.5" /> {points} SPRS {points === 1 ? 'point' : 'points'}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
              <Clock className="w-3.5 h-3.5" /> ~{minutes} min walkthrough
            </span>
          </div>
        </div>

        <div className="mt-5">
          <GuidedStepper current={step} completedSteps={completedSteps} onJump={goToStep} />
        </div>
      </div>

      <ApplicabilityPanel
        assessment={assessment}
        libEntry={libEntry}
        readOnly={readOnly}
        saving={savingApplicability}
        workflow={applicabilityWorkflow}
        onAction={manageApplicability}
      />

      {/* Step content */}
      <div>
        {step === 1 && <StepUnderstand libEntry={libEntry} />}
        {step === 2 && <StepDo libEntry={libEntry} project={project} organization={organization} projectStackKey={projectStackKey} selectedStack={selectedStack} onSelectStack={onSelectStack} />}
        {step === 3 && <StepCapture libEntry={libEntry} projectStackKey={projectStackKey} selectedStack={selectedStack} suggestedFilename={suggestedFilename} />}
        {step === 4 && (
          <StepUpload
            project={project}
            libEntry={libEntry}
            variant={variant}
            controlId={controlId}
            suggestedFilename={suggestedFilename}
            filenamePlan={filenamePlan}
            readOnly={readOnly}
            onChanged={load}
          />
        )}
        {step === 5 && (
          <StepVerify
            libEntry={libEntry}
            projectStackKey={projectStackKey}
            selectedStack={selectedStack}
            checks={checks}
            onToggleCheck={toggleCheck}
            onMarkDone={markDone}
            saving={saving}
            savingChecks={savingChecks}
            readOnly={readOnly}
            assessment={assessment}
            currentStatus={assessment?.status || 'Not Started'}
            error={actionError}
          />
        )}
      </div>

      {progressError && (
        <div role="alert" className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm font-semibold text-amber-900">
          {progressError}
        </div>
      )}

      {/* Stuck panel */}
      {stuckOpen && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <label className="block text-xs font-semibold text-red-800">Tell us what's blocking you (optional)</label>
          <textarea rows={2} className="form-input" value={stuckNote} onChange={(e) => setStuckNote(e.target.value)} placeholder="e.g. can't find the setting, need admin access…" />
          {actionError && <p role="alert" className="text-xs font-semibold text-red-800">{actionError}</p>}
          <div className="flex gap-2">
            <button onClick={submitStuck} disabled={savingStuck} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60">
              {savingStuck ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HelpCircle className="w-3.5 h-3.5" />} Flag & create POA&M
            </button>
            <button onClick={() => { setStuckOpen(false); setActionError(''); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200">Cancel</button>
          </div>
          <p className="text-[11px] text-red-700/80">This marks the control as a gap and logs a POA&M item so your consultant can follow up.</p>
        </div>
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={back} disabled={step === 1} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-40">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          {step < 5 && (
            <button onClick={advance} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
              Next <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && (
            <button onClick={() => { setStuckOpen(!stuckOpen); setActionError(''); }} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200">
              <HelpCircle className="w-4 h-4" /> I'm stuck
            </button>
          )}
          <button onClick={() => goToControl(prevControl?.control_id)} disabled={!prevControl} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" /> Prev control
          </button>
          <button onClick={() => goToControl(nextControl?.control_id)} disabled={!nextControl} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
            Next control <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {queueIndex >= 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Layers className="w-3.5 h-3.5" /> Control {queueIndex + 1} of {queue.length} in your guided queue
        </div>
      )}

      <ConfidentialityFooter text="" />
    </div>
  );
}