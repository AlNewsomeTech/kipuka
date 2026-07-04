import { X, ShieldAlert } from 'lucide-react';
import { REPORT_SECTIONS } from '@/lib/acolyteReportSections';
import { ACOLYTE_BRAND } from '@/lib/acolyte';
import StatusBadge from '@/components/StatusBadge';

// In-app branded preview of an ACOLYTE executive report.
export default function ReportPreview({ report, project, orgName, demo, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Report Preview</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">
          {/* Branded header band */}
          <div className="bg-[#0F1E3C] rounded-lg p-5 text-white mb-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-[11px] font-bold tracking-wider text-white/70">ACOLYTE · PACIFIC GLOBAL SECURITY GROUP</div>
                <h1 className="text-lg font-bold mt-0.5">{report.report_title}</h1>
              </div>
              <StatusBadge status={report.report_status} size="xs" />
            </div>
            <div className="text-white/70 text-xs mt-2 flex flex-wrap gap-x-4 gap-y-0.5">
              <span>Organization: <b className="text-white">{orgName}</b></span>
              <span>Project: <b className="text-white">{project?.project_name}</b></span>
              <span>Report date: <b className="text-white">{new Date().toLocaleDateString()}</b></span>
              <span>{ACOLYTE_BRAND.preparedBy}</span>
            </div>
          </div>

          {demo && (
            <div className="mb-4 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              DEMO ONLY — Sample ACOLYTE data. Not for submission or external distribution.
            </div>
          )}

          <div className="space-y-4">
            {REPORT_SECTIONS.map(([key, label]) => (
              <div key={key}>
                <h3 className="text-sm font-bold text-slate-800 border-b border-slate-200 pb-1 mb-1.5">{label}</h3>
                {report[key] ? (
                  <div className="prose prose-slate prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: report[key] }} />
                ) : (
                  <p className="text-sm text-slate-400 italic">—</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 flex items-start gap-2 text-[11px] text-slate-500">
            <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div>{ACOLYTE_BRAND.confidential}</div>
              <div className="italic mt-0.5">{ACOLYTE_BRAND.reportDisclaimer}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}