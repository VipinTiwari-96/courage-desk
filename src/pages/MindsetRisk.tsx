import { useState, useEffect, useCallback } from 'react';
import { SettingsRepo } from '../db';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RiskTier {
  id: string;
  quality: 'A+' | 'A' | 'B';
  minRisk: number;
  maxRisk: number;
}

interface TakeProfit {
  id: string;
  label: string;   // e.g. "Minimum move"
  ratios: string;  // e.g. "1.2 / 1.5 / 2 / 3"
}

interface DayRule {
  id: string;
  maxTrades: number | null;
  maxLoss: number | null;
  note: string;
}

interface MindsetRule {
  id: string;
  text: string;
  category: 'market' | 'psychology' | 'skip';
}

interface MindsetData {
  mindsetRules: MindsetRule[];
  riskTiers: RiskTier[];
  takeProfits: TakeProfit[];
  dayRules: DayRule[];
  generalNotes: string;
}

const DEFAULT_DATA: MindsetData = {
  mindsetRules: [
    { id: 'm1', text: 'Read Market Structure', category: 'market' },
    { id: 'm2', text: 'Identify Trend', category: 'market' },
    { id: 'm3', text: 'Set Bias (HTF + Intraday)', category: 'market' },
    { id: 'm4', text: 'Locate POI (Order Block / FVG)', category: 'market' },
    { id: 'm5', text: 'Wait for confirmation before entry', category: 'psychology' },
    { id: 'm6', text: 'Be calm and focused — no FOMO', category: 'psychology' },
    { id: 'm7', text: 'Skip if busy, confused, or not calm', category: 'skip' },
    { id: 'm8', text: 'Skip if no clear setup is present', category: 'skip' },
  ],
  riskTiers: [
    { id: 'r1', quality: 'A+', minRisk: 28, maxRisk: 35 },
    { id: 'r2', quality: 'A',  minRisk: 15, maxRisk: 20 },
    { id: 'r3', quality: 'B',  minRisk: 0,  maxRisk: 0  },
  ],
  takeProfits: [
    { id: 'tp1', label: 'Least possible move', ratios: '1.2 / 1.5 / 2 / 3' },
  ],
  dayRules: [
    { id: 'd1', maxTrades: 4, maxLoss: 90, note: 'Stop trading if either limit is hit' },
  ],
  generalNotes: 'When busy doing something, or the mindset is not clear, confused, or not calm — skip trading for the day. Protect the account. There is always another setup tomorrow.',
};

function uid() { return Math.random().toString(36).slice(2, 9); }

// ─── Category config ──────────────────────────────────────────────────────────

const CAT_CONFIG = {
  market:     { label: 'Market Analysis',   color: 'var(--accent)',  bg: 'var(--accent-glow)',                         icon: '📊' },
  psychology: { label: 'Trading Psychology', color: 'var(--green)',  bg: 'rgba(34,197,94,0.08)',                       icon: '🧠' },
  skip:       { label: 'Skip Conditions',   color: 'var(--red)',    bg: 'rgba(239,68,68,0.07)',                        icon: '🚫' },
};

const QUALITY_CONFIG = {
  'A+': { color: '#bbf7d0', bg: 'rgba(22,101,52,0.85)', border: 'rgba(34,197,94,0.4)' },
  'A':  { color: '#4ade80', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.25)' },
  'B':  { color: 'var(--yellow)', bg: 'var(--yellow-bg)', border: 'rgba(234,179,8,0.25)' },
};

// ─── Small reusable inline editor ────────────────────────────────────────────

