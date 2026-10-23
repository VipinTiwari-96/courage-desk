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
  const [images, setImages] = useState<string[]>([]);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (entry) {
      setForm({ ...entry });
      setImages(entry.screenshots || []);
    } else {
      setForm({});
      setImages([null, null, null, null]);
    }
  }, [entry]);

  const set = (key: keyof PlaybookEntry, value: string) => setForm(f => ({ ...f, [key]: value }));
  const setQuality = (val: 'A+' | 'A') =>
    setForm(f => ({ ...f, quality: f.quality === val ? undefined : val }));

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) return;
    const compressed = await Promise.all(files.map(compressImage));
    setImages(current => [...current, ...compressed]);
    input.value = '';
  };

  const removeImage = (index: number) =>
    setImages(current => current.filter((_, i) => i !== index));

  const handleSave = () => {
    if (!form.name?.trim()) return;
    onSave({ ...form, screenshots: images } as PlaybookEntry);
    onClose();
  };

  return (
    <>
      <Lightbox
        src={lightboxSrc}
        images={images}
        onClose={() => setLightboxSrc(null)}
        onNavigate={setLightboxSrc}
      />
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

            {/* Setup quality tag */}
            <div className="form-group">
              <label className="form-label">
                Setup Quality
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
                  How would you grade this setup?
                </span>
              </label>
              <div className="quality-selector" style={{ maxWidth: 220 }}>
                {(['A+', 'A'] as const).map(val => {
                  const cls = val === 'A+' ? 'active-aplus' : 'active-a';
                  const hint = val === 'A+' ? 'Highest-conviction, cleanest setup' : 'Solid, well-defined setup';
                  return (
                    <button
                      key={val}
                      className={`quality-btn${form.quality === val ? ' ' + cls : ''}`}
                      onClick={() => setQuality(val)}
                      title={hint}
                    >
                      {val}
                    </button>
                  );
                })}
                {!form.quality && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 6 }}>
                    (optional)
                  </span>
                )}
              </div>
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

            {/* Setup Screenshots */}
            <div className="section-title" style={{ marginTop: 8 }}>📸 Setup Screenshots</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
              Add multiple chart examples for this setup.
            </div>
            {images.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 12 }}>
                {images.map((img, i) => (
                  <div key={i} style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                    <img
                      src={img}
                      alt={`Setup screenshot ${i + 1}`}
                      style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                      onClick={() => setLightboxSrc(img)}
                    />
                    <button
                      className="img-action-btn del"
                      onClick={() => removeImage(i)}
                      title="Remove screenshot"
                      aria-label={`Remove screenshot ${i + 1}`}
                      style={{ position: 'absolute', top: 5, right: 5 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current?.click()}>
              ➕ Add screenshots
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFile} />
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
