import { useState } from 'react';
import { useStore } from '../store';
import type { Trade } from '../types';
import { fmtDate, fmtPnl, calcStats } from '../utils';
import { ResultBadge, DirectionBadge, QualityBadge } from '../components/ui/Badges';
import { Lightbox } from '../components/ui/Lightbox';
import { TradeDetailModal } from '../components/modals/TradeDetailModal';
import { useConfirm } from '../hooks/useConfirm';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/ui/ToastContainer';

interface Props {
  setupName: string;
  onBack: () => void;
  onEditTrade: (id: number) => void;
}

export function SetupDrilldown({ setupName, onBack, onEditTrade }: Props) {
  const { trades, deleteTrade } = useStore();
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [detailTrade, setDetailTrade] = useState<Trade | null>(null);
  const { open: confirmOpen, message: confirmMsg, okLabel, confirm, handleResolve } = useConfirm();
  const { toasts, showToast } = useToast();

  // All trades for this setup
  const setupTrades = trades.filter(t => t.setup === setupName);
  const stats = calcStats(setupTrades);

  // All images across all trades for this setup (for lightbox navigation)
  const allImages = setupTrades.flatMap(t =>
    [t.beforeImg, t.afterImg].filter(Boolean) as string[]
  );

  const openLightbox = (src: string, tradeImages: string[]) => {
    // Navigate within the trade's own images first, but allow stepping to others
    setLightboxImages(tradeImages.length > 1 ? tradeImages : allImages.filter(Boolean));
    setLightboxSrc(src);
  };

  const handleDeleteTrade = async (trade: Trade) => {
    const ok = await confirm('Delete this trade? This cannot be undone.');
    if (!ok) return;
    await deleteTrade(trade.id!);
    setDetailTrade(null);
    showToast('Trade deleted', 'info');
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <ToastContainer toasts={toasts} />
      <Lightbox
        src={lightboxSrc}
        images={lightboxImages}
        onClose={() => setLightboxSrc(null)}
        onNavigate={setLightboxSrc}
      />
      {detailTrade && (
        <TradeDetailModal
          trade={detailTrade}
          onClose={() => setDetailTrade(null)}
          onEdit={() => { setDetailTrade(null); onEditTrade(detailTrade.id!); }}
          onDelete={() => handleDeleteTrade(detailTrade)}
        />
      )}
      {confirmOpen && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <div className="confirm-icon">⚠️</div>
            <div className="confirm-msg">{confirmMsg}</div>
            <div className="confirm-btns">
              <button className="btn btn-ghost" onClick={() => handleResolve(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleResolve(true)}>{okLabel}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky header ───────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border)',
        padding: '12px 28px 14px',
        backdropFilter: 'blur(8px)',
      }}>
        {/* Back + title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button
            onClick={onBack}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '5px 12px', color: 'var(--text-secondary)', fontSize: 12.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s', flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'; }}
          >
            ← Back to Statistics
          </button>
          <div>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px' }}>📋 {setupName}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 10 }}>Setup drill-down</span>
          </div>
        </div>

        {/* Compact stat pills — single horizontal row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Trades',  value: String(stats.total), sub: `${stats.wins}W ${stats.losses}L`, cls: '' },
            { label: 'Win Rate', value: `${stats.winRate}%`, cls: stats.winRate >= 50 ? 'var(--green)' : 'var(--red)' },
            { label: 'P&L',     value: fmtPnl(stats.totalPnl), cls: stats.totalPnl >= 0 ? 'var(--green)' : 'var(--red)' },
            { label: 'Avg R:R', value: stats.avgRR, cls: '' },
            { label: 'Prof. Factor', value: stats.profitFactor, cls: parseFloat(stats.profitFactor) >= 1 ? 'var(--green)' : 'var(--red)' },
            { label: 'Expectancy', value: `$${stats.expectancy}`, cls: parseFloat(stats.expectancy) >= 0 ? 'var(--green)' : 'var(--red)' },
          ].map(({ label, value, sub, cls }) => (
            <div key={label} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '6px 12px',
              display: 'flex', flexDirection: 'column', gap: 1,
            }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: 13.5, fontWeight: 700, fontFamily: 'var(--font-mono)', color: cls || 'var(--text-primary)' }}>{value}</span>
              {sub && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{sub}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px 40px' }}>

      {setupTrades.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No trades for this setup</h3>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {setupTrades.map(trade => {
            const tradeImages = [trade.beforeImg, trade.afterImg].filter(Boolean) as string[];
            const hasImages = tradeImages.length > 0;

            return (
              <div
                key={trade.id}
                className="card"
                style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)' }}
              >
                {/* Trade header bar */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-card)', cursor: 'pointer', flexWrap: 'wrap', borderBottom: hasImages ? '1px solid var(--border)' : 'none' }}
                  onClick={() => setDetailTrade(trade)}
                >
                  <DirectionBadge direction={trade.direction} />
                  <ResultBadge result={trade.result} />
                  <QualityBadge quality={trade.quality} />
                  <span className="td-mono" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{fmtDate(trade.date)}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{trade.asset}</span>
                  {trade.session && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{trade.session}</span>}
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 16, alignItems: 'center' }}>
                    {trade.rr != null && (
                      <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>R:R <strong style={{ color: 'var(--text-primary)' }}>{trade.rr}</strong></span>
                    )}
                    <span className={`font-mono ${(trade.pnl ?? 0) >= 0 ? 'text-green' : 'text-red'}`} style={{ fontSize: 14, fontWeight: 700 }}>
                      {fmtPnl(trade.pnl)}
                    </span>
                    {trade.emotion && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {Array.isArray(trade.emotion) ? trade.emotion.join(' · ') : trade.emotion}
                      </span>
                    )}
                  </span>
                </div>

                {/* Screenshots side by side */}
                {hasImages && (
                  <div style={{ display: 'grid', gridTemplateColumns: tradeImages.length === 2 ? '1fr 1fr' : '1fr', gap: 0 }}>
                    {trade.beforeImg && (
                      <div style={{ position: 'relative', borderRight: trade.afterImg ? '1px solid var(--border)' : 'none' }}>
                        <div style={{ position: 'absolute', top: 8, left: 10, zIndex: 1, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 10.5, padding: '2px 8px', borderRadius: 4, backdropFilter: 'blur(4px)' }}>
                          Before Entry
                        </div>
                        <img
                          src={trade.beforeImg}
                          alt="Before"
                          style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                          onClick={() => openLightbox(trade.beforeImg!, tradeImages)}
                        />
                      </div>
                    )}
                    {trade.afterImg && (
                      <div style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 8, left: 10, zIndex: 1, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 10.5, padding: '2px 8px', borderRadius: 4, backdropFilter: 'blur(4px)' }}>
                          After Exit
                        </div>
                        <img
                          src={trade.afterImg}
                          alt="After"
                          style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                          onClick={() => openLightbox(trade.afterImg!, tradeImages)}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Notes strip (if any) */}
                {trade.notes && (
                  <div style={{ padding: '10px 16px', borderTop: hasImages ? '1px solid var(--border)' : 'none', fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6, background: 'var(--bg-input)' }}>
                    📝 {trade.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>  {/* end scrollable */}
    </div>
  );
}
