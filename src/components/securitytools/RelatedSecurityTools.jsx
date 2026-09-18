import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, BookOpen, ListChecks, FolderOpen } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  isToolActive, isToolImplemented, toolImplementsControl, toolByName, TOOL_SUPPORT_DISCLAIMER,
} from '@/lib/securityTools';

// Compact "Related Security Tools" area for a single CMMC control.
// Only renders when:
//   1. The project has that tool Enabled/Planned/In Review, AND
//   2. There is an active ToolControlMapping for this control_id.
// Shows tool name, support type, and links to the runbook, evidence checklist,
// and related evidence. Never claims the tool satisfies the control.
export default function RelatedSecurityTools({ projectId, controlId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!projectId || !controlId) { setLoading(false); return; }
    (async () => {
      const [mappings, tools, evidence] = await Promise.all([
        base44.entities.ToolControlMapping.filter({ project_id: projectId, control_id: controlId, active: true }).catch(() => []),
        base44.entities.ProjectSecurityTool.filter({ project_id: projectId }).catch(() => []),
        base44.entities.ProjectEvidence.filter({ project_id: projectId }).catch(() => []),
      ]);
      if (!alive) return;
      const activeToolNames = new Set(tools.filter((t) => isToolActive(t.tool_status)).map((t) => t.tool_name));
      const rows = mappings
        .filter((m) => activeToolNames.has(m.tool_name))
        .map((m) => {
          const evidenceCount = evidence.filter((e) => e.source_tool === m.tool_name && (e.control_ids || []).includes(controlId)).length;
          const toolRecord = tools.find((tool) => tool.tool_name === m.tool_name);
          return {
            ...m,
            runbook: toolByName(m.tool_name)?.runbook || null,
            evidenceCount,
            implemented: isToolImplemented(toolRecord) && toolImplementsControl(m.tool_name, controlId),
          };
        });
      setEntries(rows);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [projectId, controlId]);

  // Nothing to show → render nothing (no tool section on the control at all).
  if (loading || entries.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="text-[15px] font-bold text-slate-900 mb-1 flex items-center gap-2">
        <Wrench className="w-[18px] h-[18px] text-slate-500" /> Related Security Tools
      </h3>
      <p className="text-[13px] text-slate-500 mb-4">{TOOL_SUPPORT_DISCLAIMER}</p>
      <div className="space-y-3">
        {entries.map((e) => (
          <div key={e.id} className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold text-slate-800">{e.tool_name}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{e.support_type}</span>
                {e.implemented && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                    Implemented - evidence pending
                  </span>
                )}
              </div>
              <span className="text-[12px] text-slate-400">{e.evidenceCount} linked evidence</span>
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              {e.runbook && (
                <Link to={`/projects/${projectId}/security-tooling`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue-600 hover:underline">
                  <BookOpen className="w-3.5 h-3.5" /> Technician Runbook
                </Link>
              )}
              <Link to={`/projects/${projectId}/security-tooling`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-600 hover:text-slate-900">
                <ListChecks className="w-3.5 h-3.5" /> Evidence Checklist
              </Link>
              <Link to={`/projects/${projectId}/evidence`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-600 hover:text-slate-900">
                <FolderOpen className="w-3.5 h-3.5" /> Related Evidence
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}