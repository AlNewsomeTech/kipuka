import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';

const statusConfig = {
  pending: { icon: Clock, label: 'Pending', color: 'text-slate-400' },
  running: { icon: Loader2, label: 'Running', color: 'text-blue-500', spin: true },
  in_progress: { icon: Loader2, label: 'In progress', color: 'text-blue-500', spin: true },
  completed: { icon: CheckCircle2, label: 'Completed', color: 'text-green-500' },
  success: { icon: CheckCircle2, label: 'Success', color: 'text-green-500' },
  failed: { icon: XCircle, label: 'Failed', color: 'text-red-500' },
  error: { icon: XCircle, label: 'Error', color: 'text-red-500' },
};

function ToolCallDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const status = statusConfig[toolCall.status] || statusConfig.pending;
  const Icon = status.icon;
  const isFailed = ['failed', 'error'].includes(toolCall.status);

  let parsedResults = toolCall.results;
  try {
    if (typeof toolCall.results === 'string') parsedResults = JSON.parse(toolCall.results);
  } catch (e) { /* keep raw */ }

  const projection = toolCall.display_projection || {};
  const hideDetails = projection.hide_details && projection.details_redacted;
  const activeLabel = projection.active_label || status.label;
  const errorLabel = projection.error_label || status.label;
  const successLabel = projection.label || status.label;
  const displayLabel = isFailed ? errorLabel : (['pending', 'running', 'in_progress'].includes(toolCall.status) ? activeLabel : successLabel);

  if (hideDetails) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1.5">
        <Icon className={`w-3.5 h-3.5 ${status.color} ${status.spin ? 'animate-spin' : ''}`} />
        <span>{displayLabel}</span>
      </div>
    );
  }

  let parsedArgs = toolCall.arguments_string;
  try {
    if (typeof toolCall.arguments_string === 'string') parsedArgs = JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2);
  } catch (e) { /* keep raw */ }

  return (
    <div className="mt-2 text-xs border border-slate-100 rounded-lg overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors">
        {expanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
        <Icon className={`w-3.5 h-3.5 ${status.color} ${status.spin ? 'animate-spin' : ''}`} />
        <span className="font-medium text-slate-600">{toolCall.name || 'Tool'}</span>
        <span className={`ml-auto ${status.color}`}>{displayLabel}</span>
      </button>
      {expanded && (
        <div className="px-3 py-2 space-y-2">
          {parsedArgs && (
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Parameters</div>
              <pre className="text-[10px] text-slate-600 bg-slate-50 rounded p-2 overflow-x-auto">{parsedArgs}</pre>
            </div>
          )}
          {parsedResults != null && (
            <div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Result</div>
              <pre className="text-[10px] text-slate-600 bg-slate-50 rounded p-2 overflow-x-auto max-h-40 overflow-y-auto">{typeof parsedResults === 'string' ? parsedResults : JSON.stringify(parsedResults, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div className={`max-w-[85%] ${isUser ? '' : 'w-full'}`}>
        {message.content && (
          isUser ? (
            <div className="bg-[#0F1E3C] text-white text-sm px-4 py-2.5 rounded-2xl rounded-tr-sm">
              {message.content}
            </div>
          ) : (
            <div className="bg-slate-50 text-slate-800 text-sm px-4 py-2.5 rounded-2xl rounded-tl-sm">
              <ReactMarkdown components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
                code: ({ children }) => <code className="bg-slate-200 px-1 py-0.5 rounded text-xs">{children}</code>,
                pre: ({ children }) => <pre className="bg-slate-200 p-2 rounded text-xs overflow-x-auto mb-2">{children}</pre>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                h1: ({ children }) => <h1 className="font-bold text-base mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="font-bold text-sm mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="font-semibold text-sm mb-1">{children}</h3>,
              }}>
                {message.content}
              </ReactMarkdown>
            </div>
          )
        )}
        {message.tool_calls?.map((tc, i) => <ToolCallDisplay key={i} toolCall={tc} />)}
      </div>
    </div>
  );
}