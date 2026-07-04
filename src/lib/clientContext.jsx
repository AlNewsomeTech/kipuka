import { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const ClientContext = createContext(null);

export function ClientProvider({ children }) {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    base44.entities.Client.list()
      .then((data) => {
        let filtered = data;
        if (user.role === 'client') {
          const assignedIds = (user.assigned_client_ids || '').split(',').filter(Boolean);
          filtered = data.filter((c) => assignedIds.includes(c.id) || c.created_by_id === user.id);
        }
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

  const refreshClients = async () => {
    if (!user) return [];
    const data = await base44.entities.Client.list();
    let filtered = data;
    if (user.role === 'client') {
      const assignedIds = (user.assigned_client_ids || '').split(',').filter(Boolean);
      filtered = data.filter((c) => assignedIds.includes(c.id) || c.created_by_id === user.id);
    }
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