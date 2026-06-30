import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { useStore } from '../store';
import { calcStats, fmtDate, fmtPnl } from '../utils';
import { ResultBadge, DirectionBadge } from '../components/ui/Badges';

Chart.register(...registerables);

interface Props { onAddTrade: () => void; onTradeClick: (id: number) => void; }

export function Dashboard({ onAddTrade, onTradeClick }: Props) {
  const { trades, theme } = useStore();
  const pnlRef = useRef<HTMLCanvasElement>(null);
  const assetRef = useRef<HTMLCanvasElement>(null);
  const pnlChart = useRef<Chart | null>(null);
  const assetChart = useRef<Chart | null>(null);
  const stats = calcStats(trades);

  const gridColor = theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)';
  const tickColor = theme === 'light' ? '#9090b0' : '#55556a';

  useEffect(() => {
    if (!pnlRef.current || !assetRef.current) return;

    // P&L last 30 days
    const last30: { label: string; pnl: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().split('T')[0];
      const pnl = trades.filter(t => t.date?.startsWith(ds)).reduce((s, t) => s + (t.pnl ?? 0), 0);
      last30.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, pnl });
    }

    if (pnlChart.current) pnlChart.current.destroy();
    pnlChart.current = new Chart(pnlRef.current, {
      type: 'bar',
      data: {
        labels: last30.map(d => d.label),
        datasets: [{ data: last30.map(d => d.pnl), backgroundColor: last30.map(d => d.pnl >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'), borderRadius: 4, borderSkipped: false as const }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } } }, y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } } } } },
    });

    // Win rate by asset
    const assetMap: Record<string, { wins: number; total: number }> = {};
    trades.forEach(t => {
      if (!t.asset) return;
      if (!assetMap[t.asset]) assetMap[t.asset] = { wins: 0, total: 0 };
      assetMap[t.asset].total++;
      if (t.result === 'Win') assetMap[t.asset].wins++;
    });
    const assetData = Object.entries(assetMap).map(([a, d]) => ({ asset: a, wr: Math.round((d.wins / d.total) * 100) })).sort((a, b) => b.wr - a.wr).slice(0, 8);

    if (assetChart.current) assetChart.current.destroy();
    assetChart.current = new Chart(assetRef.current, {
      type: 'bar',
      data: {
        labels: assetData.map(a => a.asset),
        datasets: [{ data: assetData.map(a => a.wr), backgroundColor: 'rgba(99,102,241,0.7)', borderRadius: 4, borderSkipped: false as const }],
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } } }, y: { max: 100, grid: { color: gridColor }, ticks: { callback: (v) => v + '%', color: tickColor, font: { size: 10 } } } } },
    });

    return () => { pnlChart.current?.destroy(); assetChart.current?.destroy(); };
  }, [trades, theme]);

  const pnlCls = stats.totalPnl >= 0 ? 'green' : 'red';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <button className="btn btn-primary" onClick={onAddTrade}>➕ Log Trade</button>
      </div>

      <div className="stats-grid">
        {[
          { label: '📊 Total Trades', value: stats.total, sub: `${stats.wins}W / ${stats.losses}L / ${stats.be}BE`, icon: '📊', cls: '' },
          { label: '🎯 Win Rate', value: `${stats.winRate}%`, sub: null, icon: '🎯', cls: '', progress: stats.winRate },
          { label: '💵 Total P&L', value: fmtPnl(stats.totalPnl), sub: `Profit Factor: ${stats.profitFactor}`, icon: '💵', cls: pnlCls },
          { label: '⚖️ Avg R:R', value: stats.avgRR, sub: `Expectancy: ${stats.expectancy}`, icon: '⚖️', cls: '' },
          { label: '🔥 Best Streak', value: stats.bestStreak, sub: 'Consecutive wins', icon: '🏆', cls: 'green' },
          { label: '❄️ Worst Streak', value: stats.worstStreak, sub: 'Consecutive losses', icon: '💔', cls: 'red' },
          { label: '📅 This Week', value: fmtPnl(stats.weekPnl), sub: `${stats.weekTrades} trades`, icon: '📅', cls: stats.weekPnl >= 0 ? 'green' : 'red' },
          { label: '🗓 This Month', value: fmtPnl(stats.monthPnl), sub: `${stats.monthTrades} trades`, icon: '🗓', cls: stats.monthPnl >= 0 ? 'green' : 'red' },
        ].map(({ label, value, sub, icon, cls, progress }) => (
          <div className="stat-card" key={label}>
            <div className="stat-label">{label}</div>
            <div className={`stat-value${cls ? ' text-' + cls : ''}`}>{value}</div>
            {sub && <div className="stat-sub">{sub}</div>}
            {progress !== undefined && (
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%`, background: 'var(--green)' }} /></div>
            )}
            <div className="stat-icon">{icon}</div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-title">📈 P&L — Last 30 Days</div>
          <div className="chart-wrap"><canvas ref={pnlRef} /></div>
        </div>
        <div className="card">
          <div className="card-title">🎯 Win Rate by Asset</div>
          <div className="chart-wrap"><canvas ref={assetRef} /></div>
        </div>
      </div>

      <div className="card">
        <div className="flex-between mb-16">
          <div className="card-title" style={{ margin: 0 }}>🕐 Recent Trades</div>
        </div>
        {trades.length === 0 ? (
          <div className="empty-state" style={{ padding: 30 }}>
            <div className="empty-icon">📋</div>
            <h3>No trades yet</h3>
            <p>Tap "Log Trade" to add your first trade.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Asset</th><th>Dir</th><th>R:R</th><th>P&L</th><th>Result</th></tr></thead>
              <tbody>
                {trades.slice(0, 8).map(t => (
                  <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => t.id && onTradeClick(t.id)}>
                    <td className="td-mono">{fmtDate(t.date)}</td>
                    <td><strong>{t.asset || '—'}</strong></td>
                    <td><DirectionBadge direction={t.direction} /></td>
                    <td className="td-mono">{t.rr ?? '—'}</td>
                    <td className={`td-mono ${(t.pnl ?? 0) >= 0 ? 'text-green' : 'text-red'}`}>{fmtPnl(t.pnl)}</td>
                    <td><ResultBadge result={t.result} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
