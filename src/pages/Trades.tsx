import { useState, useMemo } from 'react';
import { useStore } from '../store';
import type { Trade } from '../types';
import { fmtDate, fmtPnl } from '../utils';
import { ResultBadge, DirectionBadge, QualityBadge, PlanBadge } from '../components/ui/Badges';

interface Props { onTradeClick: (id: number) => void; onAddTrade: () => void; onEditTrade: (id: number) => void; }

export function Trades({ onTradeClick, onAddTrade, onEditTrade }: Props) {
  const { trades, settings } = useStore();
  const [search, setSearch] = useState('');
  const [filterAsset, setFilterAsset] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [filterDir, setFilterDir] = useState('');
  const [filterQuality, setFilterQuality] = useState('');
  const [sortField, setSortField] = useState<keyof Trade>('date');
  const [sortDir, setSortDir] = useState<1 | -1>(1);

  const toggleSort = (field: keyof Trade) => {
    if (sortField === field) setSortDir(d => (d === 1 ? -1 : 1));
    else { setSortField(field); setSortDir(1); }
  };

  const filtered = useMemo(() => {
    let result = trades.filter(t => {
      const q = search.toLowerCase();
      if (q && !JSON.stringify(t).toLowerCase().includes(q)) return false;
      if (filterAsset && t.asset !== filterAsset) return false;
      if (filterResult && t.result !== filterResult) return false;
      if (filterDir && t.direction !== filterDir) return false;
      if (filterQuality && t.quality !== filterQuality) return false;
      return true;
    });
    result = [...result].sort((a, b) => {
      let av: string | number = (a[sortField] as string | number) || '';
      let bv: string | number = (b[sortField] as string | number) || '';
      if (sortField === 'pnl' || sortField === 'rr') { av = Number(av) || 0; bv = Number(bv) || 0; }
      return av > bv ? sortDir : av < bv ? -sortDir : 0;
    });
    return result;
  }, [trades, search, filterAsset, filterResult, filterDir, filterQuality, sortField, sortDir]);

  const Th = ({ field, children }: { field: keyof Trade; children: React.ReactNode }) => (
    <th onClick={() => toggleSort(field)}>
      {children} {sortField === field ? (sortDir === 1 ? '↑' : '↓') : '⇅'}
    </th>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Trades</div>
          <div className="page-subtitle">{filtered.length} of {trades.length} trades</div>
        </div>
        <button className="btn btn-primary" onClick={onAddTrade}>➕ Log Trade</button>
      </div>

      <div className="search-bar">
        <div className="search-input-wrap">
          <span className="search-icon">🔍</span>
          <input className="form-control" placeholder="Search trades..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-control" style={{ width: 140 }} value={filterAsset} onChange={e => setFilterAsset(e.target.value)}>
          <option value="">All Assets</option>
          {settings.assets.map(a => <option key={a}>{a}</option>)}
        </select>
        <select className="form-control" style={{ width: 120 }} value={filterResult} onChange={e => setFilterResult(e.target.value)}>
          <option value="">All Results</option>
          <option>Win</option><option>Loss</option><option>Breakeven</option>
        </select>
        <select className="form-control" style={{ width: 120 }} value={filterDir} onChange={e => setFilterDir(e.target.value)}>
          <option value="">All Directions</option>
          <option>Buy</option><option>Sell</option>
        </select>
        <select className="form-control" style={{ width: 120 }} value={filterQuality} onChange={e => setFilterQuality(e.target.value)}>
          <option value="">All Quality</option>
          <option>A+</option><option>A</option><option>B</option><option>C</option>
        </select>
        <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterAsset(''); setFilterResult(''); setFilterDir(''); setFilterQuality(''); }}>✕ Clear</button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No trades found</h3>
          <p>Try adjusting your filters or log a new trade.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <Th field="date">Date</Th>
                  <Th field="asset">Asset</Th>
                  <th>Dir</th>
                  <th>Quality</th>
                  <Th field="setup">Setup</Th>
                  <th>Session</th>
                  <Th field="rr">R:R</Th>
                  <Th field="pnl">P&L</Th>
                  <th>Result</th>
                  <th>Plan</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} style={{ cursor: 'pointer' }} onClick={() => t.id && onTradeClick(t.id)}>
                    <td className="td-mono">{fmtDate(t.date)}</td>
                    <td><strong>{t.asset || '—'}</strong></td>
                    <td><DirectionBadge direction={t.direction} /></td>
                    <td><QualityBadge quality={t.quality} /></td>
                    <td style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{t.setup || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.session || '—'}</td>
                    <td className="td-mono">{t.rr ?? '—'}</td>
                    <td className={`td-mono ${(t.pnl ?? 0) >= 0 ? 'text-green' : 'text-red'}`}>{fmtPnl(t.pnl)}</td>
                    <td><ResultBadge result={t.result} /></td>
                    <td><PlanBadge planFollowed={t.planFollowed} hasRules={!!(t.rules?.length)} /></td>
                    <td>
                      <button className="btn-icon btn-sm" onClick={e => { e.stopPropagation(); t.id && onEditTrade(t.id); }}>✏️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
