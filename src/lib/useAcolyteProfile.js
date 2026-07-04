import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

// Loads (or lazily prepares) the single AcolyteProfile for a project.
// Does NOT create a record until the user saves in ACOLYTE Settings.
export function useAcolyteProfile(projectId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) { setProfile(null); setLoading(false); return; }
    setLoading(true);
    const rows = await base44.entities.AcolyteProfile.filter({ project_id: projectId }).catch(() => []);
    setProfile(rows[0] || null);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  return { profile, loading, refresh: load, setProfile };
}