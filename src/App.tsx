import { useEffect, useState } from 'react';
import { useStore } from './store';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Calendar } from './pages/Calendar';
import { Trades } from './pages/Trades';
import { Statistics } from './pages/Statistics';
import { Playbook } from './pages/Playbook';
import { Settings } from './pages/Settings';
import { MindsetRisk } from './pages/MindsetRisk';
import { SetupDrilldown } from './pages/SetupDrilldown';
import { TradeModal } from './components/modals/TradeModal';
import { TradeDetailModal } from './components/modals/TradeDetailModal';
import { ToastContainer } from './components/ui/ToastContainer';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { useToast } from './hooks/useToast';
import { useConfirm } from './hooks/useConfirm';
import type { Trade } from './types';

type Page = 'dashboard' | 'calendar' | 'trades' | 'statistics' | 'playbook' | 'mindsetrisk' | 'settings';

export default function App() {
  const { loadAll, trades, deleteTrade, theme } = useStore();
  const [page, setPage] = useState<Page>('statistics');
  const [drilldownSetup, setDrilldownSetup] = useState<string | null>(null);
  const [tradeModal, setTradeModal] = useState<{ open: boolean; tradeId?: number }>({ open: false });
  const [detailTradeId, setDetailTradeId] = useState<number | null>(null);
  const { toasts, showToast } = useToast();
  const { open: confirmOpen, message: confirmMsg, okLabel, confirm, handleResolve } = useConfirm();

  useEffect(() => {
    document.body.className = theme === 'light' ? 'light' : '';
  }, [theme]);

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); setTradeModal({ open: true }); }
      if (e.key === 'Escape') {
        if (drilldownSetup) { setDrilldownSetup(null); return; }
        setTradeModal({ open: false });
        setDetailTradeId(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [drilldownSetup]);

  const detailTrade: Trade | null = detailTradeId ? trades.find(t => t.id === detailTradeId) ?? null : null;

  const handleTradeClick = (id: number) => setDetailTradeId(id);

  const handleDeleteTrade = async () => {
    if (!detailTradeId) return;
    const ok = await confirm('Delete this trade? This cannot be undone.');
    if (!ok) return;
    await deleteTrade(detailTradeId);
    setDetailTradeId(null);
    showToast('Trade deleted', 'info');
  };

  const handleEditTrade = (id: number) => {
    setDetailTradeId(null);
    setDrilldownSetup(null);
    setTradeModal({ open: true, tradeId: id });
  };

  const handleTradeSave = (msg: string) => {
    if (msg.startsWith('__error__')) { showToast(msg.replace('__error__', ''), 'error'); return; }
    showToast(msg, 'success');
  };

  const handleNavigate = (p: Page) => {
    setDrilldownSetup(null); // clear drilldown when switching pages
    setPage(p);
  };

  return (
    <div className="app-layout">
      <Sidebar current={page} onNavigate={handleNavigate} onAddTrade={() => setTradeModal({ open: true })} />

      <main className="main-content">
        {/* Setup drilldown overlays Statistics page */}
        {drilldownSetup ? (
          <SetupDrilldown
            setupName={drilldownSetup}
            onBack={() => setDrilldownSetup(null)}
            onEditTrade={handleEditTrade}
          />
        ) : (
          <>
            {page === 'dashboard'   && <Dashboard onAddTrade={() => setTradeModal({ open: true })} onTradeClick={handleTradeClick} />}
            {page === 'calendar'    && <Calendar onTradeClick={handleTradeClick} />}
            {page === 'trades'      && <Trades onTradeClick={handleTradeClick} onAddTrade={() => setTradeModal({ open: true })} onEditTrade={handleEditTrade} />}
            {page === 'statistics'  && <Statistics onDrilldown={setDrilldownSetup} />}
            {page === 'playbook'    && <Playbook onConfirm={confirm} onToast={showToast} />}
            {page === 'mindsetrisk' && <MindsetRisk onToast={showToast} />}
            {page === 'settings'    && <Settings onConfirm={confirm} onToast={showToast} />}
          </>
        )}
      </main>

      <button className="fab" onClick={() => setTradeModal({ open: true })} title="Log Trade (Ctrl+N)">＋</button>

      {tradeModal.open && (
        <TradeModal
          trade={tradeModal.tradeId ? trades.find(t => t.id === tradeModal.tradeId) ?? null : null}
          onClose={() => setTradeModal({ open: false })}
          onSave={handleTradeSave}
        />
      )}

      {detailTradeId && (
        <TradeDetailModal
          trade={detailTrade}
          onClose={() => setDetailTradeId(null)}
          onEdit={() => handleEditTrade(detailTradeId)}
          onDelete={handleDeleteTrade}
        />
      )}

      <ToastContainer toasts={toasts} />
      <ConfirmDialog open={confirmOpen} message={confirmMsg} okLabel={okLabel} onResolve={handleResolve} />
    </div>
  );
}
