import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Admin-only one-time (re-runnable) migration.
// Populates ControlLibrary.how_to_implement (per-stack variants), estimated_minutes,
// and why_it_matters by adapting existing CMMCControl guidance + DeploymentTask runbook_* content.
// ControlLibrary is public-read, so this makes the click-by-click guidance reachable by client roles.

const SPRS = {
  '3.1.1':5,'3.1.2':5,'3.1.3':1,'3.1.4':1,'3.1.5':3,'3.1.6':1,'3.1.7':1,'3.1.8':1,'3.1.9':1,'3.1.10':1,'3.1.11':1,'3.1.12':5,'3.1.13':5,'3.1.14':1,'3.1.15':1,'3.1.16':5,'3.1.17':5,'3.1.18':5,'3.1.19':3,'3.1.20':1,'3.1.21':1,'3.1.22':1,
  '3.2.1':5,'3.2.2':5,'3.2.3':1,'3.3.1':5,'3.3.2':3,'3.3.3':1,'3.3.4':1,'3.3.5':5,'3.3.6':1,'3.3.7':1,'3.3.8':1,'3.3.9':1,
  '3.4.1':5,'3.4.2':5,'3.4.3':1,'3.4.4':1,'3.4.5':5,'3.4.6':5,'3.4.7':5,'3.4.8':5,'3.4.9':1,
  '3.5.1':5,'3.5.2':5,'3.5.3':5,'3.5.4':1,'3.5.5':1,'3.5.6':1,'3.5.7':1,'3.5.8':1,'3.5.9':1,'3.5.10':5,'3.5.11':1,
  '3.6.1':5,'3.6.2':5,'3.6.3':1,'3.7.1':3,'3.7.2':5,'3.7.3':1,'3.7.4':1,'3.7.5':5,'3.7.6':1,
  '3.8.1':3,'3.8.2':3,'3.8.3':5,'3.8.4':1,'3.8.5':1,'3.8.6':1,'3.8.7':5,'3.8.8':3,'3.8.9':1,
  '3.9.1':3,'3.9.2':5,'3.10.1':5,'3.10.2':5,'3.10.3':1,'3.10.4':1,'3.10.5':1,'3.10.6':1,
  '3.11.1':3,'3.11.2':5,'3.11.3':1,'3.12.1':5,'3.12.2':3,'3.12.3':5,'3.12.4':3,
  '3.13.1':5,'3.13.2':5,'3.13.3':1,'3.13.4':1,'3.13.5':5,'3.13.6':5,'3.13.7':1,'3.13.8':3,'3.13.9':1,'3.13.10':1,'3.13.11':3,'3.13.12':1,'3.13.13':1,'3.13.14':1,'3.13.15':5,'3.13.16':1,
  '3.14.1':5,'3.14.2':5,'3.14.3':5,'3.14.4':5,'3.14.5':5,'3.14.6':5,'3.14.7':3,
};

