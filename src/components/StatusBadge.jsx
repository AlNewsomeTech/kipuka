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
};

export default function StatusBadge({ status, size = 'sm' }) {
  const config = statusConfig[status] || statusConfig['Not Started'];
  const sizeClass = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.bg} ${config.text} ${sizeClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {status}
    </span>
  );
}