import { useRef, useState, useEffect } from 'react';
import { compressImage } from '../../db';

interface Props {
  label: string;
  value: string | null;
  onChange: (data: string | null) => void;
  onPreview: (src: string) => void;
}

export function ImageUpload({ label, value, onChange, onPreview }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pasting, setPasting] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const compressed = await compressImage(file);
    onChange(compressed);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      // Skip if this slot already has an image
      if (value) return;

      const items = Array.from(e.clipboardData?.items ?? []);
      const imgItem = items.find(it => it.type.startsWith('image/'));
      if (!imgItem) return;

      const file = imgItem.getAsFile();
      if (!file) return;

      // ← KEY FIX: stop other ImageUpload instances from also receiving this event
      e.stopImmediatePropagation();

      setPasting(true);
      handleFile(file).then(() => setTimeout(() => setPasting(false), 600));
    };

    // useCapture=true so our handler runs in capture phase —
    // stopImmediatePropagation() then prevents the sibling listener firing
    document.addEventListener('paste', handler, true);
    return () => document.removeEventListener('paste', handler, true);
  }, [value]);

  // Paste directly on the focused drop-zone (e.g. user clicked the area first)
  const handleDivPaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const items = Array.from(e.clipboardData.items);
    const imgItem = items.find(it => it.type.startsWith('image/'));
    if (!imgItem) return;
    const file = imgItem.getAsFile();
    if (!file) return;
    setPasting(true);
    await handleFile(file);
    setTimeout(() => setPasting(false), 600);
  };

  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {value ? (
        <div className="img-preview">
          <img src={value} alt={label} onClick={() => onPreview(value)} />
          <div className="img-preview-actions">
            <button className="img-action-btn" onClick={() => inputRef.current?.click()} title="Replace">↺</button>
            <button className="img-action-btn del" onClick={() => onChange(null)} title="Delete">✕</button>
          </div>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
        </div>
      ) : (
        <div
          tabIndex={0}
          className={`img-upload-area${dragging || pasting ? ' dragover' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onPaste={handleDivPaste}
          onClick={() => inputRef.current?.click()}
          style={{ outline: 'none' }}
        >
          <div style={{ fontSize: 26, marginBottom: 6 }}>📷</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {pasting ? (
              <span style={{ color: 'var(--accent)' }}>⏳ Pasting…</span>
            ) : (
              <>
                <div>Drag & drop or <strong style={{ color: 'var(--text-secondary)' }}>click</strong> to upload</div>
                <div style={{ marginTop: 3, fontSize: 11.5 }}>
                  or{' '}
                  <kbd style={{
                    background: 'var(--border)', border: '1px solid var(--border-light)',
                    borderRadius: 4, padding: '1px 5px', fontSize: 11,
                    fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)',
                  }}>Ctrl+V</kbd>
                  {' '}to paste from clipboard
                </div>
              </>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
        </div>
      )}
    </div>
  );
}
