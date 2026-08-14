import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Check, ChevronRight, Copy, ExternalLink, Globe2, History,
  Loader2, PauseCircle, Play, Plus, Radar, ScrollText, ShieldCheck, Target,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAcolyteScope } from '@/lib/useAcolyteScope';
import {
  WEBSITE_SCAN_SEVERITIES,
  formatScanDate,
  websiteScoreClass,
  websiteScanStatusClass,
  websiteSeverityClass,
} from '@/lib/websiteScanner';
import AcolyteHeader from '@/components/acolyte/AcolyteHeader';
import AcolyteProjectBar from '@/components/acolyte/AcolyteProjectBar';
import NoProjectState from '@/components/acolyte/NoProjectState';
import WebsiteTargetModal from '@/components/acolyte/WebsiteTargetModal';

const TABS = [
  { key: 'targets', label: 'Targets', icon: Target },
  { key: 'history', label: 'Scan History', icon: History },
  { key: 'findings', label: 'Findings', icon: AlertTriangle },
  { key: 'logs', label: 'Event Logs', icon: ScrollText },
];

const OPEN_FINDING_STATUSES = new Set(['Open', 'Acknowledged', 'Remediation Created']);

function Badge({ children, className = '' }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${className}`}>{children}</span>;
}

function SummaryCard({ label, value, detail, icon: Icon, tone = 'text-slate-600' }) {
  return (
    <div className="app-surface rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <Icon className={`h-4 w-4 ${tone}`} /> {label}
      </div>
      <div className={`mt-2 text-2xl font-bold ${tone}`}>{value}</div>
      <div className="mt-1 text-[11px] text-slate-500">{detail}</div>
    </div>
  );
}

export default function WebsiteScanner() {
  const scope = useAcolyteScope();
  const {
    project, projects, projectId, selectProject, orgNameForProject, readOnly, user,
  } = scope;
  const canOperate = !readOnly && ['admin', 'technician'].includes(user?.role);
  const [clients, setClients] = useState([]);
  const [targets, setTargets] = useState([]);
  const [scans, setScans] = useState([]);
  const [findings, setFindings] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedScanId, setSelectedScanId] = useState('');
  const [tab, setTab] = useState('targets');
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [runningTargetId, setRunningTargetId] = useState('');
  const [promotingId, setPromotingId] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('All');
  const [findingScanFilter, setFindingScanFilter] = useState('All');

  const load = useCallback(async () => {
    if (!projectId) {
      setTargets([]);
      setScans([]);
      setFindings([]);
      setClients([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [targetRows, scanRows, findingRows, clientRows] = await Promise.all([
        base44.entities.WebsiteScanTarget.filter({ project_id: projectId }, '-created_date', 500),
        base44.entities.WebsiteScan.filter({ project_id: projectId }, '-requested_at', 500),
        base44.entities.WebsiteScanFinding.filter({ project_id: projectId }, '-detected_at', 500),
        base44.entities.Client.list('-created_date', 500).catch(() => []),
      ]);
      setTargets(targetRows);
      setScans(scanRows);
      setFindings(findingRows);
      setClients(clientRows.filter((client) => client.organization_id === project?.organization_id));
      setSelectedScanId((current) => (
        current && scanRows.some((scan) => scan.id === current)
          ? current
          : (scanRows[0]?.id || '')
      ));
    } catch (loadError) {
      setError(loadError?.response?.data?.error || loadError?.message || 'Website scanner data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [projectId, project?.organization_id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let alive = true;
    if (!selectedScanId) {
      setLogs([]);
      return undefined;
    }
    setLogsLoading(true);
    base44.entities.WebsiteScanLog
      .filter({ scan_id: selectedScanId }, 'sequence', 500)
      .then((rows) => { if (alive) setLogs(rows); })
      .catch((logError) => {
        if (alive) {
          setLogs([]);
          setError(logError?.response?.data?.error || logError?.message || 'The scan event log could not be loaded.');
        }
      })
      .finally(() => { if (alive) setLogsLoading(false); });
    return () => { alive = false; };
  }, [selectedScanId]);

  const clientName = useCallback((id) => {
    const client = clients.find((row) => row.id === id);
    return client?.legal_name || client?.dba_name || orgNameForProject || 'Organization client';
  }, [clients, orgNameForProject]);

  const selectedScan = scans.find((scan) => scan.id === selectedScanId) || null;
  const activeTargets = targets.filter((target) => target.status === 'Active').length;
  const openFindings = findings.filter((finding) => OPEN_FINDING_STATUSES.has(finding.status));
  const seriousFindings = openFindings.filter((finding) => ['Critical', 'High'].includes(finding.severity)).length;
  const latestCompleted = scans.find((scan) => scan.status === 'Completed');

  const filteredFindings = useMemo(() => findings.filter((finding) => (
    (severityFilter === 'All' || finding.severity === severityFilter)
    && (findingScanFilter === 'All' || finding.scan_id === findingScanFilter)
  )), [findings, severityFilter, findingScanFilter]);

  const runScan = async (target) => {
    setError('');
    setRunningTargetId(target.id);
    try {
      const response = await base44.functions.invoke('runWebsiteScan', {
        action: 'run_scan',
        target_id: target.id,
      });
      const completed = response?.data?.scan;
      if (completed?.id) {
        setSelectedScanId(completed.id);
        setTab('history');
      }
      await load();
    } catch (scanError) {
      setError(scanError?.response?.data?.error || scanError?.message || 'The website scan failed.');
      await load();
    } finally {
      setRunningTargetId('');
    }
  };

  const setTargetStatus = async (target, status) => {
    setError('');
    try {
      await base44.functions.invoke('runWebsiteScan', {
        action: 'set_target_status',
        target_id: target.id,
        status,
      });
      await load();
    } catch (statusError) {
      setError(statusError?.message || 'The target status could not be changed.');
    }
  };

  const promoteFinding = async (finding) => {
    setError('');
    setPromotingId(finding.id);
    try {
      await base44.functions.invoke('runWebsiteScan', {
        action: 'promote_finding',
        finding_id: finding.id,
      });
      await load();
    } catch (promoteError) {
      setError(promoteError?.response?.data?.error || promoteError?.message || 'The finding could not be added to ACOLYTE Cyber Findings.');
    } finally {
      setPromotingId('');
    }
  };

  const openScanLogs = (scan) => {
    setSelectedScanId(scan.id);
    setTab('logs');
  };

  const copyDigest = () => {
    if (!selectedScan?.log_sha256) return;
    navigator.clipboard?.writeText(selectedScan.log_sha256).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <div className="space-y-4">
      <AcolyteHeader
        title="Website Vulnerability Scanner"
        subtitle="Authorized, non-destructive public website checks with client assignment, findings, run history, and hash-chained event logs."
        icon={Radar}
        right={canOperate && project ? (
          <button onClick={() => setModal(true)} className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0F1E3C] hover:bg-slate-100">
            <Plus className="h-4 w-4" /> Add Website
          </button>
        ) : null}
      />
      <AcolyteProjectBar projects={projects} projectId={projectId} onSelect={selectProject} orgName={orgNameForProject} />

      {!project ? (
        <NoProjectState />
      ) : (
        <>
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-slate-700">
            <span className="font-bold text-blue-900">Safe scan scope:</span> public HTTP and HTTPS configuration only. The scanner does not submit forms, test credentials, inject payloads, brute-force paths, or access unrelated domains. Every target requires a recorded authorization attestation.
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <SummaryCard label="Active targets" value={activeTargets} detail={`${targets.length} assigned to this project`} icon={Globe2} tone="text-blue-600" />
                <SummaryCard label="Latest score" value={latestCompleted?.security_score ?? 'Not run'} detail={latestCompleted ? formatScanDate(latestCompleted.completed_at) : 'Run the first authorized scan'} icon={ShieldCheck} tone={websiteScoreClass(latestCompleted?.security_score)} />
                <SummaryCard label="Open findings" value={openFindings.length} detail={`${seriousFindings} critical or high`} icon={AlertTriangle} tone={seriousFindings ? 'text-red-600' : 'text-amber-600'} />
                <SummaryCard label="Recorded scans" value={scans.length} detail={`${scans.filter((scan) => scan.status === 'Failed').length} failed runs retained`} icon={History} tone="text-slate-700" />
              </div>

              <div className="app-surface overflow-hidden rounded-xl border border-slate-200">
                <div className="flex overflow-x-auto border-b border-slate-200 px-2">
                  {TABS.map((item) => {
                    const Icon = item.icon;
                    const count = item.key === 'targets' ? targets.length
                      : item.key === 'history' ? scans.length
                        : item.key === 'findings' ? findings.length
                          : logs.length;
                    return (
                      <button key={item.key} onClick={() => setTab(item.key)}
                        className={`flex items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-bold transition ${tab === item.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                        <Icon className="h-4 w-4" /> {item.label}
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{count}</span>
                      </button>
                    );
                  })}
                </div>

                {tab === 'targets' && (
                  <div>
                    {targets.length === 0 ? (
                      <Empty icon={Target} title="No websites assigned" detail={canOperate ? 'Add the first authorized client website to begin.' : 'No authorized website targets are assigned to this project.'} />
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {targets.map((target) => (
                          <div key={target.id} className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-sm font-bold text-slate-900">{target.target_name}</h3>
                                  <Badge className={target.status === 'Active' ? 'border-green-200 bg-green-50 text-green-700' : 'border-slate-200 bg-slate-100 text-slate-600'}>{target.status}</Badge>
                                  {target.authorization_attested && <Badge className="border-blue-200 bg-blue-50 text-blue-700"><ShieldCheck className="mr-1 h-3 w-3" /> Authorized</Badge>}
                                </div>
                                <a href={target.start_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs font-medium text-blue-600 hover:underline">
                                  {target.start_url} <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                </a>
                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                                  <span>Client: <b className="text-slate-700">{clientName(target.client_id)}</b></span>
                                  <span>Profile: <b className="text-slate-700">{target.scan_profile}</b></span>
                                  <span>Pages: <b className="text-slate-700">{target.max_pages}</b></span>
                                  <span>Last scan: <b className="text-slate-700">{formatScanDate(target.last_scan_at)}</b></span>
                                </div>
                              </div>
                              <div className="flex flex-shrink-0 items-center gap-2">
                                {target.last_security_score != null && (
                                  <div className="mr-2 text-right">
                                    <div className={`text-xl font-bold ${websiteScoreClass(target.last_security_score)}`}>{target.last_security_score}</div>
                                    <div className="text-[10px] uppercase text-slate-400">score</div>
                                  </div>
                                )}
                                {canOperate && (
                                  <>
                                    <button onClick={() => runScan(target)} disabled={target.status !== 'Active' || Boolean(runningTargetId)}
                                      className="btn-primary disabled:opacity-50">
                                      {runningTargetId === target.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                                      {runningTargetId === target.id ? 'Scanning' : 'Run Scan'}
                                    </button>
                                    <button onClick={() => setTargetStatus(target, target.status === 'Active' ? 'Paused' : 'Active')}
                                      className="btn-secondary" title={target.status === 'Active' ? 'Pause target' : 'Activate target'}>
                                      {target.status === 'Active' ? <PauseCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            {runningTargetId === target.id && (
                              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                                The scan is running in this window. Standard scans may take several minutes depending on page response times.
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {tab === 'history' && (
                  <div>
                    {scans.length === 0 ? (
                      <Empty icon={History} title="No scan history" detail="Completed and failed runs will remain here with their recorded totals." />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                            <tr>
                              <th className="px-4 py-3">Target</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3">Score</th>
                              <th className="px-4 py-3">Findings</th>
                              <th className="px-4 py-3">Coverage</th>
                              <th className="px-4 py-3">Completed</th>
                              <th className="px-4 py-3"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {scans.map((scan) => (
                              <tr key={scan.id} className={selectedScanId === scan.id ? 'bg-blue-50/60' : ''}>
                                <td className="px-4 py-3">
                                  <div className="font-semibold text-slate-800">{scan.target_name || scan.hostname}</div>
                                  <div className="mt-0.5 text-[11px] text-slate-500">{scan.requested_by_name || scan.requested_by_email}</div>
                                </td>
                                <td className="px-4 py-3"><Badge className={websiteScanStatusClass(scan.status)}>{scan.status}</Badge></td>
                                <td className={`px-4 py-3 text-base font-bold ${websiteScoreClass(scan.security_score)}`}>{scan.security_score ?? 'Not scored'}</td>
                                <td className="px-4 py-3">
                                  <div className="font-semibold text-slate-800">{scan.finding_count || 0}</div>
                                  <div className="text-[10px] text-slate-500">{scan.critical_count || 0} critical, {scan.high_count || 0} high</div>
                                </td>
                                <td className="px-4 py-3 text-slate-600">{scan.pages_scanned || 0} pages<br />{scan.requests_made || 0} requests</td>
                                <td className="px-4 py-3 text-slate-600">{formatScanDate(scan.completed_at || scan.requested_at)}</td>
                                <td className="px-4 py-3">
                                  <button onClick={() => openScanLogs(scan)} className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline">
                                    Logs <ChevronRight className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'findings' && (
                  <div>
                    <div className="flex flex-wrap gap-3 border-b border-slate-200 p-3">
                      <select className="form-input w-auto" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)}>
                        <option value="All">All severities</option>
                        {WEBSITE_SCAN_SEVERITIES.map((severity) => <option key={severity}>{severity}</option>)}
                      </select>
                      <select className="form-input min-w-[220px] w-auto" value={findingScanFilter} onChange={(event) => setFindingScanFilter(event.target.value)}>
                        <option value="All">All scan runs</option>
                        {scans.map((scan) => <option key={scan.id} value={scan.id}>{formatScanDate(scan.requested_at)} · {scan.target_name}</option>)}
                      </select>
                    </div>
                    {filteredFindings.length === 0 ? (
                      <Empty icon={ShieldCheck} title="No findings in this view" detail="Adjust the filters or run an authorized website scan." />
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {filteredFindings.map((finding) => (
                          <div key={finding.id} className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className={websiteSeverityClass(finding.severity)}>{finding.severity}</Badge>
                                  <h3 className="text-sm font-bold text-slate-900">{finding.title}</h3>
                                  <Badge className="border-slate-200 bg-slate-100 text-slate-600">{finding.status}</Badge>
                                </div>
                                <div className="mt-1 break-all text-[11px] text-blue-600">{finding.affected_url}</div>
                                <p className="mt-2 text-xs leading-relaxed text-slate-700">{finding.description}</p>
                                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600">
                                  <span className="font-bold text-slate-700">Observed:</span> {finding.evidence}
                                </div>
                                <p className="mt-2 text-xs text-slate-600"><span className="font-bold">Fix:</span> {finding.recommendation}</p>
                              </div>
                              {canOperate && (
                                <button onClick={() => promoteFinding(finding)} disabled={Boolean(finding.cyber_finding_id) || promotingId === finding.id}
                                  className="btn-secondary flex-shrink-0 disabled:opacity-50">
                                  {promotingId === finding.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                                  {finding.cyber_finding_id ? 'Added to Findings' : 'Add to ACOLYTE Findings'}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {tab === 'logs' && (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-3">
                      <select className="form-input min-w-[260px] w-auto" value={selectedScanId} onChange={(event) => setSelectedScanId(event.target.value)}>
                        <option value="">Select a scan run</option>
                        {scans.map((scan) => <option key={scan.id} value={scan.id}>{formatScanDate(scan.requested_at)} · {scan.target_name} · {scan.status}</option>)}
                      </select>
                      {selectedScan?.log_sha256 && (
                        <button onClick={copyDigest} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
                          {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                          {copied ? 'Digest copied' : 'Copy log SHA-256'}
                        </button>
                      )}
                    </div>

                    {selectedScan && (
                      <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-3 sm:grid-cols-4">
                        <Mini label="Request ID" value={selectedScan.request_id || 'Not recorded'} mono />
                        <Mini label="Scanner" value={selectedScan.scanner_version || 'Not recorded'} />
                        <Mini label="Duration" value={selectedScan.duration_ms != null ? `${(selectedScan.duration_ms / 1000).toFixed(1)} seconds` : 'Not recorded'} />
                        <Mini label="Log entries" value={logs.length} />
                      </div>
                    )}

                    {logsLoading ? (
                      <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
                    ) : !selectedScanId ? (
                      <Empty icon={ScrollText} title="Select a scan run" detail="Choose a scan to inspect its ordered request, finding, and lifecycle events." />
                    ) : logs.length === 0 ? (
                      <Empty icon={ScrollText} title="No log entries available" detail="The selected run has no persisted event records." />
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {logs.map((log) => (
                          <details key={log.id} className="group p-3">
                            <summary className="flex cursor-pointer list-none items-start gap-3">
                              <span className="w-8 flex-shrink-0 font-mono text-[11px] text-slate-400">#{String(log.sequence).padStart(3, '0')}</span>
                              <Badge className={log.level === 'Error' ? 'border-red-200 bg-red-50 text-red-700' : log.level === 'Warning' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-100 text-slate-600'}>{log.level}</Badge>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-slate-800">{log.message}</div>
                                <div className="mt-0.5 truncate text-[10px] text-slate-500">{formatScanDate(log.event_time)} · {log.event_type}{log.request_url ? ` · ${log.request_url}` : ''}</div>
                              </div>
                              <ChevronRight className="h-4 w-4 text-slate-400 transition group-open:rotate-90" />
                            </summary>
                            <div className="ml-11 mt-3 space-y-2 rounded-lg border border-slate-200 bg-slate-950 p-3 font-mono text-[11px]">
                              <div className="break-all text-green-400">entry_hash: {log.entry_hash}</div>
                              <div className="break-all text-slate-400">previous_hash: {log.previous_hash || 'GENESIS'}</div>
                              <pre className="overflow-x-auto whitespace-pre-wrap text-slate-300">{JSON.stringify(log.details || {}, null, 2)}</pre>
                            </div>
                          </details>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {modal && project && (
        <WebsiteTargetModal
          project={project}
          clients={clients}
          organizationName={orgNameForProject}
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); load(); }}
        />
      )}
    </div>
  );
}

function Empty({ icon: Icon, title, detail }) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100"><Icon className="h-5 w-5 text-slate-500" /></div>
      <div className="mt-3 text-sm font-bold text-slate-800">{title}</div>
      <div className="mt-1 max-w-md text-xs text-slate-500">{detail}</div>
    </div>
  );
}

function Mini({ label, value, mono = false }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 truncate text-xs font-semibold text-slate-700 ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}
