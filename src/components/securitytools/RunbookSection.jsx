import { Link } from 'react-router-dom';
import { Target, ListChecks, Camera, ShieldCheck, Upload, AlertTriangle, ExternalLink, FileText } from 'lucide-react';
import RunbookChecklistItem from './RunbookChecklistItem';

// Renders one runbook section. Variants are driven by section flags:
// checklist / steps / evidenceFiles / controls / isNaming / isUpload /
// isMapping / isGaps / isFinal.
export default function RunbookSection({
  runbook, section, index, project, toolName, progressMap, currentUser, readOnly,
  onProgressChange, onUploadEvidence, onCreateGap,
}) {
  const sectionProgress = (label) => progressMap[`${section.key}::${label}`] || null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden scroll-mt-4" id={`section-${section.key}`}>
      <div className="bg-[#0F1E3C] px-5 py-3 flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center text-[13px] font-bold flex-shrink-0">{index}</span>
        <h3 className="text-[16px] font-bold text-white">{section.title}</h3>
        {section.conditional && <span className="ml-auto text-[11px] font-semibold text-amber-200 bg-amber-500/20 px-2 py-0.5 rounded-full">Conditional</span>}
      </div>
      <div className="p-5 space-y-4">
        {section.purpose && (
          <div className="flex items-start gap-2">
            <Target className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-[14px] text-slate-600 leading-[1.55]"><span className="font-semibold text-slate-700">Purpose:</span> {section.purpose}</p>
          </div>
        )}
        {section.conditional && (
          <p className="text-[13px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{section.conditional}</p>
        )}

        {/* Checklist-style sections (overview + final review) — persisted checkboxes */}
        {section.checklist && (
          <div className="divide-y divide-slate-100">
            {section.checklist.map((label) => (
              <RunbookChecklistItem
                key={label}
                project={project}
                toolName={toolName}
                section={section.key}
                label={label}
                progress={sectionProgress(label)}
                currentUser={currentUser}
                readOnly={readOnly}
                onChange={onProgressChange}
              />
            ))}
          </div>
        )}

        {/* Numbered steps */}
        {section.steps && (
          <div>
            <h4 className="text-[12px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><ListChecks className="w-4 h-4" /> Step-by-Step Instructions</h4>
            <ol className="space-y-1.5">
              {section.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded bg-slate-100 text-slate-600 flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-[15px] text-slate-700 leading-[1.55]">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Extra lists (recommended policies, example gaps) */}
        {section.lists?.map((list) => (
          <div key={list.label}>
            <h4 className="text-[12px] font-bold text-slate-500 uppercase tracking-wide mb-2">{list.label}</h4>
            <ul className="space-y-1.5">
              {list.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-[15px] text-slate-700 leading-[1.5]"><span className="text-slate-400 mt-0.5 flex-shrink-0">•</span> {item}</li>
              ))}
            </ul>
          </div>
        ))}

        {/* Evidence collection table (gather sections) */}
        {section.evidenceTable && (
          <div>
            <h4 className="text-[12px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Camera className="w-4 h-4" /> Required Evidence Package</h4>
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
              {section.evidenceTable.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5 px-3 py-2">
                  <span className="text-[11px] font-mono text-slate-400 mt-0.5 w-6 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-[15px] text-slate-700 leading-[1.5]">{item}</span>
                </div>
              ))}
            </div>
            {onUploadEvidence && !readOnly && (
              <button onClick={onUploadEvidence} className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
                <Upload className="w-4 h-4" /> Upload Evidence to Vault
              </button>
            )}
          </div>
        )}

        {/* Evidence file names for this section */}
        {section.evidenceFiles && (
          <div>
            <h4 className="text-[12px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><Camera className="w-4 h-4" /> Required Screenshot / Report File Names</h4>
            <div className="bg-slate-900 rounded-lg p-3 space-y-1">
              {section.evidenceFiles.map((f, i) => (
                <div key={i} className="text-green-400 font-mono text-[12px] break-all">{f}</div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested control mappings for this section */}
        {section.controls && (
          <div>
            <h4 className="text-[12px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Suggested CMMC Control Mappings</h4>
            <div className="flex flex-wrap gap-1.5">
              {section.controls.map((cid) => (
                <span key={cid} className="inline-flex items-center px-2 py-1 rounded-full text-[12px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200">{cid}</span>
              ))}
            </div>
          </div>
        )}

        {/* Naming standard */}
        {section.isNaming && <NamingStandard naming={runbook.evidenceNaming} />}

        {/* Upload — the numbered steps already render above; add the CTA */}
        {section.isUpload && onUploadEvidence && !readOnly && (
          <button onClick={onUploadEvidence} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
            <Upload className="w-4 h-4" /> Open Evidence Upload (source: {toolName})
          </button>
        )}

        {/* Mapping guidance */}
        {section.isMapping && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-[14px] text-amber-800 leading-[1.5]">{section.importantNote}</p>
            </div>
            {runbook.mappingGroups?.map((g) => (
              <div key={g.label}>
                <p className="text-[13px] font-semibold text-slate-700 mb-1.5">{g.label}:</p>
                <div className="flex flex-wrap gap-1.5">
                  {g.controls.map((cid) => (
                    <span key={cid} className="inline-flex items-center px-2 py-0.5 rounded-full text-[12px] font-mono bg-blue-50 text-blue-700 border border-blue-200">{cid}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Gaps — POA&M / ACOLYTE creation */}
        {section.isGaps && (
          <div className="flex flex-wrap gap-2 pt-1">
            {onCreateGap && !readOnly && (
              <>
                <button onClick={() => onCreateGap('poam')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
                  <AlertTriangle className="w-4 h-4" /> Create POA&amp;M Item
                </button>
                <button onClick={() => onCreateGap('acolyte')} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200">
                  <ExternalLink className="w-4 h-4" /> Create ACOLYTE Remediation
                </button>
              </>
            )}
            <Link to={`/projects/${project.id}/poam`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900">
              <FileText className="w-4 h-4" /> Open POA&amp;M Tracker
            </Link>
          </div>
        )}

        {/* Final review warning */}
        {section.isFinal && runbook.finalWarning && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-[14px] text-red-800 leading-[1.5] font-medium">{runbook.finalWarning}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function NamingStandard({ naming }) {
  if (!naming) return null;
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[13px] font-semibold text-slate-700 mb-1.5">Required file naming format:</p>
        <div className="bg-slate-900 rounded-lg p-3">
          <div className="text-green-400 font-mono text-[13px] break-all">{naming.format}</div>
        </div>
      </div>
      <div>
        <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Examples</p>
        <div className="bg-slate-900 rounded-lg p-3 space-y-1">
          {naming.examples.map((ex, i) => <div key={i} className="text-green-400 font-mono text-[12px] break-all">{ex}</div>)}
        </div>
      </div>
      <div>
        <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Rules</p>
        <ul className="space-y-1.5">
          {naming.rules.map((r, i) => <li key={i} className="flex items-start gap-2 text-[15px] text-slate-700 leading-[1.5]"><span className="text-slate-400 mt-0.5 flex-shrink-0">•</span> {r}</li>)}
        </ul>
      </div>
    </div>
  );
}