import { useState, useRef, useCallback } from 'react';
import {
  Laptop, Server, Network as NetworkIcon, Cloud, AppWindow, Globe, ShieldCheck,
  Database, Building2, User, Box, X, Trash2,
} from 'lucide-react';
import { NODE_META, ZONE_TYPES, zoneMeta } from '@/lib/diagramSeed';

const CANVAS_H = 560;

const ICONS = { Laptop, Server, Network: NetworkIcon, Cloud, AppWindow, Globe, ShieldCheck, Database, Building2, User, Box };

// Interactive canvas: draggable nodes, labeled connections, boundary zones.
export default function DiagramCanvas({ diagram, readOnly, onChange }) {
  const surfaceRef = useRef(null);
  const [drag, setDrag] = useState(null); // { id, offX, offY }
  const [connectFrom, setConnectFrom] = useState(null);
  const [mode, setMode] = useState('move'); // move | connect

  const nodes = diagram.nodes || [];
  const connections = diagram.connections || [];
  const zones = diagram.zones || [];

  const nodeById = useCallback((id) => nodes.find((n) => n.id === id), [nodes]);

  const onMouseDownNode = (e, node) => {
    if (readOnly) return;
    if (mode === 'connect') {
      if (!connectFrom) { setConnectFrom(node.id); return; }
      if (connectFrom !== node.id) {
        const label = diagram.diagram_type === 'CUI Data Flow Diagram' ? 'CUI via HTTPS' : '';
        onChange({ connections: [...connections, { id: `c-${Date.now()}`, from: connectFrom, to: node.id, label }] });
      }
      setConnectFrom(null);
      return;
    }
    const rect = surfaceRef.current.getBoundingClientRect();
    setDrag({ id: node.id, offX: e.clientX - rect.left - node.x, offY: e.clientY - rect.top - node.y });
  };

  const onMouseMove = (e) => {
    if (!drag) return;
    const rect = surfaceRef.current.getBoundingClientRect();
    const x = Math.max(0, e.clientX - rect.left - drag.offX);
    const y = Math.max(0, e.clientY - rect.top - drag.offY);
    onChange({ nodes: nodes.map((n) => n.id === drag.id ? { ...n, x, y } : n) });
  };

  const addZone = (zone_type) => {
    onChange({ zones: [...zones, { id: `z-${Date.now()}`, label: zoneMeta(zone_type).label, zone_type, x: 30, y: 30, w: 300, h: 200 }] });
  };
  const removeZone = (id) => onChange({ zones: zones.filter((z) => z.id !== id) });
  const removeNode = (id) => onChange({ nodes: nodes.filter((n) => n.id !== id), connections: connections.filter((c) => c.from !== id && c.to !== id) });
  const updateConnLabel = (id, label) => onChange({ connections: connections.map((c) => c.id === id ? { ...c, label } : c) });
  const removeConn = (id) => onChange({ connections: connections.filter((c) => c.id !== id) });
  const addManualNode = () => onChange({ nodes: [...nodes, { id: `n-${Date.now()}`, label: 'New Node', node_type: 'endpoint', x: 60, y: 60, external: false }] });

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 bg-white rounded-xl border border-slate-200 p-3">
          <span className="text-xs font-semibold text-slate-500">Mode:</span>
          <button onClick={() => { setMode('move'); setConnectFrom(null); }} className={`px-3 py-1 rounded-md text-xs font-semibold ${mode === 'move' ? 'bg-[#0F1E3C] text-white' : 'bg-slate-100 text-slate-600'}`}>Move</button>
          <button onClick={() => setMode('connect')} className={`px-3 py-1 rounded-md text-xs font-semibold ${mode === 'connect' ? 'bg-[#0F1E3C] text-white' : 'bg-slate-100 text-slate-600'}`}>Draw Connection</button>
          {mode === 'connect' && <span className="text-[11px] text-blue-600">{connectFrom ? 'Click a target node…' : 'Click a source node…'}</span>}
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <span className="text-xs font-semibold text-slate-500">Add zone:</span>
          {ZONE_TYPES.map((z) => (
            <button key={z.value} onClick={() => addZone(z.value)} className="px-2.5 py-1 rounded-md text-xs font-semibold border" style={{ color: z.color, borderColor: z.color }}>{z.label}</button>
          ))}
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <button onClick={addManualNode} className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200">+ Node</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-auto">
        <div
          id="diagram-canvas-surface"
          ref={surfaceRef}
          className="relative bg-white"
          style={{ height: CANVAS_H, minWidth: 900 }}
          onMouseMove={onMouseMove}
          onMouseUp={() => setDrag(null)}
          onMouseLeave={() => setDrag(null)}
        >
          {/* Zones (behind nodes) */}
          {zones.map((z) => {
            const m = zoneMeta(z.zone_type);
            return (
              <div key={z.id} className="absolute rounded-lg" style={{ left: z.x, top: z.y, width: z.w, height: z.h, border: `2px dashed ${m.color}`, background: `${m.color}0d` }}>
                <div className="flex items-center justify-between px-2 py-0.5" style={{ color: m.color }}>
                  <span className="text-[11px] font-bold">{z.label}</span>
                  {!readOnly && <button onClick={() => removeZone(z.id)} className="opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>}
                </div>
              </div>
            );
          })}

          {/* Connections */}
          <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
            {connections.map((c) => {
              const a = nodeById(c.from), b = nodeById(c.to);
              if (!a || !b) return null;
              const x1 = a.x + 40, y1 = a.y + 28, x2 = b.x + 40, y2 = b.y + 28;
              const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
              return (
                <g key={c.id}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
                  {c.label && <foreignObject x={mx - 55} y={my - 12} width="110" height="24" className="overflow-visible"><div className="text-[10px] text-center bg-white/90 border border-slate-200 rounded px-1 text-slate-600">{c.label}</div></foreignObject>}
                </g>
              );
            })}
            <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#94a3b8" /></marker></defs>
          </svg>

          {/* Nodes */}
          {nodes.map((n) => {
            const meta = NODE_META[n.node_type] || NODE_META.endpoint;
            const Icon = ICONS[meta.icon] || Box;
            const selected = connectFrom === n.id;
            return (
              <div key={n.id}
                onMouseDown={(e) => onMouseDownNode(e, n)}
                className={`absolute w-20 select-none ${readOnly ? '' : 'cursor-move'} ${selected ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}
                style={{ left: n.x, top: n.y }}>
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ background: meta.color }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="mt-1 text-[10px] font-semibold text-slate-700 text-center leading-tight max-w-[80px] break-words">{n.label}</div>
                  {n.external && <span className="text-[9px] text-amber-600 font-bold">EXTERNAL</span>}
                </div>
                {!readOnly && mode === 'move' && (
                  <button onClick={(e) => { e.stopPropagation(); removeNode(n.id); }} className="absolute -top-1 -right-1 bg-white rounded-full border border-slate-200 text-slate-400 hover:text-red-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
              {readOnly ? 'No diagram content.' : 'Click "Seed from Assets" to populate nodes, or "+ Node" to add manually.'}
            </div>
          )}
        </div>
      </div>

      {/* Connection labels editor (data flow) */}
      {!readOnly && connections.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-xs font-semibold text-slate-500 mb-2">Connection Labels</div>
          <div className="space-y-1.5">
            {connections.map((c) => {
              const a = nodeById(c.from), b = nodeById(c.to);
              return (
                <div key={c.id} className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 min-w-0 truncate w-40">{a?.label || '?'} → {b?.label || '?'}</span>
                  <input className="form-input text-xs py-1 flex-1" placeholder="e.g. CUI via HTTPS" value={c.label || ''} onChange={(e) => updateConnLabel(c.id, e.target.value)} />
                  <button onClick={() => removeConn(c.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}