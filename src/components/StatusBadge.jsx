const statusConfig = {
  'Not Started': { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  'In Progress': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  'Evidence Needed': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'Ready for Review': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'Reviewed': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  'Complete': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  'Blocker': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  'Validated': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  'Approved': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  'Rejected': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  'Not Reviewed': { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  'In Review': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  'Draft': { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  'Published': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  'Open': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  'Mitigating': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'Closed': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  'Pending': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'Active': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  'Disabled': { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  'Compliant': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  'Non-Compliant': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  'Unknown': { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  'Failed': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  'Finalized': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  'Implemented': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  'Partially Implemented': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'Not Implemented': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  'Not Applicable': { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  'Ready for Assessment': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  'Implementation Planned': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  'Implementation In Progress': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  'Implemented Pending Evidence': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'Gap Identified': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  'POA&M Linked': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'Ready for Documentation': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  'Preliminary': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  'Finalized': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  'Needs Validation': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'Needs Update': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'Needs Review': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'No Evidence': { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  'Evidence Uploaded': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  'Needs Better Evidence': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'Accepted': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  'Expired': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  'Planned': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  'Retired': { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  'Overdue': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  'Deferred': { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  'Waiting on Customer': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'Resolved': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  'Final': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  'Conditional': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'Pending Affirmation': { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  'Complete ': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
};

export default function StatusBadge({ status, size = 'sm' }) {
  const config = statusConfig[status] || statusConfig['Not Started'];
  const sizeClass =
    size === 'xs' ? 'text-[11px] px-2 py-0.5' :
    size === 'md' ? 'text-[13px] px-3 py-1' :
    'text-xs px-2.5 py-0.5';
  const dotSize = size === 'md' ? 'w-2 h-2' : 'w-1.5 h-1.5';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${config.bg} ${config.text} ${sizeClass}`}>
      <span className={`${dotSize} rounded-full ${config.dot} flex-shrink-0`} />
      {status}
    </span>
  );
}