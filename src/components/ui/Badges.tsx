import type { TradeResult, TradeDirection, TradeQuality } from '../../types';

export function ResultBadge({ result }: { result?: TradeResult }) {
  if (!result) return <span>—</span>;
  const map: Record<TradeResult, { cls: string; label: string }> = {
    Win:       { cls: 'badge-win',  label: '✔ Win' },
    Loss:      { cls: 'badge-loss', label: '✖ Loss' },
    Breakeven: { cls: 'badge-be',   label: '⟺ BE' },
  };
  const { cls, label } = map[result];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function DirectionBadge({ direction }: { direction?: TradeDirection }) {
  if (!direction) return <span>—</span>;
  const cls = direction === 'Buy' ? 'badge-buy' : 'badge-sell';
  const label = direction === 'Buy' ? '▲ Buy' : '▼ Sell';
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function QualityBadge({ quality }: { quality?: TradeQuality }) {
  if (!quality) return <span className="text-muted">—</span>;
  const cls = quality === 'A+' ? 'badge-aplus' : quality === 'A' ? 'badge-a' : quality === 'B' ? 'badge-b' : 'badge-c';
  return <span className={`badge ${cls}`}>{quality}</span>;
}

export function PlanBadge({ planFollowed, hasRules }: { planFollowed?: boolean; hasRules?: boolean }) {
  if (!hasRules) return <span className="text-muted">—</span>;
  return planFollowed
    ? <span className="text-green" style={{ fontSize: 13 }}>✓</span>
    : <span className="text-red" style={{ fontSize: 13 }}>✕</span>;
}
