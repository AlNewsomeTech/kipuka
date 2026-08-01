import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { applicableTemplates } from '@/lib/projectDocumentCatalog';
import { FileText } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import DocumentCard from '@/components/documents/DocumentCard';

// Canonical Phase 4 draft builder: per-template preflight and single-document
// DOCX draft generation. Bulk generation is intentionally not offered, and no
// approval/publish actions exist in this phase.
export default function DocumentBuilder({ project, docs, onChanged }) {
  const [preflights, setPreflights] = useState({});
  const [busyKey, setBusyKey] = useState(null);
  const [errors, setErrors] = useState({});

  const templates = applicableTemplates(project?.target_cmmc_level);
  const activeDocs = docs.filter((d) => !['Superseded', 'Archived'].includes(d.status));
  const docByKey = {};
  activeDocs.forEach((d) => { if (!docByKey[d.template_key]) docByKey[d.template_key] = d; });

  const runPreflight = async (template) => {
    setBusyKey(template.template_key);
    setErrors((e) => ({ ...e, [template.template_key]: null }));
    try {
      const res = await base44.functions.invoke('preflightProjectDocument', {
        project_id: project.id, template_key: template.template_key,
      });
      setPreflights((p) => ({ ...p, [template.template_key]: res.data }));
    } catch (e) {
      setErrors((er) => ({ ...er, [template.template_key]: e.response?.data?.error || e.message }));
    } finally {
      setBusyKey(null);
    }
  };

  const generateDraft = async (template) => {
    setBusyKey(template.template_key);
    setErrors((e) => ({ ...e, [template.template_key]: null }));
    try {
      await base44.functions.invoke('generateProjectDocument', {
        project_id: project.id, template_key: template.template_key,
      });
      onChanged();
      await runPreflight(template);
    } catch (e) {
      setErrors((er) => ({ ...er, [template.template_key]: e.response?.data?.error || e.message }));
      setBusyKey(null);
    }
  };

  if (templates.length === 0) {
    return <EmptyState icon={FileText} title="No applicable templates" description={`The project target level "${project?.target_cmmc_level || 'Unknown'}" has no applicable canonical templates. Set the project to Level 1 or Level 2.`} />;
  }

  const groups = ['Policy', 'Standard', 'Guideline', 'Plan'];
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        {templates.length} templates apply to {project.project_name} ({project.target_cmmc_level}). Run preflight to see resolved data and missing information, then generate a Draft DOCX. Drafts are never auto-approved.
      </p>
      {groups.map((group) => {
        const groupTemplates = templates.filter((t) => t.document_type === group);
        if (groupTemplates.length === 0) return null;
        return (
          <div key={group}>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">{group === 'Policy' ? 'Policies' : `${group}s`}</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {groupTemplates.map((template) => (
                <DocumentCard
                  key={template.template_key}
                  template={template}
                  doc={docByKey[template.template_key]}
                  preflight={preflights[template.template_key]}
                  error={errors[template.template_key]}
                  busy={busyKey === template.template_key}
                  onPreflight={() => runPreflight(template)}
                  onGenerate={() => generateDraft(template)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}