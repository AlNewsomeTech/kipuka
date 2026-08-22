import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';

const TARGET_VERSION = 6;
const CONCURRENCY = 12;

function needsRewrite(control) {
  return Object.values(control?.how_to_implement || {}).some(
    (variant) => variant && typeof variant === 'object' && variant.clarity_rewrite_version !== TARGET_VERSION,
  );
}

export default function RunbookClarityMigration() {
  const started = useRef(false);
  const [status, setStatus] = useState({ phase: 'Preparing', total: 0, completed: 0, rewritten: 0, rejected: 0, failures: [] });

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;

    const run = async () => {
      try {
        const controls = await base44.entities.ControlLibrary.filter({ active: true, framework: 'CMMC' }, 'sort_order', 500);
        const pending = controls.filter(needsRewrite);
        if (cancelled) return;
        setStatus({ phase: 'Rewriting', total: pending.length, completed: 0, rewritten: 0, rejected: 0, failures: [] });

        let cursor = 0;
        const summary = { completed: 0, rewritten: 0, rejected: 0, failures: [] };

        const worker = async () => {
          while (!cancelled) {
            const index = cursor;
            cursor += 1;
            if (index >= pending.length) return;
            const control = pending[index];
            try {
              const response = await base44.functions.invoke('rewriteRunbookSteps', {
                mode: 'apply',
                limit: 1,
                control_id: control.control_id,
              });
              const data = response.data || {};
              summary.completed += 1;
              summary.rewritten += Number(data.variants_rewritten || 0);
              summary.rejected += Number(data.variants_rejected || 0);
              if (data.variants_rejected) {
                summary.failures.push({ control_id: control.control_id, results: data.results || [] });
              }
            } catch (error) {
              summary.completed += 1;
              summary.rejected += 1;
              summary.failures.push({ control_id: control.control_id, error: error?.response?.data?.error || error.message || 'Rewrite failed' });
            }
            if (!cancelled) setStatus({ phase: 'Rewriting', total: pending.length, ...summary, failures: [...summary.failures] });
          }
        };

        await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length || 1) }, worker));
        if (!cancelled) setStatus({ phase: 'Complete', total: pending.length, ...summary, failures: [...summary.failures] });
      } catch (error) {
        if (!cancelled) setStatus((current) => ({ ...current, phase: 'Failed', failures: [{ error: error.message || 'Migration failed' }] }));
      }
    };

    run();
    return () => { cancelled = true; };
  }, []);

  const percent = status.total ? Math.round((status.completed / status.total) * 100) : status.phase === 'Complete' ? 100 : 0;

  return (
    <div className="mx-auto max-w-3xl p-8 space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Runbook clarity migration</h1>
      <p className="text-sm text-slate-600">Rewriting every active guided control for a non-technical reader using the Microsoft 365 Commercial baseline. Keep this page open until it finishes.</p>
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex justify-between text-sm font-semibold text-slate-700"><span>{status.phase}</span><span>{percent}%</span></div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} /></div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>Controls: <strong>{status.completed}/{status.total}</strong></div>
          <div>Variants rewritten: <strong>{status.rewritten}</strong></div>
          <div>Variants rejected: <strong>{status.rejected}</strong></div>
          <div>Controls with issues: <strong>{status.failures.length}</strong></div>
        </div>
      </div>
      {status.failures.length > 0 && (
        <details className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <summary className="cursor-pointer font-semibold text-amber-900">Rejected controls</summary>
          <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-xs text-amber-950">{JSON.stringify(status.failures, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
