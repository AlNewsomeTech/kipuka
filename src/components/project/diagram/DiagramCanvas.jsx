import { useRef, useState, useCallback } from 'react';
import {
  Laptop, Server, Network as NetworkIcon, Cloud, AppWindow, Globe, ShieldCheck,
  Database, Building2, User, Box, X, Trash2, Move,
} from 'lucide-react';
import { NODE_META, ZONE_TYPES, zoneMeta } from '@/lib/diagramSeed';

const CANVAS_H = 560;
const CANVAS_MINW = 1100;

const ICONS = { Laptop, Server, Network: NetworkIcon, Cloud, AppWindow, Globe, ShieldCheck, Database, Building2, User, Box };

// Interactive canvas: draggable nodes, draggable + resizable boundary zones,
// labeled connections. Pointer math accounts for scrollLeft/scrollTop so nodes
// do not jump when the canvas is scrolled. Uses pointer events + capture.
export default function DiagramCanvas({ diagram, readOnly, onChange }) {
  const surfaceRef = useRef(null);
  const [drag, setDrag] = useState(null);
  const [connectFrom, setConnectFrom] = useState(null);
  const [mode, setMode] = useState('move');

  const nodes = diagram.nodes || [];
  const connections = diagram.connections || [];
  const zones = diagram.zones || [];

  const nodeById = useCallback((id) => nodes.find((n) => n.id === id), [nodes]);

  const surfacePoint = (e) => {
    const el = surfaceRef.current;
    const rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left + el.scrollLeft, y: e.clientY - rect.top + el.scrollTop };
  };

  const onPointerDownNode = (e, node) => {
    if (readOnly) return;
    e.stopPropagation();
    if (mode === 'connect') {
      if (!connectFrom) { setConnectFrom(node.id); return; }
      if (connectFrom !== node.id) {
        const label = diagram.diagram_type === 'CUI Data Flow Diagram' ? 'CUI via HTTPS' : '';
        onChange({ connections: [...connections, { id: `c-${Date.now()}`, from: connectFrom, to: node.id, label }] });
      }
      setConnectFrom(null);
      return;
    }
    const p = surfacePoint(e);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrag({ kind: 'node', id: node.id, offX: p.x - node.x, offY: p.y - node.y });
  };

  const onPointerDownZone = (e, zone) => {
    if (readOnly || mode === 'connect') return;
    e.stopPropagation();
    const p = surfacePoint(e);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrag({ kind: 'zone', id: zone.id, offX: p.x - zone.x, offY: p.y - zone.y });
  };

  const onPointerDownResize = (e, zone) => {
    if (readOnly) return;
    e.stopPropagation();
    const p = surfacePoint(e);
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrag({ kind: 'resize', id: zone.id, startX: p.x, startY: p.y, startW: zone.w, startH: zone.h });
  };

  const onPointerMove = (e) => {
    if (!drag) return;
    const p = surfacePoint(e);
    if (drag.kind === 'node') {
      const x = Math.max(0, p.x - drag.offX), y = Math.max(0, p.y - drag.offY);
      onChange({ nodes: nodes.map((n) => n.id === drag.id ? { ...n, x, y } : n) });
    } else if (drag.kind === 'zone') {
      const x = Math.max(0, p.x - drag.offX), y = Math.max(0, p.y - drag.offY);
      onChange({ zones: zones.map((z) => z.id === drag.id ? { ...z, x, y } : z) });
    } else if (drag.kind === 'resize') {
      const w = Math.max(120, drag.startW + (p.x - drag.startX));
      const h = Math.max(90, drag.startH + (p.y - drag.startY));
      onChange({ zones: zones.map((z) => z.id === drag.id ? { ...z, w, h } : z) });
    }
  };

  const endDrag = () => setDrag(null);

  const addZone = (zone_type) => {
    const n = zones.length;
    onChange({ zones: [...zones, { id: `z-${Date.now()}`, label: zoneMeta(zone_type).label, zone_type, x: 20 + n * 24, y: 20 + n * 24, w: 360, h: 260 }] });
  };
  const removeZone = (id) => onChange({ zones: zones.filter((z) => z.id !== id) });
  const updateZoneLabel = (id, label) => onChange({ zones: zones.map((z) => z.id === id ? { ...z, label } : z) });
  const removeNode = (id) => onChange({ nodes: nodes.filter((n) => n.id !== id), connections: connections.filter((c) => c.from !== id && c.to !== id) });
  const updateNodeLabel = (id, label) => onChange({ nodes: nodes.map((n) => n.id === id ? { ...n, label } : n) });
  const updateConnLabel = (id, label) => onChange({ connections: connections.map((c) => c.id === id ? { ...c, label } : c) });
  const removeConn = (id) => onChange({ connections: connections.filter((c) => c.id !== id) });
  const addManualNode = () => onChange({ nodes: [...nodes, { id: `n-${Date.now()}`, label: 'New Node', node_type: 'endpoint', x: 80, y: 80, external: false }] });

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 bg-white rounded-xl border border-slate-200 p-3">
          <span className="text-xs font-semibold text-slate-500">Mode:</span>
          <button onClick={() => { setMode('move'); setConnectFrom(null); }} className={`px-3 py-1 rounded-md text-xs font-semibold ${mode === 'move' ? 'bg-[#0F1E3C] text-white' : 'bg-slate-100 text-slate-600'}`}>Move &amp; Resize</button>
          <button onClick={() => setMode('connect')} className={`px-3 py-1 rounded-md text-xs font-semibold ${mode === 'connect' ? 'bg-[#0F1E3C] text-white' : 'bg-slate-100 text-slate-600'}`}>Draw Connection</button>
          {mode === 'connect' && <span className="text-[11px] text-blue-600 font-medium">{connectFrom ? 'Click a target node…' : 'Click a source node…'}</span>}
          <div className="w-px h-5 bg-slate-200 mx-1" />
          <span className="text-xs font-semibold text-slate-500">Add boundary:</span>
          {ZONE_TYPES.map((z) => (
            <button key={z.value} onClick={() => addZone(z.value)} className="px-2.5 py-1 rounded-md text-xs font-semibold border" style={{ color: z.color, borderColor: z.color }}>+ {z.label}</button>
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
          style={{ height: CANVAS_H, minWidth: CANVAS_MINW, touchAction: 'none' }}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
        >
          {zones.map((z) => {
            const m = zoneMeta(z.zone_type);
            return (
              <div key={z.id} className="absolute rounded-lg" style={{ left: z.x, top: z.y, width: z.w, height: z.h, border: `2px dashed ${m.color}`, background: `${m.color}0d` }}>
                <div
                  onPointerDown={(e) => onPointerDownZone(e, z)}
                  className={`flex items-center justify-between px-2 py-0.5 rounded-t ${readOnly || mode === 'connect' ? '' : 'cursor-move'}`}
                  style={{ color: m.color, background: `${m.color}14` }}
                >
                  <span className="flex items-center gap-1 text-[11px] font-bold min-w-0 flex-1">
                    {!readOnly && mode === 'move' && <Move className="w-3 h-3 opacity-60 shrink-0" />}
                    {readOnly
                      ? <span className="truncate">{z.label}</span>
                      : <input className="bg-transparent border-none outline-none text-[11px] font-bold w-full" style={{ color: m.color }} value={z.label} onPointerDown={(e) => e.stopPropagation()} onChange={(e) => updateZoneLabel(z.id, e.target.value)} />}
                  </span>
                  {!readOnly && <button onClick={() => removeZone(z.id)} onPointerDown={(e) => e.stopPropagation()} className="opacity-50 hover:opacity-100 shrink-0"><X className="w-3.5 h-3.5" /></button>}
                </div>
                {!readOnly && (
                  <div onPointerDown={(e) => onPointerDownResize(e, z)} className="absolute -bottom-1 -right-1 w-4 h-4 cursor-nwse-resize rounded-sm" style={{ background: m.color, opacity: 0.55 }} title="Drag to resize" />
                )}
              </div>
            );
          })}

          <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
            <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#94a3b8" /></marker></defs>
            {connections.map((c) => {
              const a = nodeById(c.from), b = nodeById(c.to);
              if (!a || !b) return null;
              const x1 = a.x + 40, y1 = a.y + 28, x2 = b.x + 40, y2 = b.y + 28;
              const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
              const labelW = c.label ? Math.max(40, c.label.length * 6 + 12) : 0;
              return (
                <g key={c.id}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
                  {c.label && (
                    <>
                      <rect x={mx - labelW / 2} y={my - 9} width={labelW} height="18" rx="3" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
                      <text x={mx} y={my + 3} textAnchor="middle" fontSize="10" fill="#475569" fontFamily="sans-serif">{c.label}</text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>

          {nodes.map((n) => {
            const meta = NODE_META[n.node_type] || NODE_META.endpoint;
            const Icon = ICONS[meta.icon] || Box;
            const selected = connectFrom === n.id;
            return (
              <div key={n.id}
                onPointerDown={(e) => onPointerDownNode(e, n)}
                className={`absolute w-20 select-none ${readOnly ? '' : mode === 'connect' ? 'cursor-pointer' : 'cursor-move'} ${selected ? 'ring-2 ring-blue-500 rounded-lg' : ''}`}
                style={{ left: n.x, top: n.y }}>
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ background: meta.color }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {readOnly
                    ? <div className="mt-1 text-[10px] font-semibold text-slate-700 text-center leading-tight max-w-[80px] break-words">{n.label}</div>
                    : <input className="mt-1 text-[10px] font-semibold text-slate-700 text-center leading-tight w-[80px] bg-transparent border-none outline-none focus:bg-slate-50 rounded" value={n.label} onPointerDown={(e) => { if (mode === 'move') e.stopPropagation(); }} onChange={(e) => updateNodeLabel(n.id, e.target.value)} />}
                  {n.external && <span className="text-[9px] text-amber-600 font-bold">EXTERNAL</span>}
                </div>
                {!readOnly && mode === 'move' && (
                  <button onClick={(e) => { e.stopPropagation(); removeNode(n.id); }} onPointerDown={(e) => e.stopPropagation()} className="absolute -top-1 -right-1 bg-white rounded-full border border-slate-200 text-slate-400 hover:text-red-600 shadow-sm">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          {nodes.length === 0 && zones.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400 pointer-events-none">
              {readOnly ? 'No diagram content.' : 'Click "Seed from Assets" to populate nodes, or add nodes and boundaries manually.'}
            </div>
          )}
        </div>
      </div>

      {!readOnly && connections.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-3">
          <div className="text-xs font-semibold text-slate-500 mb-2">Connection Labels {diagram.diagram_type === 'CUI Data Flow Diagram' && <span className="text-slate-400 font-normal">— describe what data moves</span>}</div>
          <div className="space-y-1.5">
            {connections.map((c) => {
              const a = nodeById(c.from), b = nodeById(c.to);
              return (
                <div key={c.id} className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 min-w-0 truncate w-40">{a?.label || '?'} &rarr; {b?.label || '?'}</span>
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
