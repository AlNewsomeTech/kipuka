import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, Loader2 } from 'lucide-react';

const inputClass =
  'w-full rounded-xl border border-[#2a3d5c] bg-[#0d1a2e] px-3.5 py-2.5 text-sm text-white placeholder:text-[#64789a] focus:border-[#479dcf] focus:outline-none focus:ring-2 focus:ring-[#479dcf]/30';

export default function DemoRequestModal({ open, onOpenChange }) {
  const [form, setForm] = useState({ full_name: '', email: '', company: '', role_title: '', message: '', website: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.full_name.trim()) { setError('Please enter your name.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) { setError('Please enter a valid email address.'); return; }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('submitDemoRequest', form);
      if (res?.data?.ok) {
        setSubmitted(true);
      } else {
        setError(res?.data?.error || 'Unable to submit request. Please try again.');
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-[#24385a] bg-[#0b1626] text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Request a Demo</DialogTitle>
          <DialogDescription className="text-[#8fa3bd]">
            Tell us a little about your team and we&apos;ll be in touch to schedule a walkthrough.
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-[#67d1f0]" aria-hidden="true" />
            <p className="text-base font-bold text-white">Request received</p>
            <p className="text-sm text-[#8fa3bd]">Thank you — we&apos;ll follow up at the email address you provided.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
            <div>
              <label htmlFor="demo-name" className="mb-1 block text-xs font-bold text-[#cfe4f5]">Full name *</label>
              <input id="demo-name" type="text" required autoComplete="name" value={form.full_name} onChange={set('full_name')} className={inputClass} />
            </div>
            <div>
              <label htmlFor="demo-email" className="mb-1 block text-xs font-bold text-[#cfe4f5]">Work email *</label>
              <input id="demo-email" type="email" required autoComplete="email" value={form.email} onChange={set('email')} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="demo-company" className="mb-1 block text-xs font-bold text-[#cfe4f5]">Company</label>
                <input id="demo-company" type="text" autoComplete="organization" value={form.company} onChange={set('company')} className={inputClass} />
              </div>
              <div>
                <label htmlFor="demo-role" className="mb-1 block text-xs font-bold text-[#cfe4f5]">Role</label>
                <input id="demo-role" type="text" autoComplete="organization-title" value={form.role_title} onChange={set('role_title')} className={inputClass} />
              </div>
            </div>
            <div>
              <label htmlFor="demo-message" className="mb-1 block text-xs font-bold text-[#cfe4f5]">What would you like to see?</label>
              <textarea id="demo-message" rows={3} value={form.message} onChange={set('message')} className={inputClass} />
            </div>

            {/* Honeypot — hidden from real users and assistive tech */}
            <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-px w-px overflow-hidden">
              <label htmlFor="demo-website">Website</label>
              <input id="demo-website" type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 px-3.5 py-2.5 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#479dcf] px-4 py-2.5 text-sm font-bold text-[#04101f] transition-colors hover:bg-[#67d1f0] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}