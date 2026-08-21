// Frontend helpers for the optional ACOLYTE Microsoft Graph monitoring module.
// Monitoring is READ-ONLY and separately entitled from Graph deployment.
import { base44 } from '@/api/base44Client';

// Hidden unless the super-admin enabled the flag AND the organization has an
// ACOLYTE service entitlement. Default (missing field) is DISABLED. The
// backend re-enforces this server-side on every request.
export function acolyteGraphMonitoringEnabled(organization) {
  return organization?.acolyte_microsoft_graph_monitoring_enabled === true
    && (organization?.acolyte_tier || 'none') !== 'none';
}

export async function invokeMonitoring(payload) {
  const res = await base44.functions.invoke('manageAcolyteMicrosoftMonitoring', payload);
  return res.data;
}

export const DRIFT_SEVERITY_STYLES = {
  Critical: 'bg-red-50 text-red-700 border-red-200',
  High: 'bg-orange-50 text-orange-600 border-orange-200',
  Moderate: 'bg-amber-50 text-amber-700 border-amber-200',
  Low: 'bg-blue-50 text-blue-700 border-blue-200',
  Informational: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const CONNECTION_HEALTH_STYLES = {
  Healthy: 'bg-green-50 text-green-700 border-green-200',
  Degraded: 'bg-amber-50 text-amber-700 border-amber-200',
  Failed: 'bg-red-50 text-red-700 border-red-200',
  Unknown: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const TELEMETRY_DISCLAIMER =
  'Microsoft telemetry and configuration evidence support the readiness determination but do not independently prove CMMC compliance.';