import { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useOrg } from '@/lib/orgContext';

const ClientContext = createContext(null);

export function ClientProvider({ children }) {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { selectOrg } = useOrg();

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    base44.entities.Client.list()
      .then((data) => {
        // Client-role reads are already forced to caller.organization_id by
        // orgScopedData. Do not re-authorize with the retired cross-client
        // assigned_client_ids string in the browser.
        const filtered = data;
        setClients(filtered);
        if (filtered.length > 0 && !selectedClientId) {
          if (user.role === 'admin' || (user.role === 'technician' && filtered.length > 1)) {
            // Start with overview — no auto-select
          } else {
            setSelectedClientId(filtered[0].id);
          }
        }
      })
      .catch((e) => {
        setClients([]);
        alert('Error loading clients: ' + e.message);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;

  // Self-service client accounts are bound directly to their authenticated
  // organization and do not require a legacy Client record. Platform staff
  // continue to scope organization context through the selected Client.
  useEffect(() => {
    const selfServiceOrgId = user?.role === 'client' ? user?.organization_id : null;
    if (selfServiceOrgId) {
      selectOrg(selfServiceOrgId);
      return;
    }
    selectOrg(selectedClient?.organization_id || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user?.organization_id, selectedClientId, selectedClient?.organization_id]);

  const refreshClients = async () => {
    if (!user) return [];
    // Client-role rows are tenant-scoped by orgScopedData before they reach
    // this context; admin and technician reads remain direct.
    const filtered = await base44.entities.Client.list();
    setClients(filtered);
    return filtered;
  };

  return (
    <ClientContext.Provider value={{ clients, selectedClientId, setSelectedClientId, selectedClient, loading, refreshClients }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error('useClient must be used within ClientProvider');
  return ctx;
}