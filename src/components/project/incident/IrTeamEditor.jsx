import { useState, useEffect } from 'react';
import { Plus, Trash2, Users, Save, Loader2 } from 'lucide-react';

// Editor for the IR team roster (name, role, phone, email, escalation order)
// plus the free-text plan fields.
export default function IrTeamEditor({ plan, readOnly, saving, onSave, onField }) {
  const [members, setMembers] = useState(plan?.team_members || []);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { setMembers(plan?.team_members || []); setDirty(false); }, [plan?.id]);

  const update = (idx, patch) => { setMembers((m) => m.map((x, i) => i === idx ? { ...x, ...patch } : x)); setDirty(true); };
  const add = () => { setMembers((m) => [...m, { name: '', role: '', phone: '', email: '', escalation_order: m.length + 1 }]); setDirty(true); };
  const remove = (idx) => { setMembers((m) => m.filter((_, i) => i !== idx)); setDirty(true); };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800"><Users className="w-4 h-4" /> Incident Response Team</div>
        {!readOnly && (
          <div className="flex gap-2">
            <button onClick={add} className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F1E3C] hover:underline"><Plus className="w-3.5 h-3.5" /> Add Member</button>
            {dirty && (
              <button onClick={() => { onSave(members); setDirty(false); }} disabled={saving}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold text-white bg-[#0F1E3C] disabled:opacity-60">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Team
              </button>
            )}
          </div>
        )}
      </div>

      {members.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No team members yet. {!readOnly && 'Add the incident response team and escalation order.'}</p>
      ) : (
        <div className="space-y-2">
          {members.map((m, idx) => (
            <div key={idx} className="grid grid-cols-2 sm:grid-cols-[50px_1fr_1fr_1fr_1fr_28px] gap-2 items-center">
              <input className="form-input text-xs py-1" type="number" placeholder="#" value={m.escalation_order ?? ''} disabled={readOnly}
                onChange={(e) => update(idx, { escalation_order: e.target.value ? Number(e.target.value) : '' })} />
              <input className="form-input text-xs py-1" placeholder="Name" value={m.name || ''} disabled={readOnly} onChange={(e) => update(idx, { name: e.target.value })} />
              <input className="form-input text-xs py-1" placeholder="Role" value={m.role || ''} disabled={readOnly} onChange={(e) => update(idx, { role: e.target.value })} />
              <input className="form-input text-xs py-1" placeholder="Phone" value={m.phone || ''} disabled={readOnly} onChange={(e) => update(idx, { phone: e.target.value })} />
              <input className="form-input text-xs py-1" placeholder="Email" value={m.email || ''} disabled={readOnly} onChange={(e) => update(idx, { email: e.target.value })} />
              {!readOnly && <button onClick={() => remove(idx)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
            </div>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
        {[
          ['detection_sources', 'Detection Sources'],
          ['containment_notes', 'Containment Notes'],
          ['recovery_notes', 'Eradication & Recovery Notes'],
          ['communications_notes', 'Communications Notes'],
        ].map(([key, label]) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
            <textarea className="form-input min-h-[54px] text-xs" defaultValue={plan?.[key] || ''} disabled={readOnly}
              onBlur={(e) => { if (e.target.value !== (plan?.[key] || '')) onField({ [key]: e.target.value }); }} />
          </div>
        ))}
      </div>
    </div>
  );
}