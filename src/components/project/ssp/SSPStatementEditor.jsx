import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import RichTextField from '@/components/ui/RichTextField';
import { cleanSspDraftText } from '@/lib/sspDraftText';

export default function SSPStatementEditor({ statement, readOnly, onSaved, onSavingChange, onDirtyChange }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(statement.implementation_statement || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const locked = readOnly || statement.statement_status === 'Approved';
  const save = async () => {
    if (locked || saving) return;
    setSaving(true); setError(''); onSavingChange(true);
    try {
      const saved = await base44.entities.SSPControlStatement.update(statement.id, { implementation_statement: cleanSspDraftText(value), statement_status: 'Draft' });
      onSaved(saved); onDirtyChange(false);
    } catch (failure) {
      setError(failure?.response?.data?.error || failure?.message || 'The statement was not saved.');
    } finally { setSaving(false); onSavingChange(false); }
  };
  return (
    <details className="rounded-lg border border-border bg-card p-4 text-card-foreground" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer text-sm font-semibold">{statement.control_id} — {statement.control_title} <span className="font-normal text-muted-foreground">({statement.statement_status || 'Draft'})</span></summary>
      {open && <div className="mt-3 space-y-3">
        <RichTextField label="Implementation statement" value={cleanSspDraftText(value)} onChange={(next, delta, source) => { setValue(next); if (source === 'user') onDirtyChange(next !== (statement.implementation_statement || '')); }} disabled={locked || saving} />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {!locked && <div className="flex gap-2">
          <button type="button" className="btn-primary" disabled={saving || value === (statement.implementation_statement || '')} onClick={save}>{saving ? 'Saving…' : 'Save statement'}</button>
          <button type="button" className="btn-secondary" disabled={saving} onClick={() => { setValue(statement.implementation_statement || ''); setError(''); onDirtyChange(false); }}>Discard unsaved changes</button>
        </div>}
      </div>}
    </details>
  );
}