// Frontend helpers for the optional Microsoft Graph Control Deployment module.
import { base44 } from '@/api/base44Client';

export const DEPLOYMENT_STATUSES = [
  'Precheck Required', 'Ready for Approval', 'Deploying', 'Deployed Pending Verification',
  'Verified', 'Verification Failed', 'Conflict Detected', 'Rolled Back', 'Failed',
];

export const STATUS_STYLES = {
  'Precheck Required': 'bg-slate-100 text-slate-600',
  'Ready for Approval': 'bg-blue-50 text-blue-700',
  'Deploying': 'bg-blue-50 text-blue-700',
  'Deployed Pending Verification': 'bg-amber-50 text-amber-700',
  'Verified': 'bg-green-50 text-green-700',
  'Verification Failed': 'bg-red-50 text-red-700',
  'Conflict Detected': 'bg-orange-50 text-orange-700',
  'Rolled Back': 'bg-purple-50 text-purple-700',
  'Failed': 'bg-red-50 text-red-700',
};

export const DRIFT_STYLES = {
  'Unknown': 'bg-slate-100 text-slate-500',
  'In Sync': 'bg-green-50 text-green-700',
  'Drift Detected': 'bg-red-50 text-red-700',
};

export const MODE_LABELS = {
  report_only: 'Report-only (no enforcement)',
  enabled: 'Enabled',
  create_unassigned: 'Created without assignments',
};

// Whether the module applies to this project's tech stack at all.
export function isMicrosoftStack(project) {
  return /^Microsoft 365/i.test(project?.implementation_stack || '');
}

// Whether the optional capability is enabled for the organization.
// Default (missing field) is DISABLED.
export function graphDeploymentEnabled(organization) {
  return organization?.microsoft_graph_deployment_enabled === true;
}

export async function invokeConnection(payload) {
  const res = await base44.functions.invoke('manageMicrosoftGraphConnection', payload);
  return res.data;
}

export async function invokeDeployment(payload) {
  const res = await base44.functions.invoke('manageMicrosoftDeployment', payload);
  return res.data;
}

export function controlFamily(controlId) {
  return String(controlId || '').split('.')[0] || '';
}