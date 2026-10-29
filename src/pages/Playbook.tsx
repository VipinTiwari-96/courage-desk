import { useState } from 'react';
import { useStore } from '../store';
import type { PlaybookEntry } from '../types';
import { PlaybookModal } from '../components/modals/PlaybookModal';
import { Lightbox } from '../components/ui/Lightbox';

interface Props {
  onConfirm: (msg: string, label?: string) => Promise<boolean>;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// ── Quality config ─────────────────────────────────────────────────────────────
const GRADE = {
  'A+': {
    label: 'A+ Setups',
    icon: '🏆',
    badgeClass: 'badge-aplus',
    cardAccent: '#22c55e',
    headerBg: 'rgba(20,83,45,0.7)',
    headerText: '#86efac',
    lineColor: '#22c55e',
  },
  'A': {
    label: 'A Setups',
    icon: '✅',
    badgeClass: 'badge-a',
    cardAccent: '#4ade80',
    headerBg: 'rgba(34,197,94,0.12)',
    headerText: '#4ade80',
    lineColor: '#4ade80',
  },
  'none': {
    label: 'Ungraded',
    icon: '📋',
    badgeClass: '',
    cardAccent: 'var(--border-light)',
    headerBg: 'var(--bg-card)',
    headerText: 'var(--text-muted)',
    lineColor: 'var(--border-light)',
  },
} as const;

type GradeKey = keyof typeof GRADE;

export function Playbook({ onConfirm, onToast }: Props) {
  const { playbook, savePlaybook, deletePlaybook } = useStore();
  const [modalEntry, setModalEntry] = useState<PlaybookEntry | null | undefined>(undefined);
  const [detailEntry, setDetailEntry] = useState<PlaybookEntry | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxImgs, setLightboxImgs] = useState<string[]>([]);

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

  const openLightbox = (src: string, imgs: string[]) => {
    setLightboxImgs(imgs);
    setLightboxSrc(src);
  };

  // Group entries
  const groups: { key: GradeKey; entries: PlaybookEntry[] }[] = ([
    { key: 'A+' as GradeKey,   entries: playbook.filter(e => e.quality === 'A+') },
    { key: 'A' as GradeKey,    entries: playbook.filter(e => e.quality === 'A') },
    { key: 'none' as GradeKey, entries: playbook.filter(e => !e.quality) },
  ] as { key: GradeKey; entries: PlaybookEntry[] }[]).filter(g => g.entries.length > 0);

  return (
    <div className="page">
      {/* Lightbox */}
      <Lightbox src={lightboxSrc} images={lightboxImgs} onClose={() => setLightboxSrc(null)} onNavigate={setLightboxSrc} />

      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">📖 Playbook</div>
          <div className="page-subtitle">Your documented trading setups and edge</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModalEntry(null)}>➕ Add Setup</button>
      </div>

