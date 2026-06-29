import { useState } from 'react';

/**
 * Readable multi-line text block. Splits on newlines, renders bullets,
 * comfortable line-height, and "Show more / Show less" when long.
 */
export default function ProseBlock({ content, clampLines = 6, className = '' }) {
  const [expanded, setExpanded] = useState(false);
  const lines = content ? content.split('\n').map(l => l.replace(/\r/g, '')).filter(l => l.trim()) : [];

  if (lines.length === 0) {
    return <p className="text-[15px] text-slate-400 italic">Not documented yet.</p>;
  }

  const isLong = lines.length > clampLines;
  const visible = expanded || !isLong ? lines : lines.slice(0, clampLines);

  return (
    <div className={className}>
      <div className="space-y-1.5">
        {visible.map((line, i) => {
          const isSubBullet = /^\s*[-•*]/.test(line);
          const text = isSubBullet ? line.replace(/^\s*[-•*]\s*/, '') : line.trim();
          return (
            <p
              key={i}
              className={`text-[15px] text-slate-700 leading-[1.6] ${isSubBullet ? 'pl-5 relative before:content-["•"] before:absolute before:left-1 before:text-slate-400' : ''}`}
            >
              {text}
            </p>
          );
        })}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="mt-2 text-[14px] font-semibold text-blue-600 hover:text-blue-700 hover:underline"
        >
          {expanded ? 'Show less' : `Show more (${lines.length - clampLines} more)`}
        </button>
      )}
    </div>
  );
}