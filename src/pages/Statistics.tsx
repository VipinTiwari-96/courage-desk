import { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { useStore } from '../store';
import { calcStats } from '../utils';

Chart.register(...registerables);

export function Statistics() {
  const { trades, theme } = useStore();
  const refs = {
    monthly: useRef<HTMLCanvasElement>(null),
    dist: useRef<HTMLCanvasElement>(null),
    setup: useRef<HTMLCanvasElement>(null),
    session: useRef<HTMLCanvasElement>(null),
    quality: useRef<HTMLCanvasElement>(null),
    rr: useRef<HTMLCanvasElement>(null),
  };
  const charts = useRef<Record<string, Chart>>({});

  const gridColor = theme === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)';
  const tickColor = theme === 'light' ? '#9090b0' : '#55556a';

  const opts = (maxY?: number) => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 } } },
      y: { ...(maxY ? { max: maxY } : {}), grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 10 }, ...(maxY ? { callback: (v: number | string) => v + '%' } : {}) } },
    },
  });

  useEffect(() => {
    if (!trades.length) return;
    Object.values(charts.current).forEach(c => c.destroy());
    charts.current = {};

    // Monthly P&L
    const monthMap: Record<string, number> = {};
    trades.forEach(t => {
      if (!t.date) return;
      const d = new Date(t.date);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap[k] = (monthMap[k] || 0) + (t.pnl ?? 0);
    });
    const monthEntries = Object.entries(monthMap).sort(([a], [b]) => a > b ? 1 : -1);
    if (refs.monthly.current) {
      charts.current.monthly = new Chart(refs.monthly.current, {
        type: 'bar',
        data: { labels: monthEntries.map(([k]) => k), datasets: [{ data: monthEntries.map(([, v]) => parseFloat(v.toFixed(2))), backgroundColor: monthEntries.map(([, v]) => v >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'), borderRadius: 4, borderSkipped: false as const }] },
        options: opts() as never,
      });
    }

    // Win/Loss/BE donut
    const stats = calcStats(trades);
    if (refs.dist.current) {
      charts.current.dist = new Chart(refs.dist.current, {
        type: 'doughnut',
        data: { labels: ['Wins', 'Losses', 'Breakeven'], datasets: [{ data: [stats.wins, stats.losses, stats.be], backgroundColor: ['rgba(34,197,94,0.8)', 'rgba(239,68,68,0.8)', 'rgba(234,179,8,0.8)'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: tickColor, font: { size: 12 } } } } },
      });
    }

    // Win rate by setup
    const winRateBy = (field: 'setup' | 'session') => {
      const map: Record<string, { wins: number; total: number }> = {};
      trades.forEach(t => {
        const v = t[field]; if (!v) return;
        if (!map[v]) map[v] = { wins: 0, total: 0 };
        map[v].total++;
        if (t.result === 'Win') map[v].wins++;
      });
      return Object.entries(map).map(([label, d]) => ({ label, wr: Math.round((d.wins / d.total) * 100) }));
    };

    if (refs.setup.current) {
      const d = winRateBy('setup');
      charts.current.setup = new Chart(refs.setup.current, { type: 'bar', data: { labels: d.map(x => x.label), datasets: [{ data: d.map(x => x.wr), backgroundColor: 'rgba(99,102,241,0.7)', borderRadius: 4, borderSkipped: false as const }] }, options: opts(100) as never });
    }
    if (refs.session.current) {
      const d = winRateBy('session');
      charts.current.session = new Chart(refs.session.current, { type: 'bar', data: { labels: d.map(x => x.label), datasets: [{ data: d.map(x => x.wr), backgroundColor: 'rgba(168,85,247,0.7)', borderRadius: 4, borderSkipped: false as const }] }, options: opts(100) as never });
    }

    // Quality P&L
    const qualMap: Record<string, number> = { 'A+': 0, A: 0, B: 0, C: 0 };
    trades.forEach(t => { if (t.quality && qualMap[t.quality] !== undefined) qualMap[t.quality] += (t.pnl ?? 0); });
    if (refs.quality.current) {
      const entries = Object.entries(qualMap);
      charts.current.quality = new Chart(refs.quality.current, { type: 'bar', data: { labels: entries.map(([k]) => k), datasets: [{ data: entries.map(([, v]) => parseFloat(v.toFixed(2))), backgroundColor: entries.map(([, v]) => v >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'), borderRadius: 4, borderSkipped: false as const }] }, options: opts() as never });
    }

    // R:R histogram
    const rrBuckets: Record<string, number> = { '0-1': 0, '1-2': 0, '2-3': 0, '3-4': 0, '4+': 0 };
    trades.forEach(t => {
      const r = t.rr ?? 0;
      if (r < 1) rrBuckets['0-1']++;
      else if (r < 2) rrBuckets['1-2']++;
      else if (r < 3) rrBuckets['2-3']++;
      else if (r < 4) rrBuckets['3-4']++;
      else rrBuckets['4+']++;
    });
    if (refs.rr.current) {
      charts.current.rr = new Chart(refs.rr.current, { type: 'bar', data: { labels: Object.keys(rrBuckets), datasets: [{ data: Object.values(rrBuckets), backgroundColor: 'rgba(59,130,246,0.7)', borderRadius: 4, borderSkipped: false as const }] }, options: opts() as never });
    }

    return () => Object.values(charts.current).forEach(c => c.destroy());
  }, [trades, theme]);

  if (!trades.length) {
    return (
      <div className="page">
        <div className="page-header"><div className="page-title">Statistics</div></div>
        <div className="empty-state"><div className="empty-icon">📉</div><h3>No data yet</h3><p>Log some trades to see statistics.</p></div>
      </div>
    );
  }

  const stats = calcStats(trades);

  return (
    <div className="page">
      <div className="page-header"><div className="page-title">Statistics</div></div>

      <div className="stats-grid">
        {[
          { label: 'Total Trades', value: stats.total },
          { label: 'Win Rate', value: `${stats.winRate}%`, cls: stats.winRate >= 50 ? 'text-green' : 'text-red' },
          { label: 'Profit Factor', value: stats.profitFactor, cls: parseFloat(stats.profitFactor) >= 1 ? 'text-green' : 'text-red' },
          { label: 'Expectancy', value: `${parseFloat(stats.expectancy) >= 0 ? '+' : ''}$${stats.expectancy}`, cls: parseFloat(stats.expectancy) >= 0 ? 'text-green' : 'text-red' },
          { label: 'Avg Win', value: `+$${stats.avgWin}`, cls: 'text-green' },
          { label: 'Avg Loss', value: `-$${stats.avgLoss}`, cls: 'text-red' },
          { label: 'Max Drawdown', value: `$${stats.maxDD}`, cls: 'text-red' },
          { label: 'Avg R:R', value: stats.avgRR },
        ].map(({ label, value, cls }) => (
          <div className="stat-card" key={label}>
            <div className="stat-label">{label}</div>
            <div className={`stat-value${cls ? ' ' + cls : ''}`}>{value}</div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="card"><div className="card-title">📊 Monthly P&L</div><div className="chart-wrap"><canvas ref={refs.monthly} /></div></div>
        <div className="card"><div className="card-title">🍩 Win / Loss / BE</div><div className="chart-wrap"><canvas ref={refs.dist} /></div></div>
        <div className="card"><div className="card-title">🎯 Win Rate by Setup</div><div className="chart-wrap"><canvas ref={refs.setup} /></div></div>
        <div className="card"><div className="card-title">⏰ Win Rate by Session</div><div className="chart-wrap"><canvas ref={refs.session} /></div></div>
        <div className="card"><div className="card-title">⭐ P&L by Trade Quality</div><div className="chart-wrap"><canvas ref={refs.quality} /></div></div>
        <div className="card"><div className="card-title">📈 R:R Distribution</div><div className="chart-wrap"><canvas ref={refs.rr} /></div></div>
      </div>
    </div>
  );
}
