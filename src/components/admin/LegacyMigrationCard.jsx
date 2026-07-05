import { useState } from 'react';
import { DatabaseZap, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { migrateControlProgressToAssessment } from '@/lib/controlAssessmentMigration';

// Admin-only card: runs the ControlProgress → ControlAssessment migration and
// shows a results report. Never deletes ControlProgress data.
export default function LegacyMigrationCard() {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  const run = async () => {
    setRunning(true);
    setError('');
    setReport(null);
    try {
      const result = await migrateControlProgressToAssessment();
      setReport(result);
    } catch (e) {
      setError(e.message || 'Migration failed to run.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
            <DatabaseZap className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Migrate Legacy Control Data</h3>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              Copies legacy per-client control progress into the ControlAssessment source of truth.
              Only ever upgrades a control forward — safe to re-run. Legacy records are never deleted.
            </p>
          </div>
        </div>
        <button
          onClick={run}
          disabled={running}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-60 flex-shrink-0"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <DatabaseZap className="w-4 h-4" />}
          {running ? 'Migrating…' : 'Run Migration'}
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {report && (
        <div className="mt-4 rounded-lg border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border-b border-green-200 text-sm font-semibold text-green-700">
            <CheckCircle2 className="w-4 h-4" /> Migration complete
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-slate-100">
            <Stat label="Examined" value={report.examined} />
            <Stat label="Created" value={report.created} tone="text-green-700" />
            <Stat label="Upgraded" value={report.upgraded} tone="text-blue-700" />
            <Stat label="Skipped" value={report.skipped} tone="text-slate-500" />
            <Stat label="Errors" value={report.errors.length} tone={report.errors.length ? 'text-red-600' : 'text-slate-500'} />
          </div>
          {report.clientsWithoutProject > 0 && (
            <p className="px-4 py-2 text-xs text-amber-700 bg-amber-50 border-t border-amber-200">
              {report.clientsWithoutProject} legacy record(s) skipped — their client has no linked organization project to migrate into.
            </p>
          )}
          {report.errors.length > 0 && (
            <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-200 max-h-40 overflow-y-auto">
              {report.errors.map((e, i) => <div key={i}>• {e}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone = 'text-slate-900' }) {
  return (
    <div className="px-4 py-3 text-center">
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-[11px] font-medium text-slate-500 mt-0.5 uppercase tracking-wide">{label}</div>
    </div>
  );
}