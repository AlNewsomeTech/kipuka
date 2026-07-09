// TEMPORARY RLS PROBE PAGE — DELETE (with its route and the probeSetClientUser
// function, probe orgs, and probe ControlAssessment records) once the tenancy
// probe concludes.
//
// Purpose: prove whether the {{user.organization_id}} RLS template on
// ControlAssessment actually enforces tenant isolation.
//
// As PLATFORM ADMIN: shows a form to bind a test user (role=client,
// organization_id=Probe Org A) via the probeSetClientUser function, plus the
// admin control-count (expected: everything).
// As the CLIENT TEST USER: auto-runs the two decisive tests and interprets them.
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const PROBE_ORG_A = '6a4f1b6293936dd268395109'; // RLS Probe Org A — test user bound here
const PROBE_ORG_B = '6a4f1b6293936dd26839510a'; // RLS Probe Org B — foreign org
const FOREIGN_RECORD_ID = '6a4f1b7c6e180f1879d082c3'; // a PROBE-B record the client user must NOT be able to write

export default function RlsProbe() {
  const [me, setMe] = useState(null);
  const [readResult, setReadResult] = useState(null);
  const [writeResult, setWriteResult] = useState(null);
  const [bindEmail, setBindEmail] = useState('');
  const [bindResult, setBindResult] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => { base44.auth.me().then(setMe).catch(() => setMe(null)); }, []);

  const runProbe = async () => {
    setRunning(true);
    try {
      // TEST 1 — UNFILTERED read. RLS is the only thing standing between this
      // call and every org's records.
      let records = [];
      let readErr = null;
      try { records = await base44.entities.ControlAssessment.list(); }
      catch (e) { readErr = e.message; }
      const byOrg = {};
      (records || []).forEach((r) => { const k = r.organization_id || '(none)'; byOrg[k] = (byOrg[k] || 0) + 1; });
      setReadResult({ total: (records || []).length, byOrg, error: readErr, mine: byOrg[PROBE_ORG_A] || 0, foreign: (records || []).length - (byOrg[PROBE_ORG_A] || 0) });

      // TEST 2 — cross-org WRITE attempt on a Probe Org B record. Must be REJECTED.
      try {
        await base44.entities.ControlAssessment.update(FOREIGN_RECORD_ID, { assessor_notes: 'RLS probe write attempt — should have been rejected' });
        setWriteResult({ rejected: false });
      } catch (e) {
        setWriteResult({ rejected: true, message: e.message });
      }
    } finally { setRunning(false); }
  };

  const bindUser = async () => {
    setBindResult({ pending: true });
    try {
      const res = await base44.functions.invoke('probeSetClientUser', { email: bindEmail, organization_id: PROBE_ORG_A });
      setBindResult(res?.data || res);
    } catch (e) { setBindResult({ error: e.message }); }
  };

  const isAdmin = me?.role === 'admin';
  const verdictRead = readResult && !readResult.error
    ? (readResult.total > 0 && readResult.foreign === 0 ? 'PASS' : readResult.total === 0 ? 'MATCHES NOTHING' : 'RULE IGNORED')
    : null;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-5">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Temporary RLS probe.</strong> Delete this page, its route, the probeSetClientUser function,
        and both RLS Probe orgs when the test concludes.
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h1 className="text-lg font-bold text-slate-900">Tenant Isolation Probe — ControlAssessment</h1>
        <p className="text-sm text-slate-500 mt-1">
          Signed in as: <span className="font-semibold">{me?.email || '…'}</span> · platform role: <span className="font-semibold">{me?.role || '…'}</span> · organization_id: <span className="font-mono text-xs">{me?.organization_id || '(none)'}</span>
        </p>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-800">Admin: bind the test user to Probe Org A</h2>
          <p className="text-xs text-slate-500">Invite/register the test account first, then enter its email. This sets role=client and organization_id=Probe Org A via probeSetClientUser.</p>
          <div className="flex gap-2">
            <input value={bindEmail} onChange={(e) => setBindEmail(e.target.value)} placeholder="test-user@email.com"
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            <button onClick={bindUser} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C]">Bind</button>
          </div>
          {bindResult && <pre className="text-xs bg-slate-50 rounded-lg p-3 overflow-auto">{JSON.stringify(bindResult, null, 2)}</pre>}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-800">Run the probe {isAdmin ? '(as admin, expect to see ALL orgs — global access check)' : '(as the client test user — the decisive test)'}</h2>
        <button onClick={runProbe} disabled={running}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] disabled:opacity-60">
          {running ? 'Running…' : 'Run probe now'}
        </button>

        {readResult && (
          <div className="text-sm space-y-2">
            <div className="font-semibold text-slate-800">Test 1 — Unfiltered read</div>
            {readResult.error ? <div className="text-red-600">Read error: {readResult.error}</div> : (
              <div className="bg-slate-50 rounded-lg p-3">
                <div>Total records returned: <strong>{readResult.total}</strong></div>
                <div>From my org (Probe A): <strong>{readResult.mine}</strong> · from other orgs: <strong>{readResult.foreign}</strong></div>
                {!isAdmin && verdictRead && (
                  <div className={`mt-2 font-bold ${verdictRead === 'PASS' ? 'text-green-600' : 'text-red-600'}`}>
                    {verdictRead === 'PASS' && '✅ PASS — RLS scopes reads to my organization only. Templating works.'}
                    {verdictRead === 'RULE IGNORED' && '❌ RULE IGNORED — foreign org records visible. Custom-field templating is NOT enforced. STOP: pivot to function-gatekeeping.'}
                    {verdictRead === 'MATCHES NOTHING' && '❌ MATCHES NOTHING — zero records returned including my own. The template resolves to nothing. STOP: diagnose syntax before rollout.'}
                  </div>
                )}
              </div>
            )}
            <div className="font-semibold text-slate-800 mt-3">Test 2 — Cross-org write attempt (Probe B record)</div>
            {writeResult && (
              <div className={`bg-slate-50 rounded-lg p-3 font-bold ${writeResult.rejected ? 'text-green-600' : 'text-red-600'}`}>
                {writeResult.rejected
                  ? `✅ REJECTED as expected${isAdmin ? ' — unexpected for admin (admins should succeed); check role' : ' — client cannot write foreign org data.'}`
                  : (isAdmin ? '✅ Write succeeded — expected for platform admin (global).' : '❌ WRITE SUCCEEDED — a client user modified another org\u2019s record. CRITICAL FAILURE. STOP.')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
