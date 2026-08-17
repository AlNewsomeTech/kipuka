import { useEffect, useState } from 'react';
import { ListPlus, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Topic queue for the scheduled writer. The next Queued topic is used on the
// following scheduled run. When the queue is empty the writer falls back to its
// built-in CMMC keyword rotation, so the schedule never stalls.
export default function BlogTopicQueue() {
  const [topics, setTopics] = useState(null);
  const [title, setTitle] = useState('');
  const [keyword, setKeyword] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const rows = await base44.entities.BlogTopic.filter({ status: 'Queued' }, 'created_date', 50);
    setTopics(rows);
  };
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await base44.entities.BlogTopic.create({
        working_title: title.trim(),
        target_keyword: keyword.trim(),
        status: 'Queued',
      });
      setTitle('');
      setKeyword('');
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (topic) => {
    await base44.entities.BlogTopic.update(topic.id, { status: 'Skipped' });
    await load();
  };

  return (
    <div className="app-surface p-5">
      <h2 className="text-sm font-extrabold text-slate-800">Topic Queue</h2>
      <p className="page-subtitle mt-1">
        The scheduled writer runs Sunday, Tuesday, and Thursday at 7:00 AM and takes the top topic.
        Leave the queue empty to use the built-in CMMC keyword rotation.
      </p>

      <form onSubmit={add} className="mt-4 flex flex-wrap gap-2">
        <input
          className="form-input min-w-[220px] flex-1"
          placeholder="Working title, e.g. How to scope an enclave for CMMC"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="form-input w-full sm:w-56"
          placeholder="Target keyword"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <button type="submit" className="btn-secondary" disabled={saving || !title.trim()}>
          <ListPlus className="h-4 w-4" /> Add
        </button>
      </form>

      {topics === null ? (
        <p className="mt-4 text-xs text-slate-500">Loading topics…</p>
      ) : topics.length === 0 ? (
        <p className="mt-4 text-xs text-slate-500">
          No queued topics. The next scheduled article uses the keyword rotation.
        </p>
      ) : (
        <ol className="mt-4 divide-y divide-slate-100">
          {topics.map((t, i) => (
            <li key={t.id} className="flex items-center gap-3 py-2.5">
              <span className="w-5 text-xs font-bold text-slate-400">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{t.working_title}</p>
                {t.target_keyword && <p className="truncate text-xs text-slate-500">{t.target_keyword}</p>}
              </div>
              <button
                type="button"
                onClick={() => remove(t)}
                title="Remove from queue"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}