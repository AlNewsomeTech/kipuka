import { ShieldCheck, BookMarked, AlertTriangle } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

// Groups policies into "Core CMMC Policies" (the per-family generated set) and
// "Supplemental Library" (imported templates). Each policy shows mapped control
// chips + family; legacy-flagged items show an amber applicability note.
// `renderActions(policy)` optionally renders row actions on the right.
const CORE_CATEGORIES = new Set([
  'Access Control', 'Awareness and Training', 'Audit and Accountability', 'Configuration Management',
  'Identification and Authentication', 'Incident Response', 'Maintenance', 'Media Protection',
  'Personnel Security', 'Physical Protection', 'Risk Assessment', 'Security Assessment',
  'System and Communications Protection', 'System and Information Integrity',
  // legacy category buckets from policyTemplates.js
  'Media & Physical', 'Operations', 'Monitoring & Awareness', 'Protection & Data', 'Governance',
]);

function isCore(p) {
  // Core = family-generated docs (have a family_code or a known CMMC family category),
  // and NOT explicitly supplemental/legacy.
  if (p.policy_category === 'Supplemental' || p.policy_category === 'Legacy — review applicability') return false;
  return !!p.family_code || CORE_CATEGORIES.has(p.policy_category);
}

function PolicyRow({ p, renderActions }) {
  const isLegacy = p.policy_category === 'Legacy — review applicability';
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-800 truncate">{p.policy_name}</div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
            <span>{p.policy_category}</span>
            {p.family_code && <span className="font-mono bg-slate-100 text-slate-500 px-1.5 rounded">{p.family_code}</span>}
            {p.doc_kind && <span>· {p.doc_kind}</span>}
          </div>
        </div>
        {p.approval_status && <StatusBadge status={p.approval_status} size="xs" />}
        {renderActions && <div className="flex-shrink-0">{renderActions(p)}</div>}
      </div>
      {(p.mapped_control_ids || []).length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {p.mapped_control_ids.map((c) => (
            <span key={c} className="text-[10px] font-mono font-semibold text-brand bg-[#479dcf1a] border border-[#479dcf55] px-1.5 py-0.5 rounded">{c}</span>
          ))}
        </div>
      )}
      {isLegacy && (
        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          Review applicability for cloud-first environments before adopting this policy.
        </div>
      )}
      {p.unresolved_placeholders_count > 0 && (
        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {p.unresolved_placeholders_count} unresolved merge variable(s): {p.unresolved_placeholders}. Fill in the company profile or edit before finalizing.
        </div>
      )}
    </div>
  );
}

function Group({ icon: Icon, title, items, renderActions }) {
  if (!items.length) return null;
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <Icon className="w-4 h-4 text-brand" />
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        <span className="text-xs text-slate-400">({items.length})</span>
      </div>
      <div className="divide-y divide-slate-100">
        {items.map((p) => <PolicyRow key={p.id} p={p} renderActions={renderActions} />)}
      </div>
    </div>
  );
}

export default function PolicyLibraryGroups({ policies, renderActions }) {
  const core = policies.filter(isCore);
  const supplemental = policies.filter((p) => !isCore(p));
  return (
    <div className="space-y-4">
      <Group icon={ShieldCheck} title="Core CMMC Policies" items={core} renderActions={renderActions} />
      <Group icon={BookMarked} title="Supplemental Library" items={supplemental} renderActions={renderActions} />
    </div>
  );
}