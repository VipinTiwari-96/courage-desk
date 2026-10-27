import { useState, useEffect, useRef } from 'react';
import { ScreenshotRepo, compressImage } from '../db';
import type { ScreenshotPair } from '../db';
import { Lightbox } from '../components/ui/Lightbox';

interface Props {
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string, label?: string) => Promise<boolean>;
}

// ── Image upload slot ─────────────────────────────────────────────────────────
function ImgSlot({ value, slot, onChange, onPreview }: {
  value: string | null;
  slot: 'before' | 'after';
  onChange: (v: string | null) => void;
  onPreview: (src: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pasting, setPasting] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    onChange(await compressImage(file));
  };

  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      if (value) return;
      const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'));
      if (!item) return;
      const file = item.getAsFile();
      if (!file) return;
      e.stopImmediatePropagation();
      setPasting(true);
      handleFile(file).then(() => setTimeout(() => setPasting(false), 600));
    };
    document.addEventListener('paste', handler, true);
    return () => document.removeEventListener('paste', handler, true);
  }, [value]);

  const accent = slot === 'before' ? 'var(--accent)' : 'var(--green)';
  const label  = slot === 'before' ? '📸 Before Entry' : '📷 After Exit';

  return (
    <div>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7 }}>
        {label}
      </div>
      {value ? (
        <div style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: `1.5px solid ${accent}55` }}>
          <img src={value} alt={label} style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block', cursor: 'zoom-in' }} onClick={() => onPreview(value)} />
          <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', gap: 5 }}>
            <button className="img-action-btn" onClick={() => inputRef.current?.click()} title="Replace">↺</button>
            <button className="img-action-btn del" onClick={() => onChange(null)} title="Remove">✕</button>
          </div>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
        </div>
      ) : (
        <div
          className={`img-upload-area${dragging || pasting ? ' dragover' : ''}`}
          style={{ minHeight: 150, outline: 'none' }}
          tabIndex={0}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onPaste={async e => {
            const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
            if (!item) return;
            const file = item.getAsFile();
            if (!file) return;
            setPasting(true);
            await handleFile(file);
            setTimeout(() => setPasting(false), 600);
          }}
          onClick={() => inputRef.current?.click()}
        >
          <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>📷</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.7 }}>
            {pasting
              ? <span style={{ color: accent }}>⏳ Pasting…</span>
              : <>
                  <div>Drag, click to upload</div>
                  <div>or <kbd style={{ background: 'var(--border)', border: '1px solid var(--border-light)', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontFamily: 'var(--font-mono)' }}>Ctrl+V</kbd> to paste</div>
                </>
            }
          </div>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
        </div>
      )}
    </div>
  );
}

