import { useRef, useState } from 'react';
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
          className={`img-upload-area${dragging ? ' dragover' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>📷</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Drag & drop or click to upload</div>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
        </div>
      )}
    </div>
  );
}
