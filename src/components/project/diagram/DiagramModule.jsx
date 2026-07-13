import { useState, useEffect, useCallback } from 'react';
import { Network, Loader2, Wand2, Save, ImageDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { seedNodesFromAssets } from '@/lib/diagramSeed';
import DiagramCanvas from './DiagramCanvas';

const DIAGRAM_TYPES = ['Network Topology Diagram', 'CUI Data Flow Diagram'];

// Visual diagram builder. Two diagram types per project. Auto-seeds nodes from
// the Asset inventory. Exports a PNG that embeds into the SSP scoping section.
export default function DiagramModule({ project, readOnly }) {
  const [type, setType] = useState('Network Topology Diagram');
  const [assets, setAssets] = useState([]);
  const [diagrams, setDiagrams] = useState({});
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [ast, dgs] = await Promise.all([
      base44.entities.Asset.filter({ project_id: project.id }).catch(() => []),
      base44.entities.ProjectDiagram.filter({ project_id: project.id }).catch(() => []),
    ]);
    setAssets(ast);
    const map = {};
    dgs.forEach((d) => { map[d.diagram_type] = d; });
    setDiagrams(map);
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const existing = diagrams[type];
    setCurrent(existing || { diagram_type: type, title: type, nodes: [], connections: [], zones: [] });
    setDirty(false);
  }, [type, diagrams]);

  const seed = () => {
    const nodes = seedNodesFromAssets(assets);
    setCurrent((c) => ({ ...c, nodes }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      organization_id: project.organization_id, project_id: project.id,
      diagram_type: type, title: current.title || type,
      nodes: current.nodes || [], connections: current.connections || [], zones: current.zones || [],
    };
    let saved;
    if (current.id) saved = await base44.entities.ProjectDiagram.update(current.id, payload);
    else saved = await base44.entities.ProjectDiagram.create(payload);
    setDiagrams((m) => ({ ...m, [type]: saved }));
    setCurrent(saved);
    setDirty(false);
    setSaving(false);
  };

  // Export the canvas to PNG, upload it, and store the URL on the diagram so the
  // SSP can embed it. Uses html2canvas against the canvas DOM node.
  const exportPng = async () => {
    setSaving(true);
    const el = document.getElementById('diagram-canvas-surface');
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 });
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
    const file = new File([blob], `${type.replace(/\s+/g, '_')}.png`, { type: 'image/png' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    // Ensure the diagram record exists, then store the image URL.
    let rec = current;
    if (!rec.id) { rec = await base44.entities.ProjectDiagram.create({ organization_id: project.organization_id, project_id: project.id, diagram_type: type, title: current.title || type, nodes: current.nodes || [], connections: current.connections || [], zones: current.zones || [] }); }
    const saved = await base44.entities.ProjectDiagram.update(rec.id, { image_url: file_url, last_exported_date: new Date().toISOString() });
    setDiagrams((m) => ({ ...m, [type]: saved }));
    setCurrent(saved);
    setDirty(false);
    setSaving(false);
    // Also download a copy for the user.
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png'); a.download = file.name; a.click();
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <Network className="w-5 h-5 text-[#0F1E3C]" />
            <h1 className="text-lg font-bold text-slate-900">Network & Data Flow Diagrams</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            {!readOnly && (
              <button onClick={seed} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200">
                <Wand2 className="w-4 h-4" /> Seed from Assets
              </button>
            )}
            {!readOnly && (
              <button onClick={save} disabled={saving || !dirty}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
              </button>
            )}
            <button onClick={exportPng} disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-green-700 hover:bg-green-800 disabled:opacity-60">
              <ImageDown className="w-4 h-4" /> Export PNG
            </button>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {DIAGRAM_TYPES.map((t) => (
            <button key={t} onClick={() => setType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${type === t ? 'bg-[#0F1E3C] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t}</button>
          ))}
        </div>
        <p className="text-[13px] text-slate-500 mt-2">
          Drag nodes to arrange. {type === 'CUI Data Flow Diagram' ? 'Label each connection with what data moves (e.g. "CUI via HTTPS").' : 'Draw connections between systems and boundary zones to mark scope.'} Exported PNG embeds into the SSP.
        </p>
      </div>

      {current?.image_url && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-xs text-blue-700">
          Last exported {current.last_exported_date ? new Date(current.last_exported_date).toLocaleString() : ''} — this image is embedded into the SSP scoping section.
        </div>
      )}

      <DiagramCanvas
        diagram={current}
        readOnly={readOnly}
        onChange={(patch) => { setCurrent((c) => ({ ...c, ...patch })); setDirty(true); }}
      />
    </div>
  );
}