function InlineEdit({ value, onSave, placeholder, multiline = false }: {
  value: string; onSave: (v: string) => void; placeholder?: string; multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => { onSave(draft.trim() || value); setEditing(false); };

  if (!editing) return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Click to edit"
      style={{ cursor: 'text', borderBottom: '1px dashed var(--border-light)', paddingBottom: 1 }}
    >{value || <span style={{ color: 'var(--text-muted)' }}>{placeholder}</span>}</span>
  );

  return multiline ? (
    <textarea
      autoFocus
      className="form-control"
      value={draft}
      style={{ minHeight: 70, fontSize: 'inherit' }}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }}
    />
  ) : (
    <input
      autoFocus
      className="form-control"
      value={draft}
      style={{ fontSize: 'inherit', padding: '3px 8px', height: 'auto' }}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
    />
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface Props {
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function MindsetRisk({ onToast }: Props) {
  const [data, setData] = useState<MindsetData>(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);
  const [addRuleModal, setAddRuleModal] = useState<{ open: boolean; category: MindsetRule['category'] }>({ open: false, category: 'market' });
  const [newRuleText, setNewRuleText] = useState('');

  // Load from IndexedDB
  useEffect(() => {
    SettingsRepo.get('mindsetData').then(saved => {
      if (saved) setData(saved as MindsetData);
      setLoaded(true);
    });
  }, []);

  // Auto-save on every change
  const save = useCallback(async (next: MindsetData) => {
    setData(next);
    await SettingsRepo.set('mindsetData', next);
    onToast('Saved ✓', 'success');
  }, [onToast]);

  if (!loaded) return <div className="page"><div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div></div>;

  // ── Mindset rules ──────────────────────────────────────────────────────────
  const updateRule = (id: string, text: string) =>
    save({ ...data, mindsetRules: data.mindsetRules.map(r => r.id === id ? { ...r, text } : r) });

  const deleteRule = (id: string) =>
    save({ ...data, mindsetRules: data.mindsetRules.filter(r => r.id !== id) });

  const addRule = () => {
    if (!newRuleText.trim()) return;
    save({ ...data, mindsetRules: [...data.mindsetRules, { id: uid(), text: newRuleText.trim(), category: addRuleModal.category }] });
    setNewRuleText('');
    setAddRuleModal({ open: false, category: 'market' });
  };

  // ── Risk tiers ─────────────────────────────────────────────────────────────
  const updateTier = (id: string, field: keyof RiskTier, val: string | number) =>
    save({ ...data, riskTiers: data.riskTiers.map(r => r.id === id ? { ...r, [field]: val } : r) });

  // ── Take profit ────────────────────────────────────────────────────────────
  const updateTP = (id: string, field: keyof TakeProfit, val: string) =>
    save({ ...data, takeProfits: data.takeProfits.map(t => t.id === id ? { ...t, [field]: val } : t) });

  const addTP = () =>
    save({ ...data, takeProfits: [...data.takeProfits, { id: uid(), label: 'New target', ratios: '1:2' }] });

  const deleteTP = (id: string) =>
    save({ ...data, takeProfits: data.takeProfits.filter(t => t.id !== id) });

  // ── Day rules ──────────────────────────────────────────────────────────────
  const updateDay = (id: string, field: keyof DayRule, val: string | number | null) =>
    save({ ...data, dayRules: data.dayRules.map(d => d.id === id ? { ...d, [field]: val } : d) });

  const addDayRule = () =>
    save({ ...data, dayRules: [...data.dayRules, { id: uid(), maxTrades: null, maxLoss: null, note: '' }] });

  const deleteDayRule = (id: string) =>
    save({ ...data, dayRules: data.dayRules.filter(d => d.id !== id) });

  const categories: MindsetRule['category'][] = ['market', 'psychology', 'skip'];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">🧘 Mindset & Risk</div>
          <div className="page-subtitle">Your personal trading constitution — read this before every session</div>
        </div>
      </div>

      {/* ── Pre-trade checklist ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {categories.map(cat => {
          const cfg = CAT_CONFIG[cat];
          const rules = data.mindsetRules.filter(r => r.category === cat);
          return (
            <div key={cat} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18, borderTop: `3px solid ${cfg.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: cfg.color }}>{cfg.label}</span>
                </div>
                <button
                  onClick={() => setAddRuleModal({ open: true, category: cat })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)', lineHeight: 1, padding: '2px 4px', borderRadius: 4 }}
                  title="Add rule"
                  onMouseEnter={e => (e.currentTarget.style.color = cfg.color)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >＋</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rules.map((r, i) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: cfg.bg, borderRadius: 'var(--radius-sm)', border: `1px solid ${cfg.color}22` }}>
                    <span style={{ fontSize: 11, color: cfg.color, fontWeight: 700, minWidth: 18, marginTop: 1 }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                      <InlineEdit value={r.text} onSave={v => updateRule(r.id, v)} placeholder="Enter rule…" />
                    </span>
                    <button
                      onClick={() => deleteRule(r.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', padding: '2px 4px', borderRadius: 3, lineHeight: 1, flexShrink: 0 }}
                      title="Remove"
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >✕</button>
                  </div>
                ))}
                {rules.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>No rules yet — click ＋ to add</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* ── Risk per trade ───────────────────────────────────────────────── */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 3 }}>💰 Risk Per Trade</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Amount to risk based on setup quality</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.riskTiers.map(tier => {
              const qcfg = QUALITY_CONFIG[tier.quality];
              return (
                <div key={tier.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, background: qcfg.bg, color: qcfg.color, border: `1px solid ${qcfg.border}`, minWidth: 34, textAlign: 'center' }}>
                    {tier.quality}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12, flex: 1 }}>Risk / trade</span>
                  {tier.quality === 'B' ? (
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>— skip or minimal</span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>$</span>
                      <input
                        type="number"
                        value={tier.minRisk || ''}
                        onChange={e => updateTier(tier.id, 'minRisk', parseFloat(e.target.value) || 0)}
                        style={{ width: 52, padding: '4px 6px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-mono)', textAlign: 'center' }}
                      />
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>–</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>$</span>
                      <input
                        type="number"
                        value={tier.maxRisk || ''}
                        onChange={e => updateTier(tier.id, 'maxRisk', parseFloat(e.target.value) || 0)}
                        style={{ width: 52, padding: '4px 6px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-mono)', textAlign: 'center' }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Daily limits ─────────────────────────────────────────────────── */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 3 }}>🛑 Max Risk / Day</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Stop trading when either limit is hit</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={addDayRule} style={{ fontSize: 11.5 }}>+ Add</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.dayRules.map(rule => (
              <div key={rule.id} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
                <div style={{ display: 'flex', gap: 16, marginBottom: rule.note ? 10 : 0, alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Max trades */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 18 }}>🔢</span>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Max Trades</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <input
                          type="number"
                          value={rule.maxTrades ?? ''}
                          placeholder="—"
                          onChange={e => updateDay(rule.id, 'maxTrades', e.target.value ? parseInt(e.target.value) : null)}
                          style={{ width: 50, padding: '3px 6px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 700, textAlign: 'center' }}
                        />
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>trades</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 18, color: 'var(--text-muted)', alignSelf: 'flex-end', paddingBottom: 4 }}>or</div>

                  {/* Max loss */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 18 }}>💸</span>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Max Loss</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>-$</span>
                        <input
                          type="number"
                          value={rule.maxLoss ?? ''}
                          placeholder="—"
                          onChange={e => updateDay(rule.id, 'maxLoss', e.target.value ? parseFloat(e.target.value) : null)}
                          style={{ width: 60, padding: '3px 6px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--red)', fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 700, textAlign: 'center' }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteDayRule(rule.id)}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', padding: '3px 6px', borderRadius: 4 }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >✕</button>
                </div>
                {/* Optional note */}
                <div style={{ fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 2 }}>
                  <InlineEdit value={rule.note} onSave={v => updateDay(rule.id, 'note', v)} placeholder="Add a note…" />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Take profit targets ──────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 3 }}>🎯 Take Profit Targets</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>R:R levels you aim for on each trade type</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={addTP} style={{ fontSize: 11.5 }}>+ Add</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {data.takeProfits.map(tp => (
            <div key={tp.id} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <InlineEdit value={tp.label} onSave={v => updateTP(tp.id, 'label', v)} placeholder="Target name…" />
                </span>
                <button
                  onClick={() => deleteTP(tp.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', padding: '2px 5px', borderRadius: 4 }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >✕</button>
              </div>
              {/* Ratio chips */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {tp.ratios.split('/').map(r => r.trim()).filter(Boolean).map((ratio, i) => (
                  <span key={i} style={{ padding: '3px 10px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, fontSize: 12.5, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>
                    1:{ratio}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--text-muted)' }}>
                R:R ratios: <InlineEdit value={tp.ratios} onSave={v => updateTP(tp.id, 'ratios', v)} placeholder="e.g. 1.2 / 1.5 / 2 / 3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── General notes / mantra ───────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18, borderLeft: '3px solid var(--accent)' }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 12 }}>
          📌 Trading Mantra & General Notes
        </div>
        <textarea
          className="form-control"
          rows={4}
          value={data.generalNotes}
          onChange={e => setData(d => ({ ...d, generalNotes: e.target.value }))}
          onBlur={() => save({ ...data, generalNotes: data.generalNotes })}
          placeholder="Write your personal trading mantra, reminders, or anything you want to read every session…"
          style={{ fontSize: 13.5, lineHeight: 1.7, resize: 'vertical' }}
        />
      </div>

      {/* ── Add rule modal ────────────────────────────────────────────────────── */}
      {addRuleModal.open && (
        <div className="modal-overlay" onClick={() => setAddRuleModal({ open: false, category: 'market' })}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                {CAT_CONFIG[addRuleModal.category].icon} Add {CAT_CONFIG[addRuleModal.category].label} Rule
              </div>
              <button className="close-btn" onClick={() => setAddRuleModal({ open: false, category: 'market' })}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Rule</label>
                <input
                  autoFocus
                  className="form-control"
                  value={newRuleText}
                  onChange={e => setNewRuleText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addRule(); if (e.key === 'Escape') setAddRuleModal({ open: false, category: 'market' }); }}
                  placeholder="e.g. Confirm BOS before entry"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setAddRuleModal({ open: false, category: 'market' })}>Cancel</button>
              <button className="btn btn-primary" onClick={addRule}>Add Rule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
