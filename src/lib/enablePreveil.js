import { base44 } from '@/api/base44Client';
import { defaultControlMappingsForTool } from '@/lib/runbooks';
import { isToolActive } from '@/lib/securityTools';

// Enable PreVeil as a ProjectSecurityTool (create or update to "Enabled") and seed
// its suggested control mappings, exactly like the Security Tooling module does.
// Idempotent: won't duplicate mappings if some already exist.
export async function enablePreveilTool({ project, currentUser }) {
  const who = currentUser?.full_name || currentUser?.email || '';
  const existing = await base44.entities.ProjectSecurityTool
    .filter({ project_id: project.id, tool_name: 'PreVeil' }).catch(() => []);
  const record = existing[0] || null;
  const wasActive = record ? isToolActive(record.tool_status) : false;

  const patch = {
    tool_status: 'Enabled',
    ...(!wasActive ? { enabled_by: who, enabled_date: new Date().toISOString().slice(0, 10) } : {}),
  };
  if (record?.id) {
    await base44.entities.ProjectSecurityTool.update(record.id, patch);
  } else {
    await base44.entities.ProjectSecurityTool.create({
      organization_id: project.organization_id, project_id: project.id, tool_name: 'PreVeil', ...patch,
    });
  }

  // Seed suggested mappings only if none exist yet.
  const mappings = await base44.entities.ToolControlMapping
    .filter({ project_id: project.id, tool_name: 'PreVeil' }).catch(() => []);
  const existingIds = new Set(
    mappings
      .filter((mapping) => !mapping.organization_id || mapping.organization_id === project.organization_id)
      .map((mapping) => mapping.control_id),
  );
  const suggestions = defaultControlMappingsForTool('PreVeil')
    .filter((suggestion) => !existingIds.has(suggestion.control_id));
  if (suggestions.length > 0) {
    await Promise.all(suggestions.map((s) => base44.entities.ToolControlMapping.create({
      organization_id: project.organization_id, project_id: project.id, tool_name: 'PreVeil',
      control_id: s.control_id, support_type: s.support_type, active: true,
    })));
  }
}