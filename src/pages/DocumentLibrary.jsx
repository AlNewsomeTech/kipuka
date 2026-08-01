import { useState, useEffect } from 'react';
import { FileText, LayoutDashboard, Wand2, FolderKanban, Workflow, ListChecks, PackageCheck, Settings2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import EmptyState from '@/components/EmptyState';
import DocumentsDashboard from '@/components/documents/DocumentsDashboard';
import DocumentBuilder from '@/components/documents/DocumentBuilder';
import DocumentLifecycle from '@/components/documents/DocumentLifecycle';
import ApplicabilityMatrix from '@/components/documents/ApplicabilityMatrix';
import DocumentPackagePanel from '@/components/documents/DocumentPackagePanel';
import DocumentConfigurationEditor from '@/components/documents/DocumentConfigurationEditor';

// PHASE 4 — canonical Project-based document engine.
// Documents are generated per Project from the versioned policy template
// library (real DOCX drafts). The legacy Client-based generator is retired.

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'builder', label: 'Draft Builder', icon: Wand2 },
  { id: 'lifecycle', label: 'Review & Approval', icon: Workflow },
  { id: 'applicability', label: 'Applicability', icon: ListChecks },
  { id: 'package', label: 'Package Export', icon: PackageCheck },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

export default function DocumentLibrary({ initialTab = 'dashboard' }) {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [tab, setTab] = useState(initialTab);
  const [docs, setDocs] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [events, setEvents] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    base44.entities.Project.list('-updated_date', 100)
      .then((rows) => { setProjects(rows); if (rows.length === 1) setProjectId(rows[0].id); })
      .catch(() => setProjects([]))
      .finally(() => setLoadingProjects(false));
  }, []);

  const project = projects.find((p) => p.id === projectId) || null;

  const loadProjectData = async () => {
    if (!projectId || !project?.organization_id) {
      setDocs([]); setConfigs([]); setEvents([]); setDecisions([]); setPackages([]); setEvidence([]);
      return;
    }
    const [docRows, configRows, eventRows, decisionRows, packageRows, evidenceRows] = await Promise.all([
      base44.entities.ProjectDocument.filter({ project_id: projectId }, '-generated_date').catch(() => []),
      base44.entities.DocumentConfiguration.filter({ organization_id: project.organization_id, active: true }).catch(() => []),
      base44.entities.ProjectDocumentEvent.filter({ project_id: projectId }, '-event_date').catch(() => []),
      base44.entities.DocumentApplicabilityDecision.filter({ project_id: projectId }, '-created_date').catch(() => []),
      base44.entities.ProjectDocumentPackage.filter({ project_id: projectId }, '-generated_date').catch(() => []),
      base44.entities.ProjectEvidence.filter({ project_id: projectId }, '-evidence_date').catch(() => []),
    ]);
    setDocs(docRows); setConfigs(configRows); setEvents(eventRows); setDecisions(decisionRows); setPackages(packageRows); setEvidence(evidenceRows);
  };
  useEffect(() => { loadProjectData(); }, [projectId, project?.organization_id]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
          <p className="text-sm text-slate-500 mt-1">Canonical Project-based DOCX drafts from the versioned policy template library</p>
        </div>
        <div className="flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-slate-400" />
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="form-input !w-auto min-w-[220px]" aria-label="Select project">
            <option value="">Select a project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.project_name} — {p.target_cmmc_level}</option>
            ))}
          </select>
        </div>
      </div>

      {!project ? (
        <EmptyState
          icon={FileText}
          title={loadingProjects ? 'Loading projects…' : 'No project selected'}
          description={loadingProjects ? '' : 'Select a project to view applicable policy templates and generate DOCX drafts.'}
          action={null}
        />
      ) : (
        <>
          <div className="border-b border-slate-200 flex gap-1 overflow-x-auto">
            {TABS.map((t) => { const Icon = t.icon; return (
              <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${tab === t.id ? 'border-[#0F1E3C] text-[#0F1E3C]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            ); })}
          </div>

          {tab === 'dashboard' && <DocumentsDashboard project={project} docs={docs} configs={configs} />}
          {tab === 'builder' && <DocumentBuilder project={project} docs={docs} onChanged={loadProjectData} />}
          {tab === 'lifecycle' && <DocumentLifecycle docs={docs} events={events} onChanged={loadProjectData} />}
          {tab === 'applicability' && <ApplicabilityMatrix project={project} decisions={decisions} evidence={evidence} onChanged={loadProjectData} />}
          {tab === 'package' && <DocumentPackagePanel project={project} packages={packages} onChanged={loadProjectData} />}
          {tab === 'settings' && <DocumentConfigurationEditor project={project} configs={configs} onChanged={loadProjectData} />}
        </>
      )}
    </div>
  );
}