import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Archive, CalendarDays, ChevronDown, ChevronUp, Download,
  ExternalLink, FileCheck2, FileSpreadsheet, Gauge, History, Loader2, ShieldCheck, Upload,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAcolyteScope } from '@/lib/useAcolyteScope';
import AcolyteHeader from '@/components/acolyte/AcolyteHeader';
import AcolyteProjectBar from '@/components/acolyte/AcolyteProjectBar';
import NoProjectState from '@/components/acolyte/NoProjectState';
import SecureScoreUploadModal from '@/components/acolyte/SecureScoreUploadModal';

function formatDate(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function fileSize(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function scoreTone(score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return 'text-slate-500';
  if (value >= 80) return 'text-green-600';
  if (value >= 60) return 'text-amber-600';
  return 'text-red-600';
}

function statusClass(status) {
  if (status === 'Parsed') return 'border-green-200 bg-green-50 text-green-700';
  if (status === 'Archived') return 'border-slate-200 bg-slate-100 text-slate-600';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function Metric({ label, value, detail, icon: Icon, tone = 'text-slate-700' }) {
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

export default function SecureScoreImports() {
  const scope = useAcolyteScope();
  const {
    project, projects, projectId, selectProject, orgNameForProject, readOnly,
  } = scope;
  const [imports, setImports] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [expandedId, setExpandedId] = useState('');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!projectId) {
      setImports([]);
      setClients([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [rows, clientRows] = await Promise.all([
        base44.entities.SecureScoreImport.filter({ project_id: projectId }, '-report_date', 500),
        base44.entities.Client.list('-created_date', 500).catch(() => []),
      ]);
      setImports(rows);
      setClients(clientRows.filter((client) => client.organization_id === project?.organization_id));
    } catch (loadError) {
      setError(loadError?.response?.data?.error || loadError?.message || 'Secure Score exports could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [projectId, project?.organization_id]);

  useEffect(() => { load(); }, [load]);

  const active = useMemo(
    () => imports.filter((item) => item.import_status !== 'Archived')
      .sort((a, b) => String(b.report_date || b.uploaded_at).localeCompare(String(a.report_date || a.uploaded_at))),
    [imports],
  );
  const visible = showArchived ? imports.filter((item) => item.import_status === 'Archived') : active;
  const scored = active.filter((item) => Number.isFinite(Number(item.score_percent)));
  const latest = scored[0] || active[0] || null;
  const previous = latest ? scored.find((item) => item.id !== latest.id) : null;
  const delta = latest && previous
    ? Math.round((Number(latest.score_percent) - Number(previous.score_percent)) * 10) / 10
    : null;

  const clientName = (clientId) => {
    const client = clients.find((row) => row.id === clientId);
    return client?.legal_name || client?.dba_name || orgNameForProject || 'Organization client';
  };

  const download = async (item) => {
    setBusyId(item.id);
    setError('');
    try {
      const response = await base44.functions.invoke('manageSecureScoreImport', {
        action: 'download',
        import_id: item.id,
      });
      const url = response?.data?.signed_url;
      if (!url) throw new Error('The server did not return a download link.');
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (downloadError) {
      setError(downloadError?.response?.data?.error || downloadError?.message || 'The export could not be downloaded.');
    } finally {
      setBusyId('');
    }
  };

  const archive = async (item) => {
    if (!window.confirm(`Archive ${item.file_name}? The file remains preserved and can still be viewed in Archived.`)) return;
    setBusyId(item.id);
    setError('');
    try {
      await base44.functions.invoke('manageSecureScoreImport', {
        action: 'archive',
        import_id: item.id,
      });
      await load();
    } catch (archiveError) {
      setError(archiveError?.response?.data?.error || archiveError?.message || 'The export could not be archived.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="space-y-4">
      <AcolyteHeader
        title="Microsoft Secure Score"
        subtitle="Privately retain Microsoft Secure Score exports, track score history, and preserve verifiable source files by client project."
        icon={ShieldCheck}
        showPositioning={false}
        right={
          <div className="flex flex-wrap gap-2">
            <a href="https://security.microsoft.com/securescore" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20">
              Open Microsoft Secure Score <ExternalLink className="h-4 w-4" />
            </a>
            {!readOnly && project && (
              <button onClick={() => setModal(true)} className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#0F1E3C] hover:bg-slate-100">
                <Upload className="h-4 w-4" /> Upload export
              </button>
            )}
          </div>
        }
      />

      <AcolyteProjectBar projects={projects} projectId={projectId} onSelect={selectProject} orgName={orgNameForProject} />

      {!project ? (
        <NoProjectState />
      ) : (
        <>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-700" />
              <div>
                <h2 className="text-sm font-bold text-blue-900">What to upload</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-700">
                  Upload a CSV exported from Microsoft Secure Score or JSON returned by the Microsoft Graph secureScores endpoint. ACOLYTE records the selected client, report date, source layout, file hash, uploader, score, category summary, and parsing warnings.
                </p>
                <p className="mt-1 text-[11px] text-slate-600">
                  Microsoft Secure Score is a posture indicator, not proof that every CMMC requirement is met. Keep the export as supporting evidence and validate the underlying configuration separately.
                </p>
              </div>
            </div>
          </div>

          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Latest Secure Score"
              value={latest?.score_percent != null ? `${Number(latest.score_percent).toFixed(1)}%` : 'Review'}
              detail={latest ? `Report dated ${formatDate(latest.report_date)}` : 'No export uploaded'}
              icon={Gauge}
              tone={scoreTone(latest?.score_percent)}
            />
            <Metric
              label="Change"
              value={delta == null ? 'No baseline' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)} pts`}
              detail={previous ? `Compared with ${formatDate(previous.report_date)}` : 'Upload another scored export to compare'}
              icon={History}
              tone={delta == null ? 'text-slate-600' : delta >= 0 ? 'text-green-600' : 'text-red-600'}
            />
            <Metric
              label="Active Exports"
              value={active.length}
              detail={`${imports.length - active.length} archived`}
              icon={FileCheck2}
              tone="text-blue-700"
            />
            <Metric
              label="Recommendations"
              value={latest?.recommendation_count ?? 0}
              detail={latest ? `${latest.completed_count || 0} completed or resolved in parsed rows` : 'From the latest recognized export'}
              icon={ShieldCheck}
              tone="text-purple-700"
            />
          </div>

          <div className="app-surface overflow-hidden rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Secure Score export history</h2>
                <p className="mt-0.5 text-xs text-slate-500">Every stored file is private, SHA-256 hashed, and scoped to this project.</p>
              </div>
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
                <button onClick={() => setShowArchived(false)}
                  className={`rounded-md px-3 py-1.5 ${!showArchived ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                  Active ({active.length})
                </button>
                <button onClick={() => setShowArchived(true)}
                  className={`rounded-md px-3 py-1.5 ${showArchived ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                  Archived ({imports.length - active.length})
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center px-5 py-14 text-center">
                <FileSpreadsheet className="h-9 w-9 text-slate-300" />
                <div className="mt-3 text-sm font-bold text-slate-800">{showArchived ? 'No archived exports' : 'No Secure Score exports yet'}</div>
                <div className="mt-1 max-w-md text-xs text-slate-500">
                  {showArchived ? 'Archived Secure Score files will appear here.' : 'Upload the first CSV or Graph JSON export to create a client score baseline.'}
                </div>
                {!showArchived && !readOnly && (
                  <button onClick={() => setModal(true)} className="btn-primary mt-4"><Upload className="h-4 w-4" /> Upload first export</button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {visible.map((item) => {
                  const expanded = expandedId === item.id;
                  const categories = Object.entries(item.category_summary || {});
                  return (
                    <div key={item.id}>
                      <div className="grid items-center gap-3 p-4 lg:grid-cols-[1.4fr_.65fr_.7fr_.7fr_auto]">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <button onClick={() => setExpandedId(expanded ? '' : item.id)}
                              className="min-w-0 truncate text-left text-sm font-bold text-slate-900 hover:text-blue-700">
                              {item.file_name}
                            </button>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass(item.import_status)}`}>
                              {item.import_status}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {clientName(item.client_id)} · {item.source_type} · uploaded by {item.uploaded_by_name || item.uploaded_by_email}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Report date</div>
                          <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                            <CalendarDays className="h-3.5 w-3.5" /> {formatDate(item.report_date)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Score</div>
                          <div className={`mt-1 text-lg font-bold ${scoreTone(item.score_percent)}`}>
                            {item.score_percent == null ? 'Not parsed' : `${Number(item.score_percent).toFixed(1)}%`}
                          </div>
                          {item.current_score != null && item.max_score != null && (
                            <div className="text-[10px] text-slate-500">{item.current_score} of {item.max_score}</div>
                          )}
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Parsed content</div>
                          <div className="mt-1 text-xs font-semibold text-slate-700">{item.record_count || 0} rows · {item.recommendation_count || 0} actions</div>
                          <div className="text-[10px] text-slate-500">{fileSize(item.file_size_bytes)}</div>
                        </div>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => download(item)} disabled={busyId === item.id} title="Download verified export"
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                            {busyId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                          </button>
                          {!readOnly && item.import_status !== 'Archived' && (
                            <button onClick={() => archive(item)} disabled={busyId === item.id} title="Archive export"
                              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                              <Archive className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={() => setExpandedId(expanded ? '' : item.id)} aria-label={expanded ? 'Collapse details' : 'Expand details'}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-50">
                            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {expanded && (
                        <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-4">
                          <div className="grid gap-4 lg:grid-cols-3">
                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">File integrity</div>
                              <div className="mt-2 break-all font-mono text-[11px] text-slate-700">SHA-256 {item.hash_value}</div>
                              <dl className="mt-3 space-y-1 text-xs text-slate-600">
                                <div className="flex justify-between gap-3"><dt>Original name</dt><dd className="truncate font-semibold">{item.original_file_name}</dd></div>
                                <div className="flex justify-between gap-3"><dt>Parser</dt><dd className="font-semibold">{item.parser_version}</dd></div>
                                <div className="flex justify-between gap-3"><dt>Tenant ID</dt><dd className="truncate font-semibold">{item.tenant_id || 'Not detected'}</dd></div>
                              </dl>
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Category summary</div>
                              {categories.length ? (
                                <div className="mt-2 space-y-2">
                                  {categories.map(([category, values]) => (
                                    <div key={category} className="flex items-center justify-between gap-3 text-xs">
                                      <span className="font-semibold text-slate-700">{category}</span>
                                      <span className="text-slate-500">
                                        {values.achieved_points || 0}/{values.possible_points || 0} pts · {values.records || 0} rows
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : <div className="mt-2 text-xs text-slate-500">No category columns were detected.</div>}
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                <AlertTriangle className="h-3.5 w-3.5" /> Parser notes
                              </div>
                              {item.parser_warnings?.length ? (
                                <ul className="mt-2 space-y-1.5 text-xs text-amber-800">
                                  {item.parser_warnings.map((warning) => <li key={warning}>• {warning}</li>)}
                                </ul>
                              ) : <div className="mt-2 text-xs text-green-700">Recognized fields were parsed without warnings.</div>}
                              {item.notes && <div className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-600">{item.notes}</div>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {modal && project && (
        <SecureScoreUploadModal
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