      {/* Empty */}
      {playbook.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📖</div>
          <h3>No setups defined</h3>
          <p>Document your trading setups here so you can reference them while logging trades.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setModalEntry(null)}>➕ Add First Setup</button>
        </div>
      )}

      {/* Grouped cards */}
      {groups.map(({ key, entries }) => {
        const g = GRADE[key];
        return (
          <div key={key} style={{ marginBottom: 36 }}>

            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 16 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: g.headerBg,
                borderRadius: '8px 0 0 8px',
                padding: '6px 16px 6px 12px',
                border: `1px solid ${g.lineColor}33`,
                borderRight: 'none',
              }}>
                <span style={{ fontSize: 15 }}>{g.icon}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: g.headerText, letterSpacing: '0.3px' }}>
                  {g.label}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)',
                  background: 'rgba(0,0,0,0.2)',
                  color: g.headerText,
                  padding: '1px 7px', borderRadius: 20,
                }}>
                  {entries.length}
                </span>
              </div>
              {/* Fading line */}
              <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${g.lineColor}55 0%, transparent 100%)`, marginTop: 0 }} />
            </div>

            {/* Cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {entries.map(e => {
                const imgs = (e.screenshots || []).filter(Boolean);
                const ruleCount = e.rules ? e.rules.split('\n').filter(Boolean).length : 0;
                return (
                  <div
                    key={e.id}
                    onClick={() => setDetailEntry(e)}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      borderTop: `3px solid ${g.cardAccent}`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = g.cardAccent + '99'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderTopColor = g.cardAccent; }}
                  >
                    {/* Card header */}
                    <div style={{ padding: '14px 14px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          {e.quality && (
                            <span className={`badge ${g.badgeClass}`} style={{ fontSize: 11, flexShrink: 0 }}>
                              {e.quality}
                            </span>
                          )}
                          <span style={{ fontSize: 14, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {e.name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                          <button className="btn-icon btn-sm" title="Edit"
                            onClick={ev => { ev.stopPropagation(); setModalEntry(e); }}>✏️</button>
                          <button className="btn-icon btn-sm" title="Delete"
                            onClick={ev => { ev.stopPropagation(); handleDelete(e); }}>🗑</button>
                        </div>
                      </div>

                      {/* Description */}
                      {e.desc && (
                        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: 10 }}>
                          {e.desc.length > 90 ? e.desc.slice(0, 90) + '…' : e.desc}
                        </div>
                      )}
                    </div>

                    {/* Screenshot strip */}
                    {imgs.length > 0 && (
                      <div style={{ display: 'flex', gap: 2, margin: '0 0 0 0', overflow: 'hidden', height: 60 }}>
                        {imgs.slice(0, 3).map((img, i) => (
                          <img key={i} src={img} alt={`Sample ${i + 1}`}
                            style={{ flex: 1, objectFit: 'cover', display: 'block', minWidth: 0 }} />
                        ))}
                        {imgs.length > 3 && (
                          <div style={{ width: 44, background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, color: 'var(--text-muted)', flexShrink: 0 }}>
                            +{imgs.length - 3}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer chips */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '10px 14px', borderTop: imgs.length > 0 ? '1px solid var(--border)' : 'none' }}>
                      {e.timeframes && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                          ⏱ {e.timeframes}
                        </span>
                      )}
                      {e.rr && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                          ⚖️ {e.rr}
                        </span>
                      )}
                      {ruleCount > 0 && (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--accent-glow)', border: '1px solid var(--accent)33', color: 'var(--accent)' }}>
                          ✓ {ruleCount} rules
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Edit / Add modal */}
      {modalEntry !== undefined && (
        <PlaybookModal entry={modalEntry} onClose={() => setModalEntry(undefined)} onSave={handleSave} />
      )}

      {/* Detail modal */}
      {detailEntry && (
        <div className="modal-overlay" onClick={() => setDetailEntry(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {detailEntry.quality && (
                  <span className={`badge ${detailEntry.quality === 'A+' ? 'badge-aplus' : 'badge-a'}`}>
                    {detailEntry.quality}
                  </span>
                )}
                <div className="modal-title">{detailEntry.name}</div>
              </div>
              <button className="close-btn" onClick={() => setDetailEntry(null)}>✕</button>
            </div>

            <div className="modal-body">
              {/* Meta chips */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: detailEntry.desc ? 16 : 0 }}>
                {detailEntry.timeframes && (
                  <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                    ⏱ {detailEntry.timeframes}
                  </span>
                )}
                {detailEntry.rr && (
                  <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                    ⚖️ R:R {detailEntry.rr}
                  </span>
                )}
              </div>

              {/* Description */}
              {detailEntry.desc && (
                <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 20, marginTop: 14 }}>
                  {detailEntry.desc}
                </p>
              )}

              {/* Rules */}
              {detailEntry.rules && detailEntry.rules.split('\n').filter(Boolean).length > 0 && (
                <div className="form-section">
                  <div className="section-title">✅ Entry Rules</div>
                  {detailEntry.rules.split('\n').filter(Boolean).map((r, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '8px 12px', marginBottom: 6,
                      background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', minWidth: 18, paddingTop: 1 }}>{i + 1}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Edge / Notes */}
              {detailEntry.notes && (
                <div className="form-section">
                  <div className="section-title">💡 Edge</div>
                  <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.75 }}>{detailEntry.notes}</p>
                </div>
              )}

              {/* Screenshots */}
              {(detailEntry.screenshots?.length ?? 0) > 0 && (
                <div className="form-section">
                  <div className="section-title">📸 Sample Screenshots</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 10 }}>
                    {detailEntry.screenshots!.map((img, i) => (
                      <div key={i} style={{ position: 'relative', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                        <img src={img} alt={`Sample ${i + 1}`}
                          style={{ width: '100%', height: 145, objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                          onClick={() => openLightbox(img, detailEntry.screenshots!.filter(Boolean))} />
                        <div style={{ position: 'absolute', bottom: 5, left: 7, fontSize: 10, color: 'rgba(255,255,255,0.8)', background: 'rgba(0,0,0,0.55)', padding: '2px 7px', borderRadius: 4 }}>
                          Sample {i + 1}
                        </div>
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
      )}
    </div>
  );
}
