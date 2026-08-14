export const WEBSITE_SCAN_SEVERITIES = ['Critical', 'High', 'Moderate', 'Low', 'Informational'];
export const WEBSITE_SCAN_STATUSES = ['Queued', 'Running', 'Completed', 'Failed', 'Cancelled'];
export const WEBSITE_FINDING_STATUSES = ['Open', 'Acknowledged', 'Remediation Created', 'Accepted Risk', 'Resolved'];

export const WEBSITE_AUTHORIZATION_STATEMENT =
  'I confirm that this organization owns this website or has written authorization from the owner for non-destructive security scanning.';

export function websiteSeverityClass(severity) {
  return {
    Critical: 'bg-red-50 text-red-700 border-red-200',
    High: 'bg-orange-50 text-orange-600 border-orange-200',
    Moderate: 'bg-amber-50 text-amber-700 border-amber-200',
    Low: 'bg-blue-50 text-blue-700 border-blue-200',
    Informational: 'bg-slate-100 text-slate-600 border-slate-200',
  }[severity] || 'bg-slate-100 text-slate-600 border-slate-200';
}

export function websiteScanStatusClass(status) {
  return {
    Completed: 'bg-green-50 text-green-700 border-green-200',
    Running: 'bg-blue-50 text-blue-700 border-blue-200',
    Queued: 'bg-slate-100 text-slate-600 border-slate-200',
    Failed: 'bg-red-50 text-red-700 border-red-200',
    Cancelled: 'bg-slate-100 text-slate-600 border-slate-200',
  }[status] || 'bg-slate-100 text-slate-600 border-slate-200';
}

export function websiteScoreClass(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return 'text-slate-500';
  if (value >= 90) return 'text-green-600';
  if (value >= 70) return 'text-amber-600';
  return 'text-red-600';
}

export function formatScanDate(value) {
  if (!value) return 'Not yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function normalizeWebsiteUrl(input) {
  const raw = String(input || '').trim();
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  const url = new URL(withScheme);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Use an HTTP or HTTPS website URL.');
  if (url.username || url.password) throw new Error('Do not include credentials in the URL.');
  if (url.port && !['80', '443'].includes(url.port)) throw new Error('Only standard website ports 80 and 443 are supported.');
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!host || host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Enter a public website hostname.');
  }
  url.hostname = host;
  url.hash = '';
  return url;
}
