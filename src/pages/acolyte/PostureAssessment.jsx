import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Plus, Loader2, ArrowRight, ArrowLeft, CheckCircle2, Lock,
  TrendingUp, ListChecks, Eye,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { base44 } from '@/api/base44Client';
import { useAcolyteScope } from '@/lib/useAcolyteScope';
import { useOrg } from '@/lib/orgContext';
import { ACOLYTE_BRAND, today } from '@/lib/acolyte';
import { logAudit, AUDIT_ACTIONS } from '@/lib/auditLog';
import {
  questionsByDomain, scorePosture, answeredCount, scoreBand,
} from '@/lib/postureAssessment';
import { generateRemediationFromAssessment } from '@/lib/postureRemediation';
import AcolyteHeader from '@/components/acolyte/AcolyteHeader';
import AcolyteProjectBar from '@/components/acolyte/AcolyteProjectBar';
import PostureGauge from '@/components/acolyte/PostureGauge';
import PostureDomainBars from '@/components/acolyte/PostureDomainBars';
import PostureQuestionStep from '@/components/acolyte/PostureQuestionStep';

const DOMAIN_STEPS = questionsByDomain();

export default function PostureAssessment() {
  const scope = useAcolyteScope();
  const { project, projects, projectId, selectProject, orgNameForProject, selectedOrg, readOnly, user } = scope;
  const { acolyteEnabled, isPlatformAdmin } = useOrg();

  const orgId = project?.organization_id || selectedOrg?.id || null;
  const unlocked = acolyteEnabled || isPlatformAdmin;

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('list'); // 'list' | 'run' | 'summary'
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(null); // assessment record being run
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState(null); // { assessment, remediation }

  const load = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
    setLoading(true);
    const rows = await base44.entities.PostureAssessment
      .filter({ organization_id: orgId }, '-created_date', 200).catch(() => []);
    setList(rows);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const completed = list
    .filter((a) => a.status === 'completed')
    .sort((a, b) => new Date(a.assessment_date || a.created_date) - new Date(b.assessment_date || b.created_date));
  const latest = completed[completed.length - 1] || null;
  const previous = completed[completed.length - 2] || null;
  const delta = latest && previous ? Math.round(latest.overall_score) - Math.round(previous.overall_score) : null;
  const trend = completed.map((a) => ({
    date: (a.assessment_date || a.created_date || '').slice(0, 10),
    score: Math.round(a.overall_score || 0),
  }));

  const startNew = async () => {
    const rec = await base44.entities.PostureAssessment.create({
      organization_id: orgId,
      project_id: projectId || '',
      assessment_name: 'Cyber Posture Assessment',
      assessment_date: today(),
      completed_by: user?.full_name || user?.email || '',
      status: 'draft',
      answers: {},
    });
    setCurrent(rec);
    setAnswers({});
    setStep(0);
    setMode('run');
  };

  const onAnswer = (key, value) => setAnswers((prev) => ({ ...prev, [key]: value }));

  const { answered, total } = answeredCount(answers);

  const complete = async () => {
    setSaving(true);
    const { domain_scores, overall_score } = scorePosture(answers);
    const updated = await base44.entities.PostureAssessment.update(current.id, {
      answers, domain_scores, overall_score, status: 'completed', assessment_date: today(),
      completed_by: user?.full_name || user?.email || '',
    });
    // Auto-generate remediation plan (idempotent) once.
    const remediation = await generateRemediationFromAssessment({ assessment: { ...updated, id: current.id }, project });
    await base44.entities.PostureAssessment.update(current.id, { remediation_generated: true }).catch(() => {});
    await logAudit({
      organizationId: orgId, user, actionType: AUDIT_ACTIONS.ACOLYTE_REPORT_EXPORT,
      targetEntity: 'PostureAssessment', targetRecordId: current.id,
      summary: `Completed cyber posture assessment (score ${overall_score}). ${remediation.added} remediation items added.`,
    }).catch(() => {});
    setSaving(false);
    setSummary({ assessment: { ...updated, domain_scores, overall_score }, remediation });
    setMode('summary');
    load();
  };

  const viewCompleted = (a) => { setSummary({ assessment: a, remediation: null }); setMode('summary'); };

  // ---- Locked preview (no ACOLYTE tier, not platform admin) ----
  if (!loading && !unlocked) {
    return (
      <div className="space-y-4">
        <AcolyteHeader title="Cyber Posture Assessment" subtitle="Guided self-assessment producing a 0-100 posture score and an automatic remediation plan." icon={ShieldCheck} />
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3"><Lock className="w-6 h-6 text-slate-400" /></div>
          <h3 className="text-base font-bold text-slate-800">ACOLYTE capability</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">The Cyber Posture Assessment is part of ACOLYTE Operations. It becomes available when ACOLYTE is enabled for your organization.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AcolyteHeader
        title="Cyber Posture Assessment"
        subtitle="Guided self-assessment producing a 0-100 posture score and an automatic remediation plan."
        icon={ShieldCheck}
        right={mode === 'list' && !readOnly ? (
          <button onClick={startNew} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white text-[#0F1E3C] rounded-lg hover:bg-slate-100">
            <Plus className="w-4 h-4" /> New Assessment
          </button>
        ) : null}
      />
      <AcolyteProjectBar projects={projects} projectId={projectId} onSelect={selectProject} orgName={orgNameForProject} />

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : mode === 'run' ? (
        <RunView
          step={step} setStep={setStep} answers={answers} onAnswer={onAnswer}
          readOnly={readOnly} answered={answered} total={total} saving={saving}
          onComplete={complete} onCancel={() => { setMode('list'); load(); }}
        />
      ) : mode === 'summary' && summary ? (
        <SummaryView summary={summary} onDone={() => { setSummary(null); setMode('list'); }} projectId={projectId} />
      ) : (
        <ListView
          latest={latest} delta={delta} trend={trend} completed={completed}
          onView={viewCompleted}
        />
      )}

      <p className="text-[11px] text-slate-400 pt-1">{ACOLYTE_BRAND.preparedBy}. {ACOLYTE_BRAND.reportDisclaimer}</p>
    </div>
  );
}

// ---------- List / dashboard view ----------
function ListView({ latest, delta, trend, completed, onView }) {
  if (!latest) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#0F1E3C] flex items-center justify-center mx-auto mb-3"><ShieldCheck className="w-6 h-6 text-white" /></div>
        <h3 className="text-base font-bold text-slate-800">No posture assessment yet</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">Run your first guided assessment to get a posture score, a per-domain breakdown, and an automatic remediation plan.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col items-center justify-center text-center">
          <PostureGauge score={latest.overall_score} />
          {delta !== null && (
            <div className={`mt-2 text-xs font-semibold ${delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {delta >= 0 ? '+' : ''}{delta} vs previous
            </div>
          )}
          <div className="text-xs text-slate-500 mt-1">Assessed {latest.assessment_date || '—'}</div>
        </div>
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Domain Breakdown</h3>
          <PostureDomainBars domainScores={latest.domain_scores} />
        </div>
      </div>

      {trend.length >= 2 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4 text-[#0F1E3C]" /><h3 className="text-sm font-bold text-slate-800">Posture Trend</h3></div>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ top: 5, right: 20, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#479dcf" strokeWidth={2.5} dot={{ r: 3 }} name="Posture Score" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        <div className="px-4 py-3 text-sm font-bold text-slate-800">Assessment History</div>
        {completed.slice().reverse().map((a) => {
          const band = scoreBand(a.overall_score);
          return (
            <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-slate-800">{a.assessment_name || 'Cyber Posture Assessment'}</div>
                <div className="text-xs text-slate-500">{a.assessment_date || '—'} · {a.completed_by || '—'}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: band.color }}>{Math.round(a.overall_score || 0)}</span>
                <button onClick={() => onView(a)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100" title="View"><Eye className="w-4 h-4" /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Guided run view ----------
function RunView({ step, setStep, answers, onAnswer, readOnly, answered, total, saving, onComplete, onCancel }) {
  const domain = DOMAIN_STEPS[step];
  const isLast = step === DOMAIN_STEPS.length - 1;
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-semibold text-slate-700">Step {step + 1} of {DOMAIN_STEPS.length}</span>
          <span className="text-slate-500">{answered} of {total} answered</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${((step + 1) / DOMAIN_STEPS.length) * 100}%` }} />
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {DOMAIN_STEPS.map((d, i) => (
            <button key={d.key} onClick={() => setStep(i)}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${i === step ? 'bg-[#0F1E3C] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <PostureQuestionStep domain={domain} questions={domain.questions} answers={answers} readOnly={readOnly} onAnswer={onAnswer} />

      <div className="flex items-center justify-between">
        <button onClick={onCancel} className="text-sm font-semibold text-slate-500 hover:text-slate-700">Cancel</button>
        <div className="flex items-center gap-2">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
          {!isLast ? (
            <button onClick={() => setStep(step + 1)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={onComplete} disabled={saving || readOnly}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Complete Assessment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- Post-completion / view summary ----------
function SummaryView({ summary, onDone, projectId }) {
  const { assessment, remediation } = summary;
  const band = scoreBand(assessment.overall_score);
  return (
    <div className="space-y-4">
      {remediation && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="w-5 h-5 text-green-600" /><h3 className="text-base font-bold text-green-800">Assessment complete</h3></div>
          <p className="text-sm text-green-800">
            <b>{remediation.added}</b> item{remediation.added === 1 ? '' : 's'} added to your remediation plan
            {remediation.updated > 0 && <>, <b>{remediation.updated}</b> updated</>}
            {remediation.closureSuggested > 0 && <>, <b>{remediation.closureSuggested}</b> flagged for closure review</>}.
          </p>
          <Link to="/acolyte/remediation" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:underline">
            <ListChecks className="w-4 h-4" /> Open Remediation Queue <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col items-center justify-center text-center">
          <PostureGauge score={assessment.overall_score} />
          <div className="text-xs text-slate-500 mt-2">Assessed {assessment.assessment_date || '—'}</div>
        </div>
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Domain Breakdown</h3>
          <PostureDomainBars domainScores={assessment.domain_scores} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={onDone} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
          Back to Assessments
        </button>
        <Link to="/acolyte/reports" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200">
          Generate Monthly Review Pack <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <span className="text-[11px] text-slate-400 block" style={{ color: band.color }}>{band.label}</span>
    </div>
  );
}