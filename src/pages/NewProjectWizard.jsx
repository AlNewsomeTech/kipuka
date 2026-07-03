import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, Rocket } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useOrg } from '@/lib/orgContext';
import { recommendCmmc, PATH_TO_PROJECT } from '@/lib/cmmcDetermination';
import { logAudit, AUDIT_ACTIONS } from '@/lib/auditLog';
import WizardShell from '@/components/wizard/WizardShell';
import StepCompanyProfile from '@/components/wizard/StepCompanyProfile';
import StepContractData from '@/components/wizard/StepContractData';
import StepRecommendation from '@/components/wizard/StepRecommendation';
import StepSelectPath from '@/components/wizard/StepSelectPath';
import StepGenerate from '@/components/wizard/StepGenerate';
import ConfidentialityFooter from '@/components/legal/ConfidentialityFooter';

export default function NewProjectWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedOrg, selectedOrgId } = useOrg();

  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({});
  const [answers, setAnswers] = useState({});
  const [selectedPath, setSelectedPath] = useState('');
  const [creating, setCreating] = useState(false);

  // Pre-fill the profile from the selected organization.
  useEffect(() => {
    if (selectedOrg) {
      setProfile((p) => ({
        legal_name: selectedOrg.legal_name || selectedOrg.organization_name || '',
        uei: selectedOrg.uei || '',
        primary_cage_code: (selectedOrg.cage_codes || [])[0] || '',
        sam_status: selectedOrg.sam_registration_status || '',
        primary_poc: selectedOrg.primary_contact_name || '',
        it_poc: '',
        compliance_poc: '',
        affirming_official_name: '',
        project_name: `${selectedOrg.short_name || selectedOrg.organization_name || 'CMMC'} Readiness`,
        ...p,
      }));
    }
  }, [selectedOrg]);

  const recommendation = recommendCmmc(answers);

  const canNext = () => {
    if (step === 1) return (profile.legal_name || '').trim().length > 0;
    if (step === 4) return !!selectedPath;
    return true;
  };

  const handleGenerate = async () => {
    setCreating(true);
    try {
      const mapping = PATH_TO_PROJECT[selectedPath] || {};
      const project = await base44.entities.Project.create({
        organization_id: selectedOrgId || '',
        project_name: profile.project_name || profile.legal_name || 'New CMMC Project',
        project_type: mapping.project_type || 'Other',
        target_cmmc_level: mapping.target_cmmc_level || 'Unknown',
        assessment_path: mapping.assessment_path || 'Unknown',
        project_status: 'Discovery',
        primary_cage_code: profile.primary_cage_code || '',
        uei: profile.uei || '',
        project_owner_name: profile.primary_poc || user?.full_name || '',
        project_owner_email: user?.email || '',
        affirming_official_name: profile.affirming_official_name || '',
        current_readiness_score: 0,
        start_date: new Date().toISOString().slice(0, 10),
        onboarding_checklist: { confirm_org: true, level_determination: true },
      });

      await base44.entities.CMMCLevelDetermination.create({
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

      await logAudit({
        organizationId: selectedOrgId,
        user,
        actionType: AUDIT_ACTIONS.PROJECT_CREATE,
        targetEntity: 'Project',
        targetRecordId: project.id,
        summary: `Created project "${project.project_name}" (${selectedPath}) via New CMMC Project Wizard.`,
      });

      navigate(`/projects/${project.id}`);
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

      <WizardShell step={step}>
        {step === 1 && <StepCompanyProfile data={profile} onChange={setProfile} />}
        {step === 2 && <StepContractData data={answers} onChange={setAnswers} />}
        {step === 3 && <StepRecommendation recommendation={recommendation} />}
        {step === 4 && <StepSelectPath recommendedPath={recommendation.recommended_assessment_path} selected={selectedPath} onSelect={setSelectedPath} />}
        {step === 5 && <StepGenerate data={profile} selectedPath={selectedPath} />}

        <div className="flex items-center justify-between mt-6 pt-5 border-t border-slate-100">
          <button
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 disabled:opacity-40 hover:bg-slate-200"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {step < 5 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
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
      </WizardShell>

      <ConfidentialityFooter />
    </div>
  );
}