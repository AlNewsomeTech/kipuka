import { useState } from 'react';
import { CheckCircle2, Circle, ChevronRight, ChevronLeft } from 'lucide-react';
import ProgressBar from '@/components/ProgressBar';

const wizardSteps = [
  { key: 'prerequisites', title: 'Confirm Prerequisites', description: 'Verify SAM, UEI, CAGE, EB POC, CAM, SSP, scope, and AO are ready.' },
  { key: 'path', title: 'Select Client Path', description: 'Choose Existing PIEE User or New PIEE User.' },
  { key: 'role', title: 'Request SPRS Role', description: 'Add or request the SPRS Cyber Vendor User role in PIEE. Wait for CAM approval.' },
  { key: 'level', title: 'Choose Assessment Level', description: 'Select Level 1 or Level 2 Self-Assessment.' },
  { key: 'enter', title: 'Enter Assessment in SPRS', description: 'Open Cyber Reports and enter the CMMC self-assessment data.' },
  { key: 'transfer', title: 'Transfer to AO', description: 'If not the AO, transfer the assessment to the Affirming Official.' },
  { key: 'affirm', title: 'AO Affirms Assessment', description: 'The AO reviews and affirms the assessment in SPRS.' },
  { key: 'record', title: 'Record Evidence', description: 'Save CMMC UID, status, expiration date, screenshots, and submission date.' },
];

export default function CertificationWizard({ completed, onToggleStep, record, onUpdate }) {
  const [current, setCurrent] = useState(0);
  const completedList = completed || [];
  const step = wizardSteps[current];
  const isComplete = completedList.includes(step.key);
  const progress = (completedList.length / wizardSteps.length) * 100;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800">Client Wizard Mode</h3>
        <span className="text-xs text-slate-500">{completedList.length}/{wizardSteps.length} steps</span>
      </div>
      <ProgressBar value={progress} color="navy" size="sm" />
      <div className="flex items-center gap-1.5 mt-4 mb-3 overflow-x-auto pb-1">
        {wizardSteps.map((s, i) => (
          <button key={s.key} onClick={() => setCurrent(i)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs whitespace-nowrap ${i === current ? 'bg-[#0F1E3C] text-white' : completedList.includes(s.key) ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
            {completedList.includes(s.key) ? <CheckCircle2 className="w-3 h-3" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
            <span className="hidden sm:inline">{s.title}</span>
          </button>
        ))}
      </div>
      <div className="border border-slate-200 rounded-lg p-4">
        <div className="flex items-start gap-3 mb-3">
          {isComplete ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-slate-300 flex-shrink-0 mt-0.5" />}
          <div>
            <h4 className="text-sm font-semibold text-slate-800">Step {current + 1}: {step.title}</h4>
            <p className="text-xs text-slate-600 mt-1">{step.description}</p>
          </div>
        </div>
        {step.key === 'path' && (
          <div className="ml-8 mb-3">
            <select className="form-input" value={record?.piee_user_status || ''} onChange={e => onUpdate({ piee_user_status: e.target.value })}>
              <option value="">Select path...</option>
              <option value="Existing PIEE User">Existing PIEE User</option>
              <option value="New PIEE User">New PIEE User</option>
            </select>
          </div>
        )}
        {step.key === 'level' && (
          <div className="ml-8 mb-3">
            <select className="form-input" value={record?.assessment_level || ''} onChange={e => onUpdate({ assessment_level: e.target.value })}>
              <option value="">Select level...</option>
              <option value="Level 1 Self-Assessment">Level 1 Self-Assessment</option>
              <option value="Level 2 Self-Assessment">Level 2 Self-Assessment</option>
            </select>
          </div>
        )}
        <div className="flex items-center justify-between ml-8">
          <div className="flex gap-2">
            <button disabled={current === 0} onClick={() => setCurrent(c => c - 1)} className="flex items-center gap-1 text-xs text-slate-500 disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /> Prev</button>
            <button disabled={current === wizardSteps.length - 1} onClick={() => setCurrent(c => c + 1)} className="flex items-center gap-1 text-xs text-slate-500 disabled:opacity-30">Next <ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
          <button onClick={() => onToggleStep(step.key)} className={`text-xs font-medium px-3 py-1.5 rounded-lg ${isComplete ? 'bg-green-100 text-green-700' : 'bg-[#0F1E3C] text-white'}`}>
            {isComplete ? '✓ Marked Complete' : 'Mark Complete'}
          </button>
        </div>
      </div>
    </div>
  );
}