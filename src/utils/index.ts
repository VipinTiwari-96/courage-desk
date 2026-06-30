import type { Trade } from '../types';

export function fmtDate(d?: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export function fmtDateFull(d?: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function fmtPnl(pnl?: number | null): string {
  if (pnl == null) return '—';
  return (pnl >= 0 ? '+' : '') + '$' + Math.abs(pnl).toFixed(2);
}

export function pnlColor(pnl?: number | null): string {
  if (pnl == null) return '';
  return pnl >= 0 ? 'text-green' : 'text-red';
}

export interface TradeStats {
  total: number;
  wins: number;
  losses: number;
  be: number;
  winRate: number;
  totalPnl: number;
  avgRR: string;
  profitFactor: string;
  expectancy: string;
  bestStreak: number;
  worstStreak: number;
  weekPnl: number;
  monthPnl: number;
  weekTrades: number;
  monthTrades: number;
  avgWin: string;
  avgLoss: string;
  maxDD: string;
  grossWin: number;
  grossLoss: number;
}

export function calcStats(trades: Trade[]): TradeStats {
  const total = trades.length;
  const wins = trades.filter(t => t.result === 'Win').length;
  const losses = trades.filter(t => t.result === 'Loss').length;
  const be = trades.filter(t => t.result === 'Breakeven').length;
  const winRate = total ? Math.round((wins / total) * 100) : 0;
  const totalPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const avgRR = total ? (trades.reduce((s, t) => s + (t.rr ?? 0), 0) / total).toFixed(2) : '0.00';
  const grossWin = trades.filter(t => t.result === 'Win').reduce((s, t) => s + (t.pnl ?? 0), 0);
  const grossLoss = Math.abs(trades.filter(t => t.result === 'Loss').reduce((s, t) => s + (t.pnl ?? 0), 0));
  const profitFactor = grossLoss > 0 ? (grossWin / grossLoss).toFixed(2) : grossWin > 0 ? '∞' : '0.00';

  const avgWinNum = wins ? grossWin / wins : 0;
  const avgLossNum = losses ? grossLoss / losses : 0;
  const wr = total ? wins / total : 0;
  const expectancy = total ? ((wr * avgWinNum) - ((1 - wr) * avgLossNum)).toFixed(2) : '0.00';

  let curStreak = 0, bestStreak = 0, worstStreak = 0, curLoss = 0;
  [...trades].reverse().forEach(t => {
    if (t.result === 'Win') { curStreak++; curLoss = 0; bestStreak = Math.max(bestStreak, curStreak); }
    else if (t.result === 'Loss') { curLoss++; curStreak = 0; worstStreak = Math.max(worstStreak, curLoss); }
    else { curStreak = 0; curLoss = 0; }
  });

  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekTs = trades.filter(t => t.date && new Date(t.date) >= weekStart);
  const monthTs = trades.filter(t => t.date && new Date(t.date) >= monthStart);

  let peak = 0, maxDD = 0, running = 0;
  [...trades].reverse().forEach(t => {
    running += (t.pnl ?? 0);
    peak = Math.max(peak, running);
    maxDD = Math.max(maxDD, peak - running);
  });

  return {
    total, wins, losses, be, winRate, totalPnl, avgRR, profitFactor, expectancy,
    bestStreak, worstStreak,
    weekPnl: weekTs.reduce((s, t) => s + (t.pnl ?? 0), 0),
    monthPnl: monthTs.reduce((s, t) => s + (t.pnl ?? 0), 0),
    weekTrades: weekTs.length,
    monthTrades: monthTs.length,
    avgWin: avgWinNum.toFixed(2),
    avgLoss: avgLossNum.toFixed(2),
    maxDD: maxDD.toFixed(2),
    grossWin, grossLoss,
  };
}

export function padDate(n: number): string {
  return String(n).padStart(2, '0');
}

export function nowDatetimeLocal(): string {
  const now = new Date();
  return `${now.getFullYear()}-${padDate(now.getMonth() + 1)}-${padDate(now.getDate())}T${padDate(now.getHours())}:${padDate(now.getMinutes())}`;
}
