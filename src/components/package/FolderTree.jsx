import { useState } from 'react';
import { Folder, FolderOpen, ChevronRight } from 'lucide-react';
import { nestPaths } from '@/lib/packageStructure';

function TreeNode({ name, node, depth, fileCounts, path }) {
  const [open, setOpen] = useState(depth < 1);
  const children = Object.keys(node);
  const hasChildren = children.length > 0;
  const count = fileCounts[path] || 0;
  return (
    <div>
      <button
        onClick={() => hasChildren && setOpen(!open)}
        className="flex items-center gap-1.5 w-full text-left py-1 hover:bg-slate-50 rounded px-1"
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        {hasChildren ? <ChevronRight className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} /> : <span className="w-3" />}
        {open && hasChildren ? <FolderOpen className="w-3.5 h-3.5 text-amber-500" /> : <Folder className="w-3.5 h-3.5 text-amber-500" />}
        <span className="text-xs font-mono text-slate-700">{name}</span>
        {count > 0 && <span className="text-[10px] text-slate-400 ml-1">({count})</span>}
      </button>
      {open && hasChildren && children.map(c => (
        <TreeNode key={c} name={c} node={node[c]} depth={depth + 1} fileCounts={fileCounts} path={`${path}/${c}`} />
      ))}
    </div>
  );
}

export default function FolderTree({ folders, files, rootName }) {
  const tree = nestPaths(folders);
  const fileCounts = {};
  (files || []).forEach(f => {
    const dir = f.path.split('/').slice(0, -1).join('/');
    fileCounts[dir] = (fileCounts[dir] || 0) + 1;
  });
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 max-h-[420px] overflow-auto">
      <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-slate-100">
        <FolderOpen className="w-4 h-4 text-[#0F1E3C]" />
        <span className="text-xs font-mono font-semibold text-slate-800 truncate">{rootName || 'Package Root'}</span>
      </div>
      {Object.keys(tree).map(top => (
        <TreeNode key={top} name={top} node={tree[top]} depth={0} fileCounts={fileCounts} path={top} />
      ))}
    </div>
  );
}