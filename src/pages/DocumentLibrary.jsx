import { useState, useEffect } from 'react';
import { FileText, LayoutDashboard, Wand2, List, FileStack } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import EmptyState from '@/components/EmptyState';
import DocumentsDashboard from '@/components/documents/DocumentsDashboard';
import DocumentBuilder from '@/components/documents/DocumentBuilder';
import DocumentIndex from '@/components/documents/DocumentIndex';
import DocumentDetailModal from '@/components/documents/DocumentDetailModal';
import TemplateLibrary from '@/components/documents/TemplateLibrary';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'builder', label: 'Document Builder', icon: Wand2 },
  { id: 'index', label: 'Document Index', icon: List },
  { id: 'templates', label: 'Template Library', icon: FileStack },
];

export default function DocumentLibrary() {
  const { selectedClient, selectedClientId } = useClient();
  const [tab, setTab] = useState('dashboard');
  const [docs, setDocs] = useState([]);
  const [activeDoc, setActiveDoc] = useState(null);

  const load = () => {
    if (selectedClientId) base44.entities.GeneratedDocument.filter({ client_id: selectedClientId }, '-generated_date').then(setDocs).catch(() => {});
  };
  useEffect(load, [selectedClientId]);

  if (!selectedClient) return <EmptyState icon={FileText} title="No client selected" description="Select a client to manage CMMC documents." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
        <p className="text-sm text-slate-500 mt-1">End-to-end CMMC document generation, traceability, versioning, and final-package control for {selectedClient.legal_name}</p>
      </div>

      <div className="border-b border-slate-200 flex gap-1 overflow-x-auto">
        {TABS.map(t => { const Icon = t.icon; return (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${tab === t.id ? 'border-[#0F1E3C] text-[#0F1E3C]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Icon className="w-4 h-4" /> {t.label}</button>
        ); })}
      </div>

      {tab === 'dashboard' && <DocumentsDashboard client={selectedClient} docs={docs} />}
      {tab === 'builder' && <DocumentBuilder />}
      {tab === 'index' && <DocumentIndex client={selectedClient} docs={docs} onOpen={setActiveDoc} onChanged={load} />}
      {tab === 'templates' && <TemplateLibrary clientId={selectedClientId} client={selectedClient} onChanged={load} />}

      {activeDoc && <DocumentDetailModal doc={activeDoc} onClose={() => setActiveDoc(null)} onSaved={() => { setActiveDoc(null); load(); }} />}
    </div>
  );
}