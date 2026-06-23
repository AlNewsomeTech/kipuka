import { useState } from 'react';
import { ChevronDown, Copy, Check } from 'lucide-react';
import { stepSections } from './stepContent';

export default function StepAccordion() {
  const [openKey, setOpenKey] = useState('A');
  const [copiedKey, setCopiedKey] = useState(null);

  const copySteps = (section, e) => {
    e.stopPropagation();
    const text = `${section.title}\n\n${section.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopiedKey(section.key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-[#0F1E3C] px-5 py-3">
        <h3 className="text-sm font-semibold text-white">Step-by-Step Walkthrough</h3>
      </div>
      <div className="divide-y divide-slate-200">
        {stepSections.map(section => {
          const isOpen = openKey === section.key;
          return (
            <div key={section.key}>
              <button onClick={() => setOpenKey(isOpen ? null : section.key)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                <div className="flex items-center gap-3 text-left">
                  <span className="w-7 h-7 rounded-full bg-[#0F1E3C] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{section.key}</span>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{section.title}</div>
                    <div className="text-xs text-slate-500">{section.description}</div>
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-5 pb-4 pt-1">
                  <div className="flex justify-end mb-2">
                    <button onClick={(e) => copySteps(section, e)} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium">
                      {copiedKey === section.key ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy Instructions</>}
                    </button>
                  </div>
                  <ol className="space-y-1.5">
                    {section.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                        <span className="text-sm text-slate-700 leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}