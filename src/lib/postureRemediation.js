// Auto-generated remediation plan from a completed PostureAssessment.
//
// For every No / Partial answer, create (or idempotently update) an
// AcolyteRemediationItem. Reuses the existing Remediation Queue entity —
// never a parallel system.
import { base44 } from '@/api/base44Client';
import { POSTURE_QUESTIONS, lowerSeverity } from '@/lib/postureAssessment';
import { daysFromNow, OPEN_REMEDIATION_STATUSES } from '@/lib/acolyte';

// Map posture severity -> AcolyteRemediationItem priority.
const SEV_TO_PRIORITY = { Critical: 'Urgent', High: 'High', Medium: 'Medium', Low: 'Low' };
const SEV_RANK = { Low: 1, Medium: 2, High: 3, Critical: 4 };

function dueForSeverity(sev) {
  return SEV_RANK[sev] >= SEV_RANK.High ? daysFromNow(45) : daysFromNow(90);
}

// Returns { added, updated, closureSuggested } counts and the affected items.
export async function generateRemediationFromAssessment({ assessment, project }) {
  const answers = assessment.answers || {};
  const orgId = assessment.organization_id;
  const projectId = assessment.project_id || project?.id || '';

  // Existing OPEN remediation items for this org/project, keyed by posture question.
  const existing = await base44.entities.AcolyteRemediationItem
    .filter(projectId ? { project_id: projectId } : { organization_id: orgId })
    .catch(() => []);
  const openByKey = {};
  for (const item of existing) {
    if (item.posture_question_key && OPEN_REMEDIATION_STATUSES.includes(item.status)) {
      openByKey[item.posture_question_key] = item;
    }
  }

  const toCreate = [];
  const closureSuggested = [];
  let updated = 0;

  for (const q of POSTURE_QUESTIONS) {
    const ans = answers[q.key]?.answer;
    const open = openByKey[q.key];

    if (ans === 'No' || ans === 'Partial') {
      const severity = ans === 'No' ? q.severity_if_no : lowerSeverity(q.severity_if_no);
      const priority = SEV_TO_PRIORITY[severity] || 'Medium';

      if (open) {
        // Idempotent: update severity if worsened, link the new assessment.
        const patch = { source_assessment_id: assessment.id, posture_question_key: q.key };
        const openRank = SEV_RANK[revPriority(open.priority)] || 0;
        if (SEV_RANK[severity] > openRank) patch.priority = priority;
        await base44.entities.AcolyteRemediationItem.update(open.id, patch).catch(() => {});
        updated += 1;
      } else {
        toCreate.push({
          organization_id: orgId,
          project_id: projectId,
          posture_question_key: q.key,
          source_assessment_id: assessment.id,
          remediation_title: q.remediation_title,
          remediation_description: q.remediation_description,
          priority,
          status: 'Not Started',
          due_date: dueForSeverity(severity),
          related_control_ids: q.related_control_ids || [],
        });
      }
    } else if (ans === 'Yes' && open) {
      // Previously failing, now Yes — suggest closure review, do NOT auto-close.
      const note = (open.progress_notes ? open.progress_notes + '\n' : '') +
        `[${new Date().toISOString().slice(0, 10)}] Posture assessment now answers "Yes" for this item — review for closure.`;
      await base44.entities.AcolyteRemediationItem.update(open.id, { progress_notes: note }).catch(() => {});
      closureSuggested.push(open);
    }
  }

  const created = toCreate.length
    ? await base44.entities.AcolyteRemediationItem.bulkCreate(toCreate).catch(() => [])
    : [];

  return { added: toCreate.length, updated, closureSuggested: closureSuggested.length, createdItems: created };
}

// Reverse-map priority label back to a severity key for rank comparison.
function revPriority(priority) {
  if (priority === 'Urgent') return 'Critical';
  if (priority === 'High') return 'High';
  if (priority === 'Medium') return 'Medium';
  return 'Low';
}