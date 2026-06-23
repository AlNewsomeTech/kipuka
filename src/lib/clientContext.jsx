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
        if (user.role === 'technician' || user.role === 'client') {
          const assignedIds = (user.assigned_client_ids || '').split(',').filter(Boolean);
          filtered = data.filter((c) => assignedIds.includes(c.id));
        }
        setClients(filtered);
        if (filtered.length > 0 && !selectedClientId && user.role !== 'admin') {
          setSelectedClientId(filtered[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;

  return (
    <ClientContext.Provider value={{ clients, selectedClientId, setSelectedClientId, selectedClient, loading }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error('useClient must be used within ClientProvider');
  return ctx;
}