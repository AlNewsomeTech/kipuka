import { useState } from 'react';
import { Bot, Wrench, User, ArrowLeft } from 'lucide-react';
import AgentChat from '@/components/agents/AgentChat';

const agents = [
  {
    name: 'admin_assistant',
    label: 'Admin Assistant',
    icon: Bot,
    description: 'Get quick reports on all clients, track deployment progress across your portfolio, and ask questions about completing tasks.',
  },
  {
    name: 'technician_assistant',
    label: 'Technician Assistant',
    icon: Wrench,
    description: 'Get step-by-step guidance on completing CMMC 2.0 tasks correctly, with Microsoft M365 deployment best practices and evidence requirements.',
  },
  {
    name: 'client_assistant',
    label: 'Client Assistant',
    icon: User,
    description: 'Get quick, non-technical updates on your CMMC deployment project progress — what\'s complete, in progress, and coming next.',
  },
];

export default function AIAssistant() {
  const [selectedAgent, setSelectedAgent] = useState(null);

  if (selectedAgent) {
    const agent = agents.find(a => a.name === selectedAgent);
    const Icon = agent.icon;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedAgent(null)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-[#0F1E3C]" />
            <h1 className="text-lg font-bold text-slate-900">{agent.label}</h1>
          </div>
        </div>
        <AgentChat agentName={agent.name} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">AI Assistants</h1>
        <p className="text-sm text-slate-500 mt-1">Choose an assistant to help with your CMMC deployment workflow.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const Icon = agent.icon;
          return (
            <button key={agent.name} onClick={() => setSelectedAgent(agent.name)} className="bg-white rounded-xl border border-slate-200 p-5 text-left hover:border-blue-300 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-[#0F1E3C] flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800 mb-1">{agent.label}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{agent.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}