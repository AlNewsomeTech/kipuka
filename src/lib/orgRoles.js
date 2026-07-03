// Organization role permission matrix. Pure data + helpers.

export const ORG_ROLES = [
  'Organization Owner',
  'Organization Admin',
  'Compliance Manager',
  'IT Admin',
  'Evidence Contributor',
  'Executive Viewer',
  'Auditor Viewer',
  'Pac-Sec Support',
  'Pac-Sec Admin',
];

export const PACSEC_ROLES = ['Pac-Sec Admin', 'Pac-Sec Support'];

// Permission capabilities. Keep granular so pages can gate actions.
export const PERMS = {
  MANAGE_ORG_SETTINGS: 'manage_org_settings',
  MANAGE_USERS: 'manage_users',
  UPLOAD_EVIDENCE: 'upload_evidence',
  DELETE_EVIDENCE: 'delete_evidence',
  MANAGE_TECHNICAL: 'manage_technical', // asset inventory, control responses
  MANAGE_COMPLIANCE: 'manage_compliance', // assessments, SSP, POA&M, policies
  EXPORT: 'export',
  CREATE_PROJECT: 'create_project',
  VIEW_DASHBOARDS: 'view_dashboards',
  VIEW_ALL_ORGS: 'view_all_orgs',
  PACSEC_SUPPORT: 'pacsec_support',
};

const ALL = Object.values(PERMS).filter((p) => p !== PERMS.VIEW_ALL_ORGS);

const ROLE_PERMS = {
  'Pac-Sec Admin': Object.values(PERMS),
  'Pac-Sec Support': [PERMS.PACSEC_SUPPORT, PERMS.VIEW_DASHBOARDS, PERMS.MANAGE_ORG_SETTINGS, PERMS.MANAGE_USERS, PERMS.MANAGE_COMPLIANCE, PERMS.MANAGE_TECHNICAL, PERMS.UPLOAD_EVIDENCE, PERMS.EXPORT],
  'Organization Owner': ALL,
  'Organization Admin': ALL,
  'Compliance Manager': [PERMS.MANAGE_COMPLIANCE, PERMS.EXPORT, PERMS.CREATE_PROJECT, PERMS.UPLOAD_EVIDENCE, PERMS.VIEW_DASHBOARDS],
  'IT Admin': [PERMS.MANAGE_TECHNICAL, PERMS.UPLOAD_EVIDENCE, PERMS.VIEW_DASHBOARDS],
  'Evidence Contributor': [PERMS.UPLOAD_EVIDENCE, PERMS.VIEW_DASHBOARDS],
  'Executive Viewer': [PERMS.VIEW_DASHBOARDS],
  'Auditor Viewer': [PERMS.VIEW_DASHBOARDS], // read-only
};

export function roleHasPerm(role, perm) {
  const perms = ROLE_PERMS[role] || [];
  return perms.includes(perm);
}

export function isPacSec(role) {
  return PACSEC_ROLES.includes(role);
}

export function isReadOnly(role) {
  return role === 'Auditor Viewer' || role === 'Executive Viewer';
}

export function canManageUsers(role) {
  return roleHasPerm(role, PERMS.MANAGE_USERS);
}