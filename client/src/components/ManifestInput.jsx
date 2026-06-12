export default function ManifestInput({ value, onChange, placeholder }) {
  const lineCount = (value || '').split('\n').length;
  const charCount = (value || '').length;

  return (
    <div className="manifest-editor">
      <textarea
        className="manifest-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        id="manifest-input"
      />
      <div className="manifest-footer">
        <span>{lineCount} lines • {charCount} characters</span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigator.clipboard.readText().then(t => onChange(t)).catch(() => {})}
            style={{ padding: '2px 8px', fontSize: '0.6875rem' }}
          >
            📋 Paste
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => onChange('')}
            style={{ padding: '2px 8px', fontSize: '0.6875rem' }}
            disabled={!value}
          >
            ✕ Clear
          </button>
        </div>
      </div>
    </div>
  );
}
