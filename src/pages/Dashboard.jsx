import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Building2, FolderKanban } from 'lucide-react';
import { useClient } from '@/lib/clientContext';
import { useAuth } from '@/lib/AuthContext';
import { useOrg } from '@/lib/orgContext';
import { resolveProjectIdForClient } from '@/lib/clientProject';
import OrgDashboard from '@/components/dashboard/OrgDashboard';
import AdminClientSummary from '@/components/dashboard/AdminClientSummary';
import EmptyState from '@/components/EmptyState';

// Canonical dashboard router.
//   - Organization self-service users see the org dashboard.
//   - Platform / Pac-Sec users with no client selected see the portfolio.
//   - A selected client resolves to its canonical Project workspace.
// There is no legacy per-client dashboard here: the Project workspace owns it.
export default function Dashboard() {
  const { selectedClient, selectedClientId } = useClient();
  const { user } = useAuth();
  const { isPlatformAdmin, isPacSec, selectedOrgId, selectedOrg } = useOrg();

  const orgSelfService = !isPlatformAdmin && !isPacSec && !!selectedOrgId;

  const [resolving, setResolving] = useState(false);
  const [projectId, setProjectId] = useState(null);
  const [resolveFailed, setResolveFailed] = useState(false);

  useEffect(() => {
    if (orgSelfService || !selectedClientId) {
      setProjectId(null);
      setResolveFailed(false);
      setResolving(false);
      return undefined;
    }
    let active = true;
    setResolving(true);
    setProjectId(null);
    setResolveFailed(false);
    resolveProjectIdForClient(selectedClient || selectedClientId)
      .then((id) => {
        if (!active) return;
        setProjectId(id || null);
        setResolveFailed(!id);
        setResolving(false);
      })
      .catch(() => {
        if (!active) return;
        setProjectId(null);
        setResolveFailed(true);
        setResolving(false);
      });
    return () => { active = false; };
  }, [selectedClientId, selectedClient, orgSelfService]);

  if (orgSelfService) {
    return <OrgDashboard organizationId={selectedOrgId} orgName={selectedOrg?.organization_name} />;
  }

  if (!selectedClient) {
    if (user?.role === 'admin' || user?.role === 'technician') {
      return <AdminClientSummary />;
    }
    return (
      <EmptyState
        icon={Building2}
        title="No client selected"
        description="Create a client in the Clients section to get started."
        action={<Link to="/clients" className="text-sm font-semibold text-blue-600 hover:underline">Go to Clients →</Link>}
      />
    );
  }

  if (resolving) {
    return (
      <div className="flex justify-center py-20" aria-busy="true">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#0F1E3C] rounded-full animate-spin" />
      </div>
    );
  }

  if (projectId) {
    return <Navigate to={`/projects/${projectId}`} replace />;
  }

  // Fail closed — never guess a workspace and never fall back to a retired screen.
  return (
    <EmptyState
      icon={FolderKanban}
      title="No CMMC project for this client"
      description={
        resolveFailed
          ? `A canonical project could not be resolved for ${selectedClient.legal_name}. Open the Projects list to create or link one.`
          : `${selectedClient.legal_name} has no linked project yet. Open the Projects list to create one.`
      }
      action={<Link to="/projects" className="text-sm font-semibold text-blue-600 hover:underline">Go to Projects →</Link>}
    />
  );
}