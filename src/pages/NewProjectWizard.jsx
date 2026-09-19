import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, Rocket } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useOrg } from '@/lib/orgContext';
import { useClient } from '@/lib/clientContext';
import { seedProjectAssessments } from '@/lib/projectAssessmentSeed';
import { loadProjectSetupDefaults, saveProjectSetupData } from '@/lib/projectSetupData';
import { recommendCmmc, PATH_TO_PROJECT } from '@/lib/cmmcDetermination';
import { logAudit, AUDIT_ACTIONS } from '@/lib/auditLog';
import WizardShell from '@/components/wizard/WizardShell';
import StepCompanyProfile from '@/components/wizard/StepCompanyProfile';
import StepContractData from '@/components/wizard/StepContractData';
import StepRecommendation from '@/components/wizard/StepRecommendation';
import StepSelectPath from '@/components/wizard/StepSelectPath';
import StepGenerate from '@/components/wizard/StepGenerate';

export default function NewProjectWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedOrg, selectedOrgId } = useOrg();

  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({});
  const [answers, setAnswers] = useState({});
  const [selectedPath, setSelectedPath] = useState('');
  const [creating, setCreating] = useState(false);
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [setupError, setSetupError] = useState('');
  const [linkedClient, setLinkedClient] = useState(null);
  const { selectedClient } = useClient();
  const savedProject = useRef(null);
  const savedDetermination = useRef(false);

  useEffect(() => {
    let alive = true;
    savedProject.current = null;
    savedDetermination.current = false;
    setProfile({}); setAnswers({}); setSelectedPath(''); setStep(1); setLinkedClient(null); setSetupError('');
    if (!selectedOrgId) return;
    setLoadingDefaults(true);
    loadProjectSetupDefaults(selectedOrg, selectedClient)
      .then(data => { if (alive) { setProfile(data.profile); setAnswers(data.answers); setLinkedClient(data.client); } })
      .catch(error => { if (alive) setSetupError(`Saved company details could not be loaded: ${error.message}`); })
      .finally(() => { if (alive) setLoadingDefaults(false); });
    return () => { alive = false; };
  }, [selectedOrgId, selectedClient?.id]);

  const recommendation = recommendCmmc(answers);

  const canNext = () => {
    if (step === 1) return (profile.legal_name || '').trim().length > 0;
    if (step === 4) return !!selectedPath;
    return true;
  };

  const handleGenerate = async () => {
    if (creating || !selectedOrgId) return;
    setCreating(true);
    setSetupError('');
    try {
      const mapping = PATH_TO_PROJECT[selectedPath] || {};
      const project = savedProject.current || await base44.entities.Project.create({
        organization_id: selectedOrgId || '',
        project_name: profile.project_name || profile.legal_name || 'New CMMC Project',
        project_type: mapping.project_type || 'Other',
        target_cmmc_level: mapping.target_cmmc_level || 'Unknown',
        assessment_path: mapping.assessment_path || 'Unknown',
        project_status: 'Discovery',
        primary_cage_code: profile.primary_cage_code || '',
        uei: profile.uei || '',
        project_owner_name: profile.primary_poc || user?.full_name || '',
        project_owner_email: profile.primary_poc_email || user?.email || '',
        affirming_official_name: profile.affirming_official_name || '',
        implementation_stack: profile.implementation_stack || 'Microsoft 365 Commercial',
        current_readiness_score: 0,
        start_date: profile.start_date || new Date().toISOString().slice(0, 10),
        ...(profile.target_completion_date ? { target_completion_date: profile.target_completion_date } : {}),
        onboarding_checklist: { confirm_org: true, level_determination: true },
      });

      savedProject.current = project;
      if (['Level 1', 'Level 2'].includes(project.target_cmmc_level)) {
        const seed = await seedProjectAssessments(project);
        if (!seed.ok) throw new Error(seed.reason);
      }
      await saveProjectSetupData(project, linkedClient, profile, answers);
      if (!savedDetermination.current) await base44.entities.CMMCLevelDetermination.create({
        organization_id: selectedOrgId || '',
        project_id: project.id,
        handles_fci: !!answers.handles_fci,
        handles_cui: !!answers.handles_cui,
        has_far_52_204_21: !!answers.has_far_52_204_21,
        has_dfars_252_204_7012: !!answers.has_dfars_252_204_7012,
        has_dfars_252_204_7020: !!answers.has_dfars_252_204_7020,
        contract_mentions_cmmc_l1: !!answers.contract_mentions_cmmc_l1,
        contract_mentions_cmmc_l2: !!answers.contract_mentions_cmmc_l2,
        expected_future_cui: !!answers.expected_future_cui,
        performs_dod_work: !!answers.performs_dod_work,
        recommended_level: recommendation.recommended_level,
        recommended_assessment_path: recommendation.recommended_assessment_path,
        user_selected_path: selectedPath,
        determination_notes: recommendation.rationale,
      });
      savedDetermination.current = true;

      await logAudit({
        organizationId: selectedOrgId,
        user,
        actionType: AUDIT_ACTIONS.PROJECT_CREATE,
        targetEntity: 'Project',
        targetRecordId: project.id,
        summary: `Created project "${project.project_name}" (${selectedPath}) via New CMMC Project Wizard.`,
      });

      navigate(`/projects/${project.id}`);
    } catch (error) {
      setSetupError(`${savedProject.current ? 'Project saved; setup needs to finish. Select Generate Workspace to retry without creating another project. ' : ''}${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/projects')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> Projects
        </button>
        <h1 className="text-lg font-bold text-slate-900">New CMMC Project</h1>
      </div>

      {!selectedOrgId && (
        <div className="max-w-3xl mx-auto text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          Select an organization in the top bar before starting a new project.
        </div>
      )}

      {setupError && <p role="alert" className="text-sm text-destructive">{setupError}</p>}
      {loadingDefaults && <p role="status" className="text-sm text-muted-foreground">Loading saved company details…</p>}
      {!loadingDefaults && <WizardShell step={step}>
        {step === 1 && <StepCompanyProfile data={profile} onChange={setProfile} />}
        {step === 2 && <StepContractData data={answers} onChange={setAnswers} />}
        {step === 3 && <StepRecommendation recommendation={recommendation} />}
        {step === 4 && <StepSelectPath recommendedPath={recommendation.recommended_assessment_path} selected={selectedPath} onSelect={setSelectedPath} />}
        {step === 5 && <StepGenerate data={profile} selectedPath={selectedPath} />}

        <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-100">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1 || creating || !!savedProject.current}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 disabled:opacity-40 hover:bg-slate-200"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {step < 5 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext() || loadingDefaults || !selectedOrgId}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] disabled:opacity-40 hover:bg-[#152a52]"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={creating || !selectedOrgId || !selectedPath}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 disabled:opacity-40 hover:bg-green-700"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              Generate Workspace
            </button>
          )}
        </div>
      </WizardShell>}
    </div>
  );
}