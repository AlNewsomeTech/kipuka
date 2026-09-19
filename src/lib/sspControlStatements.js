import { base44 } from '@/api/base44Client';
import { appendSspBoilerplate, escapeSspText, resolveSspBoilerplate, SSP_TOOL_BOILERPLATE } from '@/lib/sspBoilerplate';
import { resolveVariant, stackKeyForProject, stackLabel } from '@/lib/implementationStacks';

export function hasSspStatement(value) {
  return Boolean(String(value || '').replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;|\s|\u200b/g, ''));
}
const p = (text) => `<p>${escapeSspText(text)}</p>`;
const text = (value) => String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

// Reuse the maintained, control-specific runbooks rather than copying requirements
// or maintaining a second 110-control content catalog. No assessment is changed.
function standardStatement(assessment, entry, project, tools, mappings) {
  if (assessment.status === 'Not Applicable') {
    return p('Draft applicability narrative — requires review; this text does not approve an applicability decision.')
      + p(`Recorded rationale: ${text(assessment.not_applicable_justification) || 'A project-specific scope justification still needs to be documented.'}`)
      + p(`Supporting scope records: ${text(assessment.not_applicable_scope_evidence) || 'Supporting scope evidence still needs to be identified.'}`);
  }
  const { variant, usedKey, fellBack } = resolveVariant(entry, stackKeyForProject(project));
  const outcome = text(variant?.outcome || entry?.ssp_statement_starter);
  if (!outcome) throw new Error(`Implementation guidance is missing for ${assessment.control_id}; no empty statement was created.`);
  const settings = text(variant?.setting_to_change);
  const responsibility = text(assessment.responsible_owner || variant?.responsible_role || project.project_owner_name);
  const source = [variant?.where_to_go?.name, outcome, settings].filter(Boolean).join(' ');
  const mapped = mappings.filter((m) => m.active !== false && m.support_type !== 'Not Applicable' && m.control_id === assessment.control_id).map((m) => m.tool_name).join(' ');
  const supporting = Object.entries(SSP_TOOL_BOILERPLATE).filter(([key, definition]) => tools[key] && definition.match.test(`${source} ${mapped}`));
  const verification = (variant?.validation_steps || []).filter((step) => typeof step === 'string').map(text).filter(Boolean);
  let result = p('Pac-Sec standard implementation — draft for review. The following describes the control-specific implementation baseline, not verified deployment or an assessment finding.');
  result += p(outcome);
  if (settings && settings !== outcome) result += p(`Configuration and operating standard: ${settings}`);
  if (responsibility) result += p(`Operational responsibility: ${responsibility}`);
  if (supporting.length) result += p(`Supporting services selected for this draft: ${supporting.map(([, definition]) => `${definition.name} (${definition.role})`).join('; ')}. Confirm the licensed functions, actual coverage, and policy assignments before treating the baseline as implemented.`);
  if (verification.length) result += p(`Verification procedure: ${verification.join(' ')}`);
  if (fellBack) result += p(`Guidance source: ${stackLabel(usedKey)}. Review and adapt this reference design to the project's ${project.implementation_stack || 'documented'} environment; it does not enable or add any tool to scope.`);
  result += p('Retain the applicable approved procedure, configuration records, and operating results for this control. Resolve differences between this baseline and the deployed environment before independent review; generating this statement does not accept evidence, close a POA&M, or mark the control complete.');
  return result;
}

export function planSspControlStatements({ project, assessments, statements, library, context, mappings = [] }) {
  const belongs = (row) => row.project_id === project.id && (!row.organization_id || row.organization_id === project.organization_id);
  if (assessments.some((row) => !belongs(row)) || statements.some((row) => !belongs(row))) throw new Error('SSP statement sources do not match this project.');
  const entries = new Map(library.filter((row) => row.active !== false).map((row) => [row.control_id, row]));
  const { tools } = resolveSspBoilerplate({ ...context, project });
  const byControl = new Map();
  for (const statement of statements) {
    if (byControl.has(statement.control_id)) throw new Error(`Multiple SSP statements exist for ${statement.control_id}; review the duplicates before rebuilding.`);
    byControl.set(statement.control_id, statement);
  }
  const seen = new Set();
  return assessments.map((assessment) => {
    if (seen.has(assessment.control_id)) throw new Error(`Duplicate assessment for ${assessment.control_id}; review it before rebuilding.`);
    seen.add(assessment.control_id);
    const existing = byControl.get(assessment.control_id);
    // Independently approved statement text is never silently regenerated.
    if (existing?.statement_status === 'Approved') return null;
    const standard = standardStatement(assessment, entries.get(assessment.control_id), project, tools, mappings.filter(belongs));
    let narrative = existing?.implementation_statement || '';
    if (hasSspStatement(assessment.ssp_statement)) {
      const sourceText = text(assessment.ssp_statement);
      if (!text(narrative).includes(sourceText)) narrative += `${hasSspStatement(narrative) ? '\n\n<p><br></p>' : ''}${assessment.ssp_statement}`;
    }
    narrative = appendSspBoilerplate(narrative, '', standard);
    if (existing && narrative === existing.implementation_statement) return null;
    return {
      id: existing?.id,
      data: {
        implementation_statement: narrative,
        statement_status: 'Draft',
        ...(!existing ? { control_id: assessment.control_id, control_title: assessment.control_title || entries.get(assessment.control_id)?.control_title || '', responsible_owner: assessment.responsible_owner || '' } : {}),
      },
    };
  }).filter(Boolean);
}

export async function saveSspControlStatements(project, sspId, plan) {
  const creates = plan.filter((item) => !item.id).map(({ data }) => ({ ...data, organization_id: project.organization_id, project_id: project.id, ssp_id: sspId }));
  if (creates.length) await base44.entities.SSPControlStatement.bulkCreate(creates);
  const updates = plan.filter((item) => item.id);
  // Use the existing role-aware update route, including for client-role writers.
  // Bounded batches avoid issuing 110 simultaneous requests on a repair build.
  for (let offset = 0; offset < updates.length; offset += 5) {
    await Promise.all(updates.slice(offset, offset + 5).map(({ id, data }) => base44.entities.SSPControlStatement.update(id, { ...data, ssp_id: sspId })));
  }
}