// ── Gallery card ──────────────────────────────────────────────────────────────
function PairCard({ pair, onEdit, onDelete, onPreview }: {
  pair: ScreenshotPair;
  onEdit: () => void;
  onDelete: () => void;
  onPreview: (src: string, imgs: string[]) => void;
}) {
  const imgs = [pair.beforeImg, pair.afterImg].filter(Boolean) as string[];
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', transition: 'border-color 0.15s, transform 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Header */}
      <div style={{ padding: '11px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pair.label}</div>
          {pair.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{pair.description}</div>}
        </div>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0, marginLeft: 10 }}>
          <button className="btn-icon btn-sm" onClick={onEdit} title="Edit">✏️</button>
          <button className="btn-icon btn-sm" onClick={onDelete} title="Delete" style={{ color: 'var(--red)' }}>🗑</button>
        </div>
      </div>

      {/* Screenshots */}
      {imgs.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: pair.beforeImg && pair.afterImg ? '1fr 1fr' : '1fr' }}>
          {pair.beforeImg && (
            <div style={{ position: 'relative', borderRight: pair.afterImg ? '1px solid var(--border)' : 'none' }}>
              <img src={pair.beforeImg} alt="Before" style={{ width: '100%', height: 165, objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                onClick={() => onPreview(pair.beforeImg!, imgs)} />
              <div style={{ position: 'absolute', top: 6, left: 8, fontSize: 10.5, background: 'rgba(0,0,0,0.65)', color: 'white', padding: '2px 8px', borderRadius: 4 }}>Before</div>
            </div>
          )}
          {pair.afterImg && (
            <div style={{ position: 'relative' }}>
              <img src={pair.afterImg} alt="After" style={{ width: '100%', height: 165, objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                onClick={() => onPreview(pair.afterImg!, imgs)} />
              <div style={{ position: 'absolute', top: 6, left: 8, fontSize: 10.5, background: 'rgba(0,0,0,0.65)', color: 'white', padding: '2px 8px', borderRadius: 4 }}>After</div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No images yet</div>
      )}

      {/* Footer */}
      <div style={{ padding: '7px 14px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {new Date(pair.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {imgs.length === 0 ? 'No images' : imgs.length === 1 ? '1 image' : '2 images'}
        </span>
      </div>
    </div>
  );
}

// ── Add / Edit modal ──────────────────────────────────────────────────────────
function PairModal({ pair, onClose, onSave }: {
  pair: Partial<ScreenshotPair> | null;
  onClose: () => void;
  onSave: (p: ScreenshotPair) => void;
}) {
  const [label,  setLabel]  = useState(pair?.label ?? '');
  const [desc,   setDesc]   = useState(pair?.description ?? '');
  const [before, setBefore] = useState<string | null>(pair?.beforeImg ?? null);
  const [after,  setAfter]  = useState<string | null>(pair?.afterImg ?? null);
  const [lb,     setLb]     = useState<string | null>(null);

  const imgs = [before, after].filter(Boolean) as string[];

  const handleSave = () => {
    if (!label.trim()) return;
    onSave({ id: pair?.id, label: label.trim(), description: desc.trim() || undefined, beforeImg: before, afterImg: after, createdAt: pair?.createdAt ?? new Date().toISOString() });
  };

  return (
    <>
      <Lightbox src={lb} images={imgs} onClose={() => setLb(null)} onNavigate={setLb} />
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">{pair?.id ? '✏️ Edit Screenshot Pair' : '➕ New Screenshot Pair'}</div>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            <div className="form-grid" style={{ marginBottom: 20 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Label *</label>
                <input autoFocus className="form-control" value={label}
                  onChange={e => setLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  placeholder="e.g. London Sweep — Bullish, FVG Retest — Bearish" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <input className="form-control" value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="Short note about this chart example" />
              </div>
            </div>

            <div className="form-grid">
              <ImgSlot value={before} slot="before" onChange={setBefore} onPreview={src => setLb(src)} />
              <ImgSlot value={after}  slot="after"  onChange={setAfter}  onPreview={src => setLb(src)} />
            </div>

            <div style={{ marginTop: 14, padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--text-muted)', border: '1px solid var(--border)', lineHeight: 1.6 }}>
              💡 After taking a screenshot with Snipping Tool, press <kbd style={{ background: 'var(--border)', border: '1px solid var(--border-light)', borderRadius: 3, padding: '1px 6px', fontFamily: 'var(--font-mono)', fontSize: 11 }}>Ctrl+V</kbd> — it pastes into the first empty slot automatically.
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={!label.trim()}>💾 Save</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function Screenshots({ onToast, onConfirm }: Props) {
  const [pairs,   setPairs]  = useState<ScreenshotPair[]>([]);
  const [loaded,  setLoaded] = useState(false);
  const [modal,   setModal]  = useState<Partial<ScreenshotPair> | null | false>(false);
  const [search,  setSearch] = useState('');
  const [lbSrc,   setLbSrc] = useState<string | null>(null);
  const [lbImgs,  setLbImgs] = useState<string[]>([]);

  const load = async () => { setPairs(await ScreenshotRepo.getAll()); setLoaded(true); };
  useEffect(() => { load(); }, []);

  const handleSave = async (pair: ScreenshotPair) => {
    try {
      await ScreenshotRepo.save(pair);
      await load();
      setModal(false);
      onToast(pair.id ? 'Updated ✓' : 'Saved ✓', 'success');
    } catch (err) {
      console.error(err);
      onToast('Failed to save — try using smaller images.', 'error');
    }
  };

  const handleDelete = async (pair: ScreenshotPair) => {
    const ok = await onConfirm(`Delete "${pair.label}"? This cannot be undone.`);
    if (!ok) return;
    await ScreenshotRepo.delete(pair.id!);
    await load();
    onToast('Deleted', 'info');
  };

  const openLightbox = (src: string, imgs: string[]) => {
    setLbImgs(imgs.length > 1 ? imgs : [src]);
    setLbSrc(src);
  };

  const filtered = pairs.filter(p =>
    !search ||
    p.label.toLowerCase().includes(search.toLowerCase()) ||
    (p.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (!loaded) return <div className="page"><div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div></div>;

  return (
    <div className="page">
      <Lightbox src={lbSrc} images={lbImgs} onClose={() => setLbSrc(null)} onNavigate={setLbSrc} />
      {modal !== false && <PairModal pair={modal} onClose={() => setModal(false)} onSave={handleSave} />}

      <div className="page-header">
        <div>
          <div className="page-title">📸 Screenshots</div>
          <div className="page-subtitle">Save before &amp; after chart pairs with custom labels</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(null)}>＋ Add Pair</button>
      </div>

      {pairs.length > 0 && (
        <div className="search-bar" style={{ marginBottom: 20 }}>
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input className="form-control" placeholder="Search by label or description…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {search && <button className="btn btn-ghost btn-sm" onClick={() => setSearch('')}>✕ Clear</button>}
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{filtered.length} of {pairs.length}</span>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📸</div>
          <h3>{pairs.length === 0 ? 'No screenshot pairs yet' : 'No results'}</h3>
          <p>{pairs.length === 0
            ? 'Click "Add Pair" to save your first before & after chart example with a custom label.'
            : 'Try a different search term.'}</p>
          {pairs.length === 0 && (
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setModal(null)}>＋ Add First Pair</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map(p => (
            <PairCard key={p.id} pair={p}
              onEdit={() => setModal(p)}
              onDelete={() => handleDelete(p)}
              onPreview={openLightbox}
            />
          ))}
        </div>
      )}
    </div>
  );
}
