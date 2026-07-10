import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, X, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { CUI_HOSTING } from '@/lib/cuiHosting';
import { enablePreveilTool } from '@/lib/enablePreveil';
import CuiHostingDecision from '@/components/cui/CuiHostingDecision';

// Amber warning banner + decision modal for an existing Level 2 project whose CUI
// hosting is missing/undecided and whose environment cannot hold CUI.
// Writes cui_hosting + cui_hosting_notes onto the ScopingProfile, and offers a
// one-click "Enable PreVeil in Security Tooling" when PreVeil is selected.
export default function CuiHostingBanner({ project, scoping, readOnly, currentUser, onResolved }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [hosting, setHosting] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [enabledPreveil, setEnabledPreveil] = useState(false);

  const save = async () => {
    if (!hosting) return;
    setSaving(true);
    const payload = { cui_hosting: hosting, cui_hosting_notes: notes || '' };
    if (scoping?.id) {
      await base44.entities.ScopingProfile.update(scoping.id, payload).catch(() => {});
    } else {
      await base44.entities.ScopingProfile.create({
        organization_id: project.organization_id, project_id: project.id,
        scope_name: `${project.project_name} — Assessment Scope`, scope_status: 'Draft',
        handles_cui: true, ...payload,
      }).catch(() => {});
    }
    setSaving(false);
    setSaved(true);
    if (hosting !== CUI_HOSTING.PREVEIL) {
      // Non-PreVeil: close and refresh.
      onResolved?.();
      setOpen(false);
    }
  };

  const enablePreveil = async () => {
    setEnabling(true);
    await enablePreveilTool({ project, currentUser }).catch(() => {});
    setEnabling(false);
    setEnabledPreveil(true);
    onResolved?.();
  };

  return (
    <>
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-amber-900">CUI hosting decision required — your current environment cannot hold CUI</h3>
            <p className="text-[13px] text-amber-800 mt-1 leading-relaxed">
              This Level 2 project handles CUI, but no compliant CUI hosting architecture has been selected. Microsoft 365 Commercial cannot store, process, or transmit CUI — choose where your CUI will live to define the correct assessment boundary.
            </p>
            {!readOnly && (
              <button
                onClick={() => setOpen(true)}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700"
              >
                Choose CUI hosting <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Where will your CUI live?</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <CuiHostingDecision hosting={hosting} notes={notes} onChange={(h, n) => { setHosting(h); setNotes(n); setSaved(false); }} compact />

            {/* PreVeil one-click enable, shown after saving the PreVeil choice */}
            {saved && hosting === CUI_HOSTING.PREVEIL && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                {enabledPreveil ? (
                  <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
                    <CheckCircle2 className="w-4 h-4" /> PreVeil enabled in Security Tooling with seeded control mappings.
                    <button onClick={() => navigate(`/projects/${project.id}/security-tooling`)} className="ml-auto text-blue-600 hover:underline">Open Security Tooling</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-[13px] text-blue-800">Set up PreVeil now — this enables the tool and seeds its suggested control mappings.</p>
                    <button onClick={enablePreveil} disabled={enabling}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-60">
                      {enabling ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Enable PreVeil in Security Tooling
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mt-5">
              {!(saved && hosting === CUI_HOSTING.PREVEIL) && (
                <button onClick={save} disabled={saving || !hosting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-60">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save CUI hosting
                </button>
              )}
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">
                {enabledPreveil ? 'Done' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}