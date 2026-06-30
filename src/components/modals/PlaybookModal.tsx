import { useState, useEffect, useRef } from 'react';
import type { PlaybookEntry } from '../../types';
import { compressImage } from '../../db';
import { Lightbox } from '../ui/Lightbox';

interface Props {
  entry?: PlaybookEntry | null;
  onClose: () => void;
  onSave: (entry: PlaybookEntry) => void;
}

export function PlaybookModal({ entry, onClose, onSave }: Props) {
  const [form, setForm] = useState<Partial<PlaybookEntry>>({});
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slotRef = useRef<number>(0);

  useEffect(() => {
    if (entry) {
      setForm({ ...entry });
      const imgs: (string | null)[] = [...(entry.screenshots || []), null, null, null, null].slice(0, 4);
      setImages(imgs);
    } else {
      setForm({});
      setImages([null, null, null, null]);
    }
  }, [entry]);

  const set = (key: keyof PlaybookEntry, value: string) => setForm(f => ({ ...f, [key]: value }));

  const openSlot = (i: number) => { slotRef.current = i; fileInputRef.current?.click(); };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setImages(imgs => { const n = [...imgs]; n[slotRef.current] = compressed; return n; });
    e.target.value = '';
  };

  const removeImage = (i: number) => setImages(imgs => { const n = [...imgs]; n[i] = null; return n; });

  const handleSave = () => {
    if (!form.name?.trim()) return;
    onSave({ ...form, screenshots: images.filter(Boolean) as string[] } as PlaybookEntry);
    onClose();
  };

  return (
    <>
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">{entry ? 'Edit Setup' : 'Add Playbook Entry'}</div>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Setup Name *</label>
              <input className="form-control" value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="e.g. London Open Sweep" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows={3} value={form.desc || ''} onChange={e => set('desc', e.target.value)} placeholder="Describe the setup..." />
            </div>
            <div className="form-group">
              <label className="form-label">Entry Rules (one per line)</label>
              <textarea className="form-control" rows={4} value={form.rules || ''} onChange={e => set('rules', e.target.value)} placeholder={"HTF trend aligned\nLiquidity taken\nConfirmation candle formed"} />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Timeframes</label>
                <input className="form-control" value={form.timeframes || ''} onChange={e => set('timeframes', e.target.value)} placeholder="e.g. 15m, 1H" />
              </div>
              <div className="form-group">
                <label className="form-label">Typical R:R</label>
                <input className="form-control" value={form.rr || ''} onChange={e => set('rr', e.target.value)} placeholder="e.g. 1:3" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes / Edge</label>
              <textarea className="form-control" rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="What makes this setup your edge?" />
            </div>

            {/* Screenshot slots */}
            <div className="section-title" style={{ marginTop: 8 }}>📸 Sample Screenshots</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Upload chart examples illustrating this setup (up to 4)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {images.map((img, i) => img ? (
                <div key={i} style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                  <img src={img} alt={`Sample ${i + 1}`} style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block', cursor: 'pointer' }} onClick={() => setLightboxSrc(img)} />
                  <div style={{ position: 'absolute', top: 5, right: 5, display: 'flex', gap: 4 }}>
                    <button className="img-action-btn" onClick={() => openSlot(i)} title="Replace">↺</button>
                    <button className="img-action-btn del" onClick={() => removeImage(i)} title="Delete">✕</button>
                  </div>
                  <div style={{ position: 'absolute', bottom: 4, left: 6, fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>Sample {i + 1}</div>
                </div>
              ) : (
                <div key={i}
                  style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)', height: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', transition: 'all var(--transition)' }}
                  onClick={() => openSlot(i)}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <span style={{ fontSize: 22, opacity: 0.4 }}>📷</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sample {i + 1}</span>
                </div>
              ))}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>💾 Save</button>
          </div>
        </div>
      </div>
    </>
  );
}
