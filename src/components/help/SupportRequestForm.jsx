import { useState, useEffect } from 'react';
import { Mail, Loader2, CheckCircle2, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useOrg } from '@/lib/orgContext';
import RichTextField from '@/components/ui/RichTextField';

const REQUEST_TYPES = ['Technical Support', 'CMMC Question', 'Evidence Question', 'SSP Question', 'POA&M Question', 'Account Access', 'Billing', 'Other'];
const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];

// Manual support request submission. No automated email is sent.
export default function SupportRequestForm() {
  const { user } = useAuth();
  const { selectedOrgId } = useOrg();
  const [form, setForm] = useState({
    requester_name: '', requester_email: '', request_type: 'CMMC Question',
    subject: '', description: '', priority: 'Normal',
  });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    setForm((f) => ({ ...f, requester_name: user?.full_name || '', requester_email: user?.email || '' }));
  }, [user]);

  const loadRecent = async () => {
    const mine = await base44.entities.SupportRequest.filter({ created_by_id: user?.id }, '-created_date', 5).catch(() => []);
    setRecent(mine);
  };
  useEffect(() => { if (user?.id) loadRecent(); }, [user?.id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    await base44.entities.SupportRequest.create({
      ...form,
      organization_id: selectedOrgId || undefined,
      status: 'Open',
    });
    setSaving(false);
    setDone(true);
    setForm((f) => ({ ...f, subject: '', description: '' }));
    loadRecent();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Your Name</label>
            <input className="form-input" value={form.requester_name} onChange={(e) => set('requester_name', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Your Email</label>
            <input type="email" className="form-input" value={form.requester_email} onChange={(e) => set('requester_email', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Request Type</label>
            <select className="form-input" value={form.request_type} onChange={(e) => set('request_type', e.target.value)}>
              {REQUEST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Priority</label>
            <select className="form-input" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Subject *</label>
          <input className="form-input" value={form.subject} onChange={(e) => set('subject', e.target.value)} />
        </div>
        <RichTextField label="Description" value={form.description} onChange={(v) => set('description', v)} placeholder="Describe your question or issue…" />

        {done && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            <CheckCircle2 className="w-4 h-4" /> Your request was submitted. The Pac-Sec team will follow up.
          </div>
        )}

        <div className="flex justify-end">
          <button onClick={submit} disabled={saving || !form.subject.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Submit Request
          </button>
        </div>
      </div>

      {recent.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 text-sm font-bold text-slate-800 flex items-center gap-2">
            <Mail className="w-4 h-4 text-slate-500" /> Your Recent Requests
          </div>
          <div className="divide-y divide-slate-100">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span className="text-slate-700 truncate">{r.subject}</span>
                <span className="ml-auto text-xs text-slate-400">{r.request_type}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}