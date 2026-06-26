import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import EmptyState from '@/components/EmptyState';
import DocDashboard from '@/components/documentation/DocDashboard';
import SSPPreview from '@/components/documentation/SSPPreview';
import SSPBuilder from '@/components/documentation/SSPBuilder';
import SourceDataTab from '@/components/documentation/SourceDataTab';
import GapsTab from '@/components/documentation/GapsTab';
import ControlNarrativesTab from '@/components/documentation/ControlNarrativesTab';
import EvidenceMappingTab from '@/components/documentation/EvidenceMappingTab';
import DocLibraryTab from '@/components/documentation/DocLibraryTab';
import FinalPackageTab from '@/components/documentation/FinalPackageTab';
import TraceabilityTab from '@/components/documentation/TraceabilityTab';
import { FileStack, Eye, Wrench, Database, AlertTriangle, ShieldCheck, Link2, FileText, Package, FileSearch, RefreshCw, Loader2, Check } from 'lucide-react';

const TABS = [
  { id: 'preview', label: 'SSP Preview', icon: Eye },
  { id: 'builder', label: 'SSP Builder', icon: Wrench },
  { id: 'source', label: 'Source Data', icon: Database },
  { id: 'gaps', label: 'Gaps', icon: AlertTriangle },
  { id: 'narratives', label: 'Control Narratives', icon: ShieldCheck },
  { id: 'evidence', label: 'Evidence Mapping', icon: Link2 },
  { id: 'library', label: 'Document Library', icon: FileText },
  { id: 'traceability', label: 'Traceability', icon: FileSearch },
  { id: 'package', label: 'Final Package', icon: Package },
];

const WORKFLOW_STEPS = [
  'Select Client', 'Confirm Level & Scope', 'Review Missing Inputs', 'Generate SSP Profile',
  'Generate SSP Draft', 'Review Narratives', 'Resolve Gaps', 'Approve Documents',
  'Add to Final Package', 'Export',
];

function determineStep(synthesis) {
  if (!synthesis) return 0;
  if (synthesis.final_package?.ready_count > 0) return 8;
  if (synthesis.gaps.length === 0 && synthesis.placeholders.length === 0) return 6;
  if (synthesis.ssp_record?.generated_body) return 4;
  return 3;
}

export default function Documentation() {
  const { selectedClient, selectedClientId } = useClient();
  const [synthesis, setSynthesis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');
  const [sspRecord, setSspRecord] = useState(null);

  const generate = async () => {
    if (!selectedClientId) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('generateSSP', { client_id: selectedClientId });
      setSynthesis(res.data);
      setSspRecord(res.data.ssp_record);
    } catch (e) {
      setSynthesis(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedClientId) generate();
    else { setSynthesis(null); setSspRecord(null); }
  }, [selectedClientId]);

  if (!selectedClient) return <EmptyState icon={FileStack} title="No client selected" description="Select a client to generate and manage the SSP." />;

  const currentStep = determineStep(synthesis);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SSP & Documentation</h1>
          <p className="text-sm text-slate-500 mt-1">Master compliance record — synthesizes all project data into a Level-aware SSP</p>
        </div>
        <button onClick={generate} disabled={loading} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-[#0F1E3C] text-white hover:bg-[#1E2D4A] disabled:opacity-50 flex-shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} {loading ? 'Synthesizing...' : 'Regenerate SSP'}
        </button>
      </div>

      {synthesis && <DocDashboard synthesis={synthesis} client={selectedClient} />}

      {synthesis && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-1 overflow-x-auto">
            {WORKFLOW_STEPS.map((step, i) => (
              <div key={i} className="flex items-center flex-shrink-0">
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${i < currentStep ? 'bg-green-50 text-green-700' : i === currentStep ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-400'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i < currentStep ? 'bg-green-500 text-white' : i === currentStep ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    {i < currentStep ? <Check className="w-3 h-3" /> : i + 1}
                  </span>
                  <span className="hidden sm:inline">{step}</span>
                </div>
                {i < WORKFLOW_STEPS.length - 1 && <div className={`w-3 h-px ${i < currentStep ? 'bg-green-300' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-b border-slate-200">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-[#0F1E3C] text-[#0F1E3C]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                <Icon className="w-4 h-4" /> {tab.label}
                {tab.id === 'gaps' && synthesis && (synthesis.gaps.length + synthesis.placeholders.length + synthesis.duplicates.length + synthesis.client_mismatches.length) > 0 && (
                  <span className="ml-1 text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">{synthesis.gaps.length + synthesis.placeholders.length + synthesis.duplicates.length + synthesis.client_mismatches.length}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {loading && !synthesis ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
      ) : synthesis ? (
        <>
          {activeTab === 'preview' && <SSPPreview synthesis={synthesis} />}
          {activeTab === 'builder' && <SSPBuilder sspRecord={sspRecord} clientId={selectedClientId} onUpdate={setSspRecord} />}
          {activeTab === 'source' && <SourceDataTab synthesis={synthesis} />}
          {activeTab === 'gaps' && <GapsTab synthesis={synthesis} />}
          {activeTab === 'narratives' && <ControlNarrativesTab synthesis={synthesis} />}
          {activeTab === 'evidence' && <EvidenceMappingTab synthesis={synthesis} />}
          {activeTab === 'library' && <DocLibraryTab clientId={selectedClientId} client={selectedClient} synthesis={synthesis} onRegenerate={generate} />}
          {activeTab === 'traceability' && <TraceabilityTab synthesis={synthesis} />}
          {activeTab === 'package' && <FinalPackageTab synthesis={synthesis} clientId={selectedClientId} />}
        </>
      ) : (
        <EmptyState icon={FileStack} title="Click Regenerate to synthesize the SSP" description="The SSP engine will aggregate all project data across the app for this client." action={<button onClick={generate} disabled={loading} className="text-sm text-blue-600 font-medium hover:underline">Regenerate SSP →</button>} />
      )}
    </div>
  );
}