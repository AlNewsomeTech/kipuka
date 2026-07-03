import { base44 } from '@/api/base44Client';

// Standardized action types for audit logging.
export const AUDIT_ACTIONS = {
  LOGIN_ACCEPTANCE: 'Login Acceptance',
  ORG_SETTINGS_CHANGE: 'Organization Settings Change',
  USER_ROLE_CHANGE: 'User Role Change',
  EVIDENCE_UPLOAD: 'Evidence Upload',
  EVIDENCE_DELETE: 'Evidence Deletion',
  SSP_EXPORT: 'SSP Export',
  POAM_EXPORT: 'POA&M Export',
  REPORT_EXPORT: 'Report Export',
  PROJECT_CREATE: 'Project Creation',
  PROJECT_DELETE: 'Project Deletion',
  ASSESSMENT_STATUS_CHANGE: 'Assessment Status Change',
  ORG_SUSPEND: 'Organization Suspended',
  ORG_REACTIVATE: 'Organization Reactivated',
};

// Fire-and-forget audit entry. Never throws — logging must not break user flows.
export async function logAudit({
  organizationId = '',
  user = null,
  actionType,
  targetEntity = '',
  targetRecordId = '',
  summary = '',
}) {
  try {
    await base44.entities.AuditLog.create({
      organization_id: organizationId || '',
      user_email: user?.email || '',
      user_name: user?.full_name || '',
      action_type: actionType,
      target_entity: targetEntity,
      target_record_id: targetRecordId,
      action_summary: summary,
      ip_address: '',
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    });
  } catch (e) {
    // Swallow — audit logging is best-effort.
    console.warn('Audit log failed:', e?.message);
  }
}