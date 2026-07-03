import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ScrollText, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import * as defaults from '@/lib/termsContent';

// Admin-only management of Terms & Conditions configuration.
// Editing the terms version forces all users to re-accept on next visit.
export default function TermsSettingsPanel() {
  const { user } = useAuth();
  const [record, setRecord] = useState(null);
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.entities.TermsSettings.list('-last_updated_date', 1).then((rows) => {
      const r = rows && rows[0];
      setRecord(r || null);
      setForm({
        terms_version: r?.terms_version || defaults.DEFAULT_TERMS_VERSION,
        terms_title: r?.terms_title || defaults.DEFAULT_TERMS_TITLE,
        terms_body: r?.terms_body || '',
        login_modal_title: r?.login_modal_title || defaults.LOGIN_MODAL_TITLE,
        login_modal_body: r?.login_modal_body || defaults.LOGIN_MODAL_BODY,
        footer_warning_text: r?.footer_warning_text || defaults.FOOTER_WARNING_TEXT,
        require_acceptance: r?.require_acceptance !== false,
      });
    }).catch(() => {});
  }, []);

  const save = async () => {
    const payload = {
      ...form,
      last_updated_by: user?.full_name || user?.email || '',
      last_updated_date: new Date().toISOString(),
    };
    if (record?.id) {
      await base44.entities.TermsSettings.update(record.id, payload);
    } else {
      const created = await base44.entities.TermsSettings.create(payload);
      setRecord(created);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (!form) return null;
  const set = (k, v) => setForm({ ...form, [k]: v });

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">Terms and Conditions</h3>
        </div>
        <Link to="/terms-and-conditions" target="_blank" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
          View Terms and Conditions <ExternalLink className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Current terms version" hint="Change to require all users to re-accept">
            <input className="form-input" value={form.terms_version} onChange={(e) => set('terms_version', e.target.value)} />
          </Field>
          <Field label="Terms title">
            <input className="form-input" value={form.terms_title} onChange={(e) => set('terms_title', e.target.value)} />
          </Field>
        </div>

        <Field label="Login modal warning title">
          <input className="form-input" value={form.login_modal_title} onChange={(e) => set('login_modal_title', e.target.value)} />
        </Field>
        <Field label="Login modal warning text">
          <textarea rows={5} className="form-input" value={form.login_modal_body} onChange={(e) => set('login_modal_body', e.target.value)} />
        </Field>
        <Field label="Footer confidentiality warning text">
          <textarea rows={3} className="form-input" value={form.footer_warning_text} onChange={(e) => set('footer_warning_text', e.target.value)} />
        </Field>
        <Field label="Terms body (optional override notes)">
          <textarea rows={3} className="form-input" value={form.terms_body} onChange={(e) => set('terms_body', e.target.value)} />
        </Field>

        <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
          <input type="checkbox" checked={form.require_acceptance} onChange={(e) => set('require_acceptance', e.target.checked)} className="w-4 h-4 rounded" />
          Require acceptance before accessing the system
        </label>

        {record && (
          <p className="text-[11px] text-slate-400">
            Last updated by {record.last_updated_by || '—'}
            {record.last_updated_date ? ` on ${new Date(record.last_updated_date).toLocaleString()}` : ''}
          </p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button onClick={save} className="px-4 py-2 text-sm font-semibold bg-[#0F1E3C] text-white rounded-lg hover:bg-[#1E2D4A]">Save Terms Settings</button>
          {saved && <span className="text-xs font-medium text-green-600">Saved</span>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600 mb-1 block">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}