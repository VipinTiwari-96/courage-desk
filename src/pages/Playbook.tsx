import { useState } from 'react';
import { useStore } from '../store';
import type { PlaybookEntry } from '../types';
import { PlaybookModal } from '../components/modals/PlaybookModal';
import { Lightbox } from '../components/ui/Lightbox';

interface Props { onConfirm: (msg: string, label?: string) => Promise<boolean>; onToast: (msg: string, type?: 'success' | 'error' | 'info') => void; }

export function Playbook({ onConfirm, onToast }: Props) {
  const { playbook, savePlaybook, deletePlaybook } = useStore();
  const [modalEntry, setModalEntry] = useState<PlaybookEntry | null | undefined>(undefined);
  const [detailEntry, setDetailEntry] = useState<PlaybookEntry | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const handleSave = async (entry: PlaybookEntry) => {
    await savePlaybook(entry);
    onToast(entry.id ? 'Setup updated ✓' : 'Setup added ✓', 'success');
  };

  const handleDelete = async (entry: PlaybookEntry) => {
    const ok = await onConfirm('Delete this playbook entry?');
    if (!ok) return;
    await deletePlaybook(entry.id!);
    setDetailEntry(null);
    onToast('Entry deleted', 'info');
  };

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">Playbook</div><div className="page-subtitle">Define and document your trading setups</div></div>
        <button className="btn btn-primary" onClick={() => setModalEntry(null)}>➕ Add Setup</button>
      </div>

      {playbook.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📖</div><h3>No setups defined</h3><p>Create your first playbook entry to document a trading setup.</p></div>
      ) : (
        <div className="playbook-grid">
          {playbook.map(e => (
            <div key={e.id} className="playbook-card" onClick={() => setDetailEntry(e)}>
              <div className="flex-between mb-8">
                <div className="playbook-name">{e.name}</div>
                <div className="flex gap-8">
                  <button className="btn-icon btn-sm" onClick={ev => { ev.stopPropagation(); setModalEntry(e); }} title="Edit">✏️</button>
                  <button className="btn-icon btn-sm" onClick={ev => { ev.stopPropagation(); handleDelete(e); }} title="Delete">🗑</button>
                </div>
              </div>
              {e.desc && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>{e.desc.slice(0, 100)}{e.desc.length > 100 ? '...' : ''}</div>}
              {(e.screenshots?.length ?? 0) > 0 && (
                <div style={{ display: 'flex', gap: 4, marginBottom: 8, overflow: 'hidden', borderRadius: 6 }}>
                  {e.screenshots!.slice(0, 3).map((img, i) => (
                    <img key={i} src={img} alt={`Sample ${i + 1}`} style={{ width: e.screenshots!.length === 1 ? '100%' : 'calc(33.3% - 3px)', height: 56, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                  ))}
                  {e.screenshots!.length > 3 && (
                    <div style={{ width: 'calc(33.3% - 3px)', height: 56, background: 'var(--bg-input)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>+{e.screenshots!.length - 3}</div>
                  )}
                </div>
              )}
              <div className="flex gap-8" style={{ flexWrap: 'wrap', marginTop: 6 }}>
                {e.timeframes && <span className="badge badge-a" style={{ fontSize: 10.5 }}>{e.timeframes}</span>}
                {e.rr && <span className="badge badge-be" style={{ fontSize: 10.5 }}>R:R {e.rr}</span>}
                {e.rules && <span className="badge badge-aplus" style={{ fontSize: 10.5 }}>{e.rules.split('\n').filter(Boolean).length} rules</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {modalEntry !== undefined && (
        <PlaybookModal entry={modalEntry} onClose={() => setModalEntry(undefined)} onSave={handleSave} />
      )}

      {/* Detail */}
      {detailEntry && (
        <>
          <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
          <div className="modal-overlay" onClick={() => setDetailEntry(null)}>
            <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">{detailEntry.name}</div>
                <button className="close-btn" onClick={() => setDetailEntry(null)}>✕</button>
              </div>
              <div className="modal-body">
                {detailEntry.desc && <div style={{ marginBottom: 20, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{detailEntry.desc}</div>}
                {detailEntry.rules && detailEntry.rules.split('\n').filter(Boolean).length > 0 && (
                  <div className="form-section">
                    <div className="section-title">✅ Entry Rules</div>
                    {detailEntry.rules.split('\n').filter(Boolean).map((r, i) => (
                      <div key={i} className="rule-item">
                        <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 12 }}>{i + 1}</span>
                        <label>{r}</label>
                      </div>
                    ))}
                  </div>
                )}
                <div className="form-grid" style={{ marginTop: 16 }}>
                  {detailEntry.timeframes && <div><div className="detail-label">Timeframes</div><div className="detail-value" style={{ marginTop: 4 }}>{detailEntry.timeframes}</div></div>}
                  {detailEntry.rr && <div><div className="detail-label">Typical R:R</div><div className="detail-value" style={{ marginTop: 4 }}>{detailEntry.rr}</div></div>}
                </div>
                {detailEntry.notes && (
                  <div className="form-section" style={{ marginTop: 16 }}>
                    <div className="section-title">💡 Edge</div>
                    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{detailEntry.notes}</div>
                  </div>
                )}
                {(detailEntry.screenshots?.length ?? 0) > 0 && (
                  <div className="form-section" style={{ marginTop: 16 }}>
                    <div className="section-title">📸 Sample Screenshots</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 8 }}>
                      {detailEntry.screenshots!.map((img, i) => (
                        <div key={i} style={{ position: 'relative' }}>
                          <img src={img} alt={`Sample ${i + 1}`} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'block' }} onClick={() => setLightboxSrc(img)} />
                          <div style={{ position: 'absolute', bottom: 5, left: 7, fontSize: 10, color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 4 }}>Sample {i + 1}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(detailEntry)}>🗑 Delete</button>
                <button className="btn btn-ghost" onClick={() => setDetailEntry(null)}>Close</button>
                <button className="btn btn-primary" onClick={() => { setDetailEntry(null); setModalEntry(detailEntry); }}>✏️ Edit</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
