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
  ACOLYTE_PROFILE_UPDATE: 'ACOLYTE Profile Updated',
  ACOLYTE_REVIEW_CREATE: 'ACOLYTE Readiness Review Created',
  ACOLYTE_REVIEW_UPDATE: 'ACOLYTE Readiness Review Updated',
  ACOLYTE_REVIEW_ARCHIVE: 'ACOLYTE Readiness Review Archived',
  ACOLYTE_FINDING_CREATE: 'ACOLYTE Cyber Finding Created',
  ACOLYTE_FINDING_UPDATE: 'ACOLYTE Cyber Finding Updated',
  ACOLYTE_FINDING_CLOSE: 'ACOLYTE Cyber Finding Closed',
  ACOLYTE_FINDING_ACCEPT_RISK: 'ACOLYTE Cyber Finding Risk Accepted',
  ACOLYTE_REMEDIATION_CREATE: 'ACOLYTE Remediation Item Created',
  ACOLYTE_REMEDIATION_UPDATE: 'ACOLYTE Remediation Item Updated',
  ACOLYTE_REMEDIATION_COMPLETE: 'ACOLYTE Remediation Item Completed',
  ACOLYTE_REMEDIATION_DEFER: 'ACOLYTE Remediation Item Deferred',
  ACOLYTE_INCIDENT_UPDATE: 'ACOLYTE Incident Readiness Updated',
  ACOLYTE_REPORT_CREATE: 'ACOLYTE Executive Report Created',
  ACOLYTE_REPORT_EXPORT: 'ACOLYTE Executive Report Exported',
  ACOLYTE_REPORT_ARCHIVE: 'ACOLYTE Executive Report Archived',
  ACOLYTE_ASSISTANT_APPLY: 'ACOLYTE Analyst Assistant Content Applied',
  ACOLYTE_WEBSITE_TARGET_CREATE: 'ACOLYTE Website Target Created',
  ACOLYTE_WEBSITE_TARGET_UPDATE: 'ACOLYTE Website Target Updated',
  ACOLYTE_WEBSITE_SCAN_RUN: 'ACOLYTE Website Scan Run',
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