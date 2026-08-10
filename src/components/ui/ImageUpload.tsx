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
  const areaRef = useRef<HTMLDivElement>(null);

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

  // Handle paste — works both when the area is focused AND globally via Ctrl+V
  // We use a global paste listener scoped to when this slot has no image yet
  const handlePaste = async (e: ClipboardEvent) => {
    // Only handle if no image already assigned and paste contains an image
    if (value) return;
    const items = Array.from(e.clipboardData?.items ?? []);
    const imgItem = items.find(it => it.type.startsWith('image/'));
    if (!imgItem) return;
    const file = imgItem.getAsFile();
    if (!file) return;
    // Flash the paste indicator
    setPasting(true);
    await handleFile(file);
    setTimeout(() => setPasting(false), 600);
  };

  // Also handle paste directly on the drop-zone div (when focused)
  const handleDivPaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imgItem = items.find(it => it.type.startsWith('image/'));
    if (!imgItem) return;
    const file = imgItem.getAsFile();
    if (!file) return;
    setPasting(true);
    await handleFile(file);
    setTimeout(() => setPasting(false), 600);
  };

  useEffect(() => {
    // Attach a global paste listener so Ctrl+V anywhere on page works
    // Each ImageUpload instance listens, but only accepts if it has no image
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [value]); // re-bind when value changes so the guard is fresh

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
          ref={areaRef}
          tabIndex={0}  // make focusable so paste event fires on the element
          className={`img-upload-area${dragging ? ' dragover' : ''}${pasting ? ' dragover' : ''}`}
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
              <span style={{ color: 'var(--accent)' }}>⏳ Pasting image…</span>
            ) : (
              <>
                <div>Drag & drop or <strong style={{ color: 'var(--text-secondary)' }}>click</strong> to upload</div>
                <div style={{ marginTop: 3, fontSize: 11.5 }}>
                  or <kbd style={{
                    background: 'var(--border)', border: '1px solid var(--border-light)',
                    borderRadius: 4, padding: '1px 5px', fontSize: 11,
                    fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)'
                  }}>Ctrl+V</kbd> to paste from clipboard
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
