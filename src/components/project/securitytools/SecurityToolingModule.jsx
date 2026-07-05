import { useState, useEffect, useCallback } from 'react';
import { Wrench, Loader2, CheckCircle2, BookOpen } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { TOOL_CATALOG, toolByName, isToolActive, TOOL_SUPPORT_DISCLAIMER } from '@/lib/securityTools';
import { defaultControlMappingsForTool, runbookForTool } from '@/lib/runbooks';
import ToolCard from '@/components/securitytools/ToolCard';
import ToolDetailsModal from '@/components/securitytools/ToolDetailsModal';
import ToolControlMappingView from '@/components/securitytools/ToolControlMappingView';
import ToolEvidenceChecklistView from '@/components/securitytools/ToolEvidenceChecklistView';
import RunbookViewer from '@/components/securitytools/RunbookViewer';

const TABS = [
  { key: 'selection', label: 'Tool Selection' },
  { key: 'summary', label: 'Enabled Tools' },
  { key: 'runbooks', label: 'Runbooks' },
  { key: 'checklist', label: 'Evidence Checklist' },
  { key: 'mapping', label: 'Control Mapping' },
];

export default function SecurityToolingModule({ project, readOnly, currentUser }) {
  const [tools, setTools] = useState([]); // ProjectSecurityTool records
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('selection');
  const [detailsModal, setDetailsModal] = useState(null); // { tool, record }
  const [savingTool, setSavingTool] = useState(false);
  const [activeRunbookTool, setActiveRunbookTool] = useState(null); // tool name
  const [acolyteEnabled, setAcolyteEnabled] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [rows, acolyte] = await Promise.all([
      base44.entities.ProjectSecurityTool.filter({ project_id: project.id }).catch(() => []),
      base44.entities.AcolyteProfile.filter({ project_id: project.id }).catch(() => []),
    ]);
    setTools(rows);
    setAcolyteEnabled(acolyte.some((a) => a.service_status === 'Active'));
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const recordFor = (name) => tools.find((t) => t.tool_name === name) || null;
  const activeTools = tools.filter((t) => isToolActive(t.tool_status));

  // Seed suggested control mappings for a tool the first time it becomes active.
  const seedMappings = async (toolName) => {
    const existing = await base44.entities.ToolControlMapping.filter({ project_id: project.id, tool_name: toolName }).catch(() => []);
    if (existing.length > 0) return;
    const suggestions = defaultControlMappingsForTool(toolName);
    if (suggestions.length === 0) return;
    await Promise.all(suggestions.map((s) => base44.entities.ToolControlMapping.create({
      organization_id: project.organization_id, project_id: project.id, tool_name: toolName,
      control_id: s.control_id, support_type: s.support_type, active: true,
    })));
  };

  // Create-or-update a tool record with a new status.
  const setStatus = async (tool, newStatus) => {
    const record = recordFor(tool.name);
    const who = currentUser?.full_name || currentUser?.email || '';
    const wasActive = record ? isToolActive(record.tool_status) : false;
    const patch = {
      tool_status: newStatus,
      ...(newStatus === 'Enabled' && !wasActive ? { enabled_by: who, enabled_date: new Date().toISOString().slice(0, 10) } : {}),
    };
    if (record?.id) await base44.entities.ProjectSecurityTool.update(record.id, patch);
    else await base44.entities.ProjectSecurityTool.create({
      organization_id: project.organization_id, project_id: project.id, tool_name: tool.name, ...patch,
    });
    if (isToolActive(newStatus)) await seedMappings(tool.name);
    await load();
  };

  const saveDetails = async (form) => {
    setSavingTool(true);
    const { tool, record } = detailsModal;
    const who = currentUser?.full_name || currentUser?.email || '';
    const wasActive = record ? isToolActive(record.tool_status) : false;
    const payload = {
      organization_id: project.organization_id, project_id: project.id, tool_name: tool.name,
      tool_status: form.tool_status, owner: form.owner,
      admin_contact_name: form.admin_contact_name, admin_contact_email: form.admin_contact_email || undefined,
      notes: form.notes,
      ...(form.tool_status === 'Enabled' && !wasActive ? { enabled_by: who, enabled_date: new Date().toISOString().slice(0, 10) } : {}),
    };
    if (record?.id) await base44.entities.ProjectSecurityTool.update(record.id, payload);
    else await base44.entities.ProjectSecurityTool.create(payload);
    if (isToolActive(form.tool_status)) await seedMappings(tool.name);
    setSavingTool(false);
    setDetailsModal(null);
    await load();
  };

  // Seed evidence checklist rows from runbook evidence packages.
  const seedChecklists = async () => {
    for (const t of activeTools) {
      const rb = runbookForTool(t.tool_name);
      if (!rb) continue;
      const existing = await base44.entities.ToolEvidenceChecklist.filter({ project_id: project.id, tool_name: t.tool_name }).catch(() => []);
      if (existing.length > 0) continue;
      const gather = rb.sections.find((s) => s.evidenceTable);
      if (!gather) continue;
      await Promise.all(gather.evidenceTable.map((title) => base44.entities.ToolEvidenceChecklist.create({
        organization_id: project.organization_id, project_id: project.id, tool_name: t.tool_name,
        checklist_item_title: title, evidence_type: 'Screenshot', upload_status: 'Not Started',
      })));
    }
    await load();
  };

  const openRunbook = (tool) => { setActiveRunbookTool(tool.name); setTab('runbooks'); };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2.5">
          <Wrench className="w-5 h-5 text-[#0F1E3C]" />
          <h1 className="text-lg font-bold text-slate-900">Security Tooling</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl">
          Optional security tools that support CMMC readiness. Enable and configure these as part of the
          Implementation phase, and collect their evidence before generating the Final SSP. {TOOL_SUPPORT_DISCLAIMER}
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === t.key ? 'bg-[#0F1E3C] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tool Selection */}
      {tab === 'selection' && (
        <div className="grid md:grid-cols-2 gap-4">
          {TOOL_CATALOG.map((tool) => (
            <ToolCard
              key={tool.name}
              tool={tool}
              record={recordFor(tool.name)}
              readOnly={readOnly}
              onSetStatus={setStatus}
              onEditDetails={(t, r) => setDetailsModal({ tool: t, record: r })}
              onOpenRunbook={openRunbook}
            />
          ))}
        </div>
      )}

      {/* Enabled Tools Summary */}
      {tab === 'summary' && (
        activeTools.length === 0 ? (
          <Empty text="No tools are enabled or planned yet. Enable a tool under Tool Selection to reveal its runbook." />
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {activeTools.map((t) => {
              const cat = toolByName(t.tool_name);
              const rb = runbookForTool(t.tool_name);
              return (
                <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <h3 className="text-[15px] font-bold text-slate-900">{t.tool_name}</h3>
                    </div>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">{t.tool_status}</span>
                  </div>
                  <p className="text-[13px] text-slate-500 mt-1">{cat?.description}</p>
                  <div className="mt-3 space-y-1 text-[13px] text-slate-600">
                    <div>Owner: <span className="text-slate-800">{t.owner || '—'}</span></div>
                    <div>Admin: <span className="text-slate-800">{t.admin_contact_name || '—'}</span></div>
                  </div>
                  {rb && (
                    <button onClick={() => openRunbook(cat)} className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
                      <BookOpen className="w-3.5 h-3.5" /> Open Runbook
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Runbooks */}
      {tab === 'runbooks' && (
        activeTools.length === 0 ? (
          <Empty text="No tool runbooks available. Enable NinjaOne or Cortex XDR to view its technician runbook." />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {activeTools.filter((t) => runbookForTool(t.tool_name)).map((t) => (
                <button key={t.id} onClick={() => setActiveRunbookTool(t.tool_name)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${activeRunbookTool === t.tool_name ? 'bg-[#0F1E3C] text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                  {t.tool_name}
                </button>
              ))}
            </div>
            {(() => {
              const selected = activeRunbookTool && activeTools.some((t) => t.tool_name === activeRunbookTool)
                ? activeRunbookTool
                : activeTools.find((t) => runbookForTool(t.tool_name))?.tool_name;
              const rb = selected ? runbookForTool(selected) : null;
              if (!rb) return <Empty text="Select a tool with a runbook above." />;
              return <RunbookViewer runbook={rb} project={project} readOnly={readOnly} currentUser={currentUser} acolyteEnabled={acolyteEnabled} />;
            })()}
          </div>
        )
      )}

      {/* Evidence Checklist */}
      {tab === 'checklist' && (
        <ToolEvidenceChecklistView project={project} activeTools={activeTools} readOnly={readOnly} onSeedFromRunbooks={seedChecklists} />
      )}

      {/* Control Mapping */}
      {tab === 'mapping' && (
        <ToolControlMappingView project={project} activeTools={activeTools} readOnly={readOnly} />
      )}

      {detailsModal && (
        <ToolDetailsModal
          tool={detailsModal.tool}
          record={detailsModal.record}
          saving={savingTool}
          onClose={() => setDetailsModal(null)}
          onSave={saveDetails}
        />
      )}
    </div>
  );
}

function Empty({ text }) {
  return <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">{text}</div>;
}