import { SCOPE_CATEGORIES } from '@/lib/assetCategories';

// Count-per-scope-category header for the org asset inventory.
export default function AssetCategorySummary({ assets }) {
  const counts = {};
  for (const c of SCOPE_CATEGORIES) counts[c.value] = 0;
  for (const a of assets) {
    const key = a.scope_category && counts[a.scope_category] !== undefined ? a.scope_category : 'Unknown';
    counts[key] += 1;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {SCOPE_CATEGORIES.map((c) => (
        <div key={c.value} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
            <span className="text-2xl font-bold text-slate-900">{counts[c.value]}</span>
          </div>
          <div className="text-[13px] font-medium text-slate-500 leading-tight">{c.label}</div>
        </div>
      ))}
    </div>
  );
}