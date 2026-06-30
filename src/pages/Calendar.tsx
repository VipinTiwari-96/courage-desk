import { useState } from 'react';
import { useStore } from '../store';
import type { Trade } from '../types';
import { fmtPnl } from '../utils';
import { ResultBadge, DirectionBadge } from '../components/ui/Badges';

interface DayData { trades: Trade[]; pnl: number; wins: number; losses: number; be: number; }

interface Props { onTradeClick: (id: number) => void; }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function Calendar({ onTradeClick }: Props) {
  const { trades } = useStore();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [dayDetail, setDayDetail] = useState<{ key: string; data: DayData } | null>(null);

  const pad = (n: number) => String(n).padStart(2, '0');

  // Build byDay map
  const byDay: Record<string, DayData> = {};
  trades.forEach(t => {
    if (!t.date) return;
    const ds = t.date.split('T')[0];
    const [y, m] = ds.split('-').map(Number);
    if (y === year && m === month + 1) {
      if (!byDay[ds]) byDay[ds] = { trades: [], pnl: 0, wins: 0, losses: 0, be: 0 };
      byDay[ds].trades.push(t);
      byDay[ds].pnl += t.pnl ?? 0;
      if (t.result === 'Win') byDay[ds].wins++;
      else if (t.result === 'Loss') byDay[ds].losses++;
      else byDay[ds].be++;
    }
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthTrades = Object.values(byDay).flatMap(d => d.trades);
  const monthPnl = monthTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const monthWins = monthTrades.filter(t => t.result === 'Win').length;
  const monthWR = monthTrades.length ? Math.round((monthWins / monthTrades.length) * 100) : 0;

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  // Weekly breakdown
  const weeks: { start: Date; end: Date }[] = [];
  const weekStart = new Date(year, month, 1);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  for (let w = 0; w < 6; w++) {
    const ws = new Date(weekStart); ws.setDate(weekStart.getDate() + w * 7);
    const we = new Date(ws); we.setDate(ws.getDate() + 6);
    if (ws.getMonth() > month && ws.getFullYear() >= year) break;
    weeks.push({ start: ws, end: we });
  }

  const weekStats = weeks.map(wk => {
    let pnl = 0, total = 0, wins = 0;
    for (let d = new Date(wk.start); d <= wk.end; d.setDate(d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      if (byDay[key]) { pnl += byDay[key].pnl; total += byDay[key].trades.length; wins += byDay[key].wins; }
    }
    return { pnl, total, wins, wr: total ? Math.round((wins / total) * 100) : 0, label: `${wk.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}–${wk.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` };
  }).filter(w => w.total > 0);

  const maxAbsPnl = Math.max(...weekStats.map(w => Math.abs(w.pnl)), 1);

  return (
    <div className="page">
      <div className="page-header">
        <div><div className="page-title">Calendar</div><div className="page-subtitle">Review performance by day</div></div>
        <div className="flex gap-8">
          <button className="btn btn-ghost btn-sm" onClick={prev}>◀</button>
          <span style={{ fontWeight: 600, fontSize: 15, padding: '0 8px', display: 'flex', alignItems: 'center' }}>{MONTHS[month]} {year}</span>
          <button className="btn btn-ghost btn-sm" onClick={next}>▶</button>
        </div>
      </div>

      {/* Monthly summary */}
      <div className="cal-summary-grid">
        {[
          { label: 'Month P&L', value: fmtPnl(monthPnl), color: monthPnl >= 0 ? 'var(--green)' : 'var(--red)', sub: `${MONTHS[month]} ${year}` },
          { label: 'Total Trades', value: String(monthTrades.length), sub: `${monthWins}W / ${monthTrades.filter(t=>t.result==='Loss').length}L` },
          { label: 'Win Rate', value: `${monthWR}%`, color: monthWR >= 50 ? 'var(--green)' : 'var(--red)', sub: 'This month' },
          { label: 'Trading Days', value: String(Object.keys(byDay).length), sub: 'Active days' },
        ].map(({ label, value, color, sub }) => (
          <div className="cal-summary-card" key={label}>
            <div className="cal-summary-label">{label}</div>
            <div className="cal-summary-value" style={color ? { color } : {}}>{value}</div>
            {sub && <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
          </div>
        ))}
      </div>

      {/* Day headers */}
      <div className="cal-header-row">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="cal-day-name">{d}</div>)}
      </div>

      {/* Grid */}
      <div className="cal-grid">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} className="cal-cell empty" />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const key = `${year}-${pad(month + 1)}-${pad(day)}`;
          const data = byDay[key];
          if (data) {
            const cls = data.pnl > 0 ? 'positive' : data.pnl < 0 ? 'negative' : 'neutral';
            const pnlColor = data.pnl >= 0 ? 'var(--green)' : 'var(--red)';
            const wr = Math.round((data.wins / data.trades.length) * 100);
            const MAX_DOTS = 10;
            return (
              <div key={key} className={`cal-cell has-trades ${cls}`} onClick={() => setDayDetail({ key, data })}>
                <div className="cal-date">{day}</div>
                <div className="cal-pnl" style={{ color: pnlColor }}>{data.pnl >= 0 ? '+' : ''}${data.pnl.toFixed(0)}</div>
                <div className="cal-meta">{wr}% WR</div>
                <div className="cal-dots">
                  {data.trades.slice(0, MAX_DOTS).map((t, idx) => (
                    <span key={idx} className={`cal-dot ${t.result === 'Win' ? 'win' : t.result === 'Loss' ? 'loss' : 'be'}`} title={`${t.asset} ${t.result}`} />
                  ))}
                  {data.trades.length > MAX_DOTS && <span style={{ fontSize: 9, color: 'var(--text-muted)', alignSelf: 'center' }}>+{data.trades.length - MAX_DOTS}</span>}
                </div>
              </div>
            );
          }
          return <div key={key} className="cal-cell"><div className="cal-date" style={{ color: 'var(--text-muted)' }}>{day}</div></div>;
        })}
      </div>

      {/* Weekly breakdown */}
      {weekStats.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div className="cal-summary-label" style={{ marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.8px', fontSize: 12, fontWeight: 600 }}>📅 Weekly Breakdown</div>
          {weekStats.map((w, i) => (
            <div className="cal-week-row" key={i}>
              <span className="cal-week-label">Wk {i + 1} · {w.label}</span>
              <span className="cal-week-pnl" style={{ color: w.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{w.pnl >= 0 ? '+' : ''}${w.pnl.toFixed(0)}</span>
              <div className="cal-week-bar-wrap">
                <div className="cal-week-bar" style={{ width: `${Math.round((Math.abs(w.pnl) / maxAbsPnl) * 100)}%`, background: w.pnl >= 0 ? 'var(--green)' : 'var(--red)' }} />
              </div>
              <span className="cal-week-meta">{w.total}T · {w.wr}% WR</span>
            </div>
          ))}
        </div>
      )}

      {/* Day detail overlay */}
      {dayDetail && (
        <div className="modal-overlay" onClick={() => setDayDetail(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{dayDetail.key}</div>
              <button className="close-btn" onClick={() => setDayDetail(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 16, padding: 14, background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                  <span className="font-mono">{dayDetail.data.trades.length} trades</span>
                  <span>·</span>
                  <span className={`font-mono ${dayDetail.data.pnl >= 0 ? 'text-green' : 'text-red'}`}>{fmtPnl(dayDetail.data.pnl)}</span>
                  <span>·</span>
                  <span>WR: {Math.round((dayDetail.data.wins / dayDetail.data.trades.length) * 100)}%</span>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Asset</th><th>Dir</th><th>Setup</th><th>R:R</th><th>P&L</th><th>Result</th></tr></thead>
                  <tbody>
                    {dayDetail.data.trades.map(t => (
                      <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => { setDayDetail(null); t.id && onTradeClick(t.id); }}>
                        <td><strong>{t.asset || '—'}</strong></td>
                        <td><DirectionBadge direction={t.direction} /></td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.setup || '—'}</td>
                        <td className="td-mono">{t.rr ?? '—'}</td>
                        <td className={`td-mono ${(t.pnl ?? 0) >= 0 ? 'text-green' : 'text-red'}`}>{fmtPnl(t.pnl)}</td>
                        <td><ResultBadge result={t.result} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
