import type { Trade } from '../../types';
import { fmtDateFull, fmtPnl } from '../../utils';
import { ResultBadge, DirectionBadge, QualityBadge } from '../ui/Badges';
import { CompareSlider } from '../ui/CompareSlider';
import { Lightbox } from '../ui/Lightbox';
import { useState } from 'react';

interface Props {
  trade: Trade | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function TradeDetailModal({ trade, onClose, onEdit, onDelete }: Props) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  if (!trade) return null;

  const pnl = trade.pnl ?? 0;
  const pnlColor = pnl >= 0 ? 'var(--green)' : 'var(--red)';
  const stars = '★'.repeat(trade.exitRating || 0) + '☆'.repeat(5 - (trade.exitRating || 0));

  return (
    <>
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">{trade.asset} · {fmtDateFull(trade.date)}</div>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            {/* Header row */}
            <div style={{ marginBottom: 24 }}>
              <div className="flex gap-8 mb-8" style={{ flexWrap: 'wrap' }}>
                <DirectionBadge direction={trade.direction} />
                <ResultBadge result={trade.result} />
                <QualityBadge quality={trade.quality} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'var(--font-mono)', color: pnlColor }}>{fmtPnl(trade.pnl)}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{fmtDateFull(trade.date)}</div>
            </div>

            <div className="trade-detail-grid mb-24">
              <div>
                {[
                  ['Asset', trade.asset],
                  ['Session', trade.session],
                  ['Trade Type', trade.type],
                  ['Setup', trade.setup],
                  ['POI', trade.poi],
                  ['Risk Amount', trade.risk != null ? `$${trade.risk}` : null],
                  ['R:R Ratio', trade.rr != null ? `1:${trade.rr}` : null],
                ].map(([label, val]) => val ? (
                  <div key={label as string} className="detail-row">
                    <span className="detail-label">{label}</span>
                    <span className="detail-value font-mono">{val}</span>
                  </div>
                ) : null)}
              </div>
              <div>
                {[
                  ['HTF Bias', [trade.htfBias, trade.htfTf].filter(Boolean).join(' ')],
                  ['Intraday Bias', [trade.idBias, trade.idTf].filter(Boolean).join(' ')],
                  ['Emotion', trade.emotion],
                ].map(([label, val]) => val ? (
                  <div key={label as string} className="detail-row">
                    <span className="detail-label">{label}</span>
                    <span className="detail-value">{val}</span>
                  </div>
                ) : null)}
                <div className="detail-row">
                  <span className="detail-label">Exit Quality</span>
                  <span className="detail-value" style={{ color: 'var(--yellow)', letterSpacing: 2 }}>{stars}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Plan Followed</span>
                  <span className="detail-value">
                    {trade.rules && trade.rules.length > 0
                      ? trade.planFollowed
                        ? <span className="plan-followed">✓ Yes</span>
                        : <span className="plan-violated">✕ No</span>
                      : '—'}
                  </span>
                </div>
                {trade.confirmations?.length ? (
                  <div className="detail-row">
                    <span className="detail-label">Confirmations</span>
                    <span className="detail-value" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{trade.confirmations.join(' · ')}</span>
                  </div>
                ) : null}
                {trade.mistakes?.length ? (
                  <div className="detail-row">
                    <span className="detail-label">Mistakes</span>
                    <span className="detail-value" style={{ fontSize: 12, color: 'var(--red)' }}>{trade.mistakes.join(' · ')}</span>
                  </div>
                ) : null}
              </div>
            </div>

            {trade.notes && (
              <div className="form-section">
                <div className="section-title">📝 Notes</div>
                <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{trade.notes}</div>
              </div>
            )}

            {trade.replay && (
              <div className="form-section">
                <div className="section-title">🔁 Replay Notes</div>
                <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{trade.replay}</div>
              </div>
            )}

            {/* Screenshots */}
            {(trade.beforeImg || trade.afterImg) && (
              <div className="form-section">
                <div className="section-title">📸 Screenshots</div>
                {trade.beforeImg && trade.afterImg ? (
                  <>
                    <CompareSlider before={trade.beforeImg} after={trade.afterImg} />
                    <div className="flex gap-8" style={{ marginTop: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setLightboxSrc(trade.beforeImg!)}>🔍 Before</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setLightboxSrc(trade.afterImg!)}>🔍 After</button>
                    </div>
                  </>
                ) : (
                  <img
                    src={trade.beforeImg || trade.afterImg || ''}
                    alt="Screenshot"
                    style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                    onClick={() => setLightboxSrc(trade.beforeImg || trade.afterImg || '')}
                  />
                )}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn btn-danger btn-sm" onClick={onDelete}>🗑 Delete</button>
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
            <button className="btn btn-primary" onClick={onEdit}>✏️ Edit</button>
          </div>
        </div>
      </div>
    </>
  );
}
