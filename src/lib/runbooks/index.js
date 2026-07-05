import { NINJAONE_RUNBOOK } from './ninjaoneRunbook';
import { CORTEX_RUNBOOK } from './cortexRunbook';

// Runbook lookup by slug (matches TOOL_CATALOG.runbook and RUNBOOK_TO_TOOL).
export const RUNBOOKS_BY_SLUG = {
  ninjaone: NINJAONE_RUNBOOK,
  cortex: CORTEX_RUNBOOK,
};

export function runbookForSlug(slug) {
  return RUNBOOKS_BY_SLUG[slug] || null;
}

export function runbookForTool(toolName) {
  return Object.values(RUNBOOKS_BY_SLUG).find((r) => r.tool_name === toolName) || null;
}

// Derive default control support suggestions from a runbook: unique control IDs
// across all sections, with the section that suggests them. Used to seed
// ToolControlMapping when a tool is first enabled so the compact "Related
// Security Tools" area can appear on the right controls.
export function defaultControlMappingsForTool(toolName) {
  const rb = runbookForTool(toolName);
  if (!rb) return [];
  const map = new Map();
  rb.sections.forEach((s) => {
    (s.controls || []).forEach((cid) => {
      if (!map.has(cid)) map.set(cid, { control_id: cid, support_type: 'Supporting Evidence Source' });
    });
  });
  return [...map.values()];
}