function shortId(c) {
  const m = String(c || '').match(/3\.\d{1,2}\.\d{1,2}/);
  return m ? m[0] : null;
}
function minutesFor(pts) { return pts >= 5 ? 30 : pts === 3 ? 20 : 15; }
function splitLines(s) {
  if (!s) return [];
  return String(s)
    .split(/\r?\n|(?<=\.)\s+(?=[A-Z0-9])|;\s*/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 12);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (caller.role !== 'admin') return Response.json({ error: 'Forbidden — platform admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;

    const lib = await base44.asServiceRole.entities.ControlLibrary.list('sort_order', 500);
    const cmmc = await base44.asServiceRole.entities.CMMCControl.list('-created_date', 500);
    const tasks = await base44.asServiceRole.entities.DeploymentTask.list('order', 500);

    const cmmcById = {};
    for (const c of cmmc) cmmcById[c.control_id] = c;
    const tasksByCtrl = {};
    for (const t of tasks) { if (t.related_control) (tasksByCtrl[t.related_control] ||= []).push(t); }

    let migrated = 0, generated = 0, enriched = 0, preservedV2 = 0;
    const migratedIds = [], generatedIds = [];
    const updates = [];

    for (const rec of lib) {
      const cid = rec.control_id;

      // Never overwrite the structured v2 layman guidance. The legacy migration
      // may still backfill an old or newly seeded record that lacks v2 content.
      if (rec.how_to_implement?.generic?.outcome && body.force_legacy !== true) {
        preservedV2++;
        continue;
      }
      const pts = SPRS[shortId(cid)] || 1;
      const src = cmmcById[cid];
      const relTasks = tasksByCtrl[cid] || [];
      const runbookTask = relTasks.find((t) => t.runbook_clicks || t.runbook_setting || t.runbook_screenshot || t.runbook_validation);

      const naming = `${cid}_ToolName_Description_YYYY-MM-DD`;

      // ---- M365 Commercial variant (migrated from CMMCControl guidance + DeploymentTask runbook) ----
      let m365 = null;
      if (src || runbookTask) {
        let steps = [];
        if (runbookTask?.runbook_clicks) steps = splitLines(runbookTask.runbook_clicks);
        else if (src?.implementation_guidance) steps = splitLines(src.implementation_guidance);
        if (!steps.length) steps = splitLines(src?.m365_evidence || src?.implementation_guidance || `Configure ${rec.control_title} in the Microsoft 365 admin center.`);

        m365 = {
          where_to_go: {
            name: 'Microsoft 365 / Entra Admin Center',
            url: runbookTask?.admin_center_url || 'https://admin.microsoft.com',
          },
          steps,
          setting_to_change: runbookTask?.runbook_setting || '',
          screenshot_instructions: runbookTask?.runbook_screenshot || src?.required_screenshots || `Capture the configuration screen showing ${cid} is enabled for all in-scope users/devices.`,
          screenshot_naming: naming,
          validation_steps: splitLines(runbookTask?.runbook_validation || src?.required_validation_steps || `Confirm the setting is active and applies to the full scope for ${cid}.`),
          common_mistakes: splitLines(runbookTask?.runbook_mistakes || ''),
        };
        if (runbookTask) enriched++;
        migrated++;
        migratedIds.push(cid);
      } else {
        generated++;
        generatedIds.push(cid);
      }

      // ---- Generic variant (always present, tool-agnostic) ----
      const genSteps = splitLines(src?.implementation_guidance);
      const generic = {
        where_to_go: { name: 'Your primary administration console', url: '' },
        steps: genSteps.length ? genSteps : [
          `Review the requirement: ${rec.requirement_text || rec.control_title}.`,
          `Identify which system(s) in your environment enforce this control.`,
          `Apply the configuration or process so the requirement is fully met for all in-scope users, devices, and data.`,
        ],
        setting_to_change: '',
        screenshot_instructions: src?.required_screenshots || `Capture evidence showing ${cid} is implemented (a configuration screen, policy document, or export).`,
        screenshot_naming: naming,
        validation_steps: splitLines(src?.required_validation_steps || `Verify the control operates as intended and covers the full scope for ${cid}.`),
        common_mistakes: [],
      };

      const how = { generic };
      if (m365) how.m365_commercial = m365;

      updates.push({
        id: rec.id,
        how_to_implement: how,
        estimated_minutes: rec.estimated_minutes && rec.estimated_minutes !== 15 ? rec.estimated_minutes : minutesFor(pts),
        why_it_matters: rec.why_it_matters || `Meeting ${cid} protects the confidentiality and integrity of Federal Contract Information. It is one of the ${pts === 5 ? 'highest-weighted' : 'required'} CMMC practices for your assessment. Skipping it directly lowers your SPRS score.`,
      });
    }

    let written = 0;
    if (!dryRun) {
      for (let i = 0; i < updates.length; i += 25) {
        const batch = updates.slice(i, i + 25);
        await base44.asServiceRole.entities.ControlLibrary.bulkUpdate(batch);
        written += batch.length;
      }
    }

    return Response.json({
      ok: true,
      dry_run: dryRun,
      total_controls: lib.length,
      written,
      migrated_from_source: migrated,
      enriched_with_runbook_clicks: enriched,
      generated_generic_only: generated,
      generated_generic_control_ids: generatedIds,
      preserved_structured_v2_guidance: preservedV2,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});