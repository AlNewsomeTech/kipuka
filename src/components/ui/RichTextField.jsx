import ReactQuill from 'react-quill';

const MODULES = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
};

// Lightweight rich-text field used across Phase 3 project modules.
export default function RichTextField({ label, value, onChange, placeholder, disabled, onBlur }) {
  return (
    <div>
      {label && <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>}
      <div className={`rounded-lg border border-slate-200 bg-white overflow-hidden ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
        <ReactQuill theme="snow" value={value || ''} onChange={onChange} onBlur={onBlur} modules={MODULES} placeholder={placeholder} readOnly={disabled} />
      </div>
    </div>
  );
}