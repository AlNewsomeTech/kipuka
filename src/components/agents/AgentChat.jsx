import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Send, Plus, MessageSquare, Loader2 } from 'lucide-react';
import MessageBubble from './MessageBubble';

export default function AgentChat({ agentName }) {
  const [conversations, setConversations] = useState([]);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setConversations([]);
    setCurrentConvId(null);
    setMessages([]);
    base44.agents.listConversations({ agent_name: agentName })
      .then((convos) => { if (active) { setConversations(convos || []); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [agentName]);

  useEffect(() => {
    if (!currentConvId) return;
    const unsubscribe = base44.agents.subscribeToConversation(currentConvId, (data) => {
      setMessages(data.messages || []);
    });
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [currentConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewConversation = async () => {
    try {
      const convo = await base44.agents.createConversation({
        agent_name: agentName,
        metadata: { name: `Chat ${new Date().toLocaleDateString()}` }
      });
      setConversations([convo, ...conversations]);
      setCurrentConvId(convo.id);
      setMessages(convo.messages || []);
    } catch (e) { /* ignore */ }
  };

  const handleSelectConversation = async (convoId) => {
    try {
      const convo = await base44.agents.getConversation(convoId);
      setCurrentConvId(convo.id);
      setMessages(convo.messages || []);
    } catch (e) { /* ignore */ }
  };

  const handleSend = async () => {
    if (!input.trim() || !currentConvId || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      const convo = await base44.agents.getConversation(currentConvId);
      await base44.agents.addMessage(convo, { role: 'user', content });
    } catch (e) { /* ignore */ }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-12rem)]">
      <div className="w-56 flex-shrink-0 bg-white rounded-xl border border-slate-200 p-3 overflow-y-auto hidden md:block">
        <button onClick={handleNewConversation} className="w-full flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg bg-[#0F1E3C] text-white hover:bg-[#1E2D4A] mb-3">
          <Plus className="w-3.5 h-3.5" /> New Chat
        </button>
        <div className="space-y-1">
          {conversations.length === 0 && <p className="text-xs text-slate-400 px-2 py-4 text-center">No conversations yet</p>}
          {conversations.map((c) => (
            <button key={c.id} onClick={() => handleSelectConversation(c.id)} className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-xs transition-colors ${currentConvId === c.id ? 'bg-slate-100 text-slate-800 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{c.metadata?.name || 'Untitled'}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 min-w-0">
        {!currentConvId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 mb-4">Start a new conversation to chat with this assistant.</p>
              <button onClick={handleNewConversation} className="md:hidden flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-[#0F1E3C] text-white hover:bg-[#1E2D4A] mx-auto">
                <Plus className="w-4 h-4" /> New Chat
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}
              {sending && (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Assistant is thinking...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="border-t border-slate-200 p-3 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white text-slate-800"
              />
              <button onClick={handleSend} disabled={!input.trim() || sending} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-[#0F1E3C] text-white hover:bg-[#1E2D4A] disabled:opacity-50">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}