import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useClient } from '@/lib/clientContext';
import { resolveProjectIdForClient } from '@/lib/clientProject';

// Backward-compatible redirect for the retired /controls, /controls/:id and
// /level2 screens. The Project + ControlLibrary + ControlAssessment workflow is
// the single system of record, so these URLs now land on the project
// assessment module. Read-only: this component never creates any record.
export default function CanonicalControlsRedirect() {
  const { selectedClientId } = useClient();
  const [resolving, setResolving] = useState(true);
  const [projectId, setProjectId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setResolving(true);
    setProjectId(null);

    if (!selectedClientId) {
      setResolving(false);
      return () => { cancelled = true; };
    }

    resolveProjectIdForClient(selectedClientId)
      .then((id) => { if (!cancelled) setProjectId(id || null); })
      .finally(() => { if (!cancelled) setResolving(false); });

    return () => { cancelled = true; };
  }, [selectedClientId]);

  if (resolving) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (projectId) {
    return <Navigate replace to={`/projects/${projectId}/assessment`} />;
  }

  return <Navigate replace to="/projects" />;
}