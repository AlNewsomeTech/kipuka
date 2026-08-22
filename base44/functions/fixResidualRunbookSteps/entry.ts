// Pass 2 deterministic runbook cleanup (pass 1 fixed six passive/vague steps).
// Fixes the two remaining genuine stored-data problems the clarity audit found:
//   A) where_to_go destination labels that still say "Kipuka ..." — normalized
//      to "This CMMC project ..." wording, matching the display-layer rule.
//   B) Vendor product names inside the vendor-neutral GENERIC variant steps —
//      replaced with exact, pre-approved neutral wording (no LLM, no guessing).
// Originals are archived to MigrationArchive before any change, and changed
// steps must pass the shared stepIssues validator before they are stored.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { MIGRATION_KEY, stepIssues } from '../../shared/runbookClarity.ts';

// Exact-match step replacements for generic variants (full step text).
const GENERIC_STEP_FIXES = {
  'Review the data-flow records and confirm all in-scope Microsoft 365 resources are identified.':
    'Review the data-flow records and confirm all in-scope systems and applications are identified.',
  'Confirm the completed rule states only approved people, service accounts, and managed devices can reach in-scope Microsoft 365 resources.':
    'Confirm the completed rule states only approved people, service accounts, and managed devices can reach in-scope systems and applications.',
  'Confirm the completed rule reads: only approved people, service accounts, and managed devices can reach in-scope Microsoft 365 resources.':
    'Confirm the completed rule reads: only approved people, service accounts, and managed devices can reach in-scope systems and applications.',
  'Confirm privileged accounts are not used for email, browsing, Teams, or routine document work.':
    'Confirm privileged accounts are not used for email, browsing, chat, or routine document work.',
  'Open the Purview audit and retention configuration page.':
    'Open the audit and retention configuration page.',
  'Open the Entra and Azure diagnostic settings and destination page.':
    'Open the diagnostic settings and log destination page.',
  'Open the page showing Intune or security configuration policies and exact settings.':
    'Open the page showing security configuration policies and exact settings.',
  'Export privileged-role assignments from Entra, Azure, Intune, network tools, and all other in-scope applications.':
    'Export privileged-role assignments from identity, cloud, endpoint management, network tools, and all other in-scope applications.',
  'Add one row for Entra tenant roles.':
    'Add one row for directory tenant roles.',
  'Add one row for Intune policy changes.':
    'Add one row for endpoint management policy changes.',
  'Add one row for Azure resources.':
    'Add one row for cloud resources.',
  'Open the page that shows Intune or Firewall or ASR or network enforcement rules.':
    'Open the page that shows endpoint, firewall, or network enforcement rules.',
  'Open the page that shows the Intune app or catalog assignments evidence.':
    'Open the page that shows the approved software catalog assignments evidence.',
};

function fixWhereToGoName(name) {
  let n = String(name || '');
  if (!/kipuka|project workspace/i.test(n)) return n;
  n = n.replace(/Kipuka project workspace/gi, 'This CMMC project');
  n = n.replace(/\bKipuka\b\s*/gi, "this CMMC project's ");
  n = n.replace(/\bproject workspace\b/gi, 'this CMMC project');
  n = n.replace(/\s{2,}/g, ' ').trim();
  // Capitalize the first letter of the label and of any newline-separated line.
  n = n.replace(/(^|\n\s*)([a-z])/g, (m, pre, ch) => pre + ch.toUpperCase());
  return n;
}

async function sha256Hex(input) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const apply = body.mode === 'apply';
    // Microsoft 365 Commercial is the recommended baseline for every client, so
    // the generic variants keep Microsoft product names. This direction
    // reverse-applies the neutral-wording map to restore the Microsoft text.
    const microsoftFirst = body.direction === 'microsoft_first';
    const STEP_FIXES = microsoftFirst
      ? Object.fromEntries(Object.entries(GENERIC_STEP_FIXES).map(([a, b]) => [b, a]))
      : GENERIC_STEP_FIXES;

    const controls = await base44.asServiceRole.entities.ControlLibrary.filter(
      { active: true, framework: 'CMMC' },
      'sort_order',
      500,
    );

    const results = [];
    for (const rec of controls) {
      const hti = rec.how_to_implement || {};
      const changes = [];
      const newHti = {};

      for (const [variantName, variant] of Object.entries(hti)) {
        if (!variant || typeof variant !== 'object') { newHti[variantName] = variant; continue; }
        const updated = { ...variant };

        // A) where_to_go label normalization
        const oldName = String(variant.where_to_go?.name || '');
        const newName = fixWhereToGoName(oldName);
        if (newName !== oldName) {
          updated.where_to_go = { ...variant.where_to_go, name: newName };
          changes.push({ variant: variantName, field: 'where_to_go', before: oldName, after: newName });
        }

        // B) exact generic step replacements
        if (variantName === 'generic' && Array.isArray(variant.steps)) {
          const newSteps = variant.steps.map((s) => STEP_FIXES[String(s)] ?? s);
          const changedIdx = variant.steps
            .map((s, i) => (String(s) !== String(newSteps[i]) ? i + 1 : null))
            .filter((n) => n !== null);
          if (changedIdx.length) {
            const residual = [];
            for (const n of changedIdx) {
              for (const issue of stepIssues(newSteps[n - 1])) residual.push(`step ${n}: ${issue}`);
            }
            if (residual.length) {
              changes.push({ variant: variantName, field: 'steps', rejected: residual });
            } else {
              updated.steps = newSteps;
              changes.push({
                variant: variantName,
                field: 'steps',
                steps_changed: changedIdx,
                after: changedIdx.map((n) => newSteps[n - 1]),
              });
            }
          }
        }

        newHti[variantName] = updated;
      }

      const applicable = changes.filter((c) => !c.rejected);
      if (!applicable.length) continue;

      if (apply) {
        const payload = { control_id: rec.control_id, how_to_implement: hti };
        await base44.asServiceRole.entities.MigrationArchive.create({
          migration_key: MIGRATION_KEY,
          entity_name: 'ControlLibrary',
          source_record_id: rec.id,
          reason: 'Updated',
          payload,
          content_sha256: await sha256Hex(JSON.stringify(payload)),
          archived_at: new Date().toISOString(),
          archived_by: user.email,
        });
        await base44.asServiceRole.entities.ControlLibrary.update(rec.id, { how_to_implement: newHti });
      }

      results.push({ control: rec.control_id, applied: apply, changes });
    }

    return Response.json({
      mode: apply ? 'apply' : 'dry_run',
      controls_changed: results.length,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}