import { FolderKanban } from 'lucide-react';
import EmptyState from '@/components/EmptyState';

export default function NoProjectState() {
  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <EmptyState
        icon={FolderKanban}
        title="No project in scope"
        description="ACOLYTE records are tenant- and project-aware. Select an organization in the top bar and choose a project to view ACOLYTE operations."
      />
    </div>
  );
}