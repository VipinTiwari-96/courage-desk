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
  label: string;
  ratios: string;
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
  generalNotes:
    'When busy doing something, or the mindset is not clear, confused, or not calm — skip trading for the day. Protect the account. There is always another setup tomorrow.',
};

function uid() { return Math.random().toString(36).slice(2, 9); }

const CAT_CONFIG = {
  market:     { label: 'Market Analysis',    color: 'var(--accent)', bg: 'var(--accent-glow)',       icon: '📊' },
  psychology: { label: 'Trading Psychology', color: 'var(--green)',  bg: 'rgba(34,197,94,0.08)',     icon: '🧠' },
  skip:       { label: 'Skip Conditions',    color: 'var(--red)',    bg: 'rgba(239,68,68,0.07)',     icon: '🚫' },
};

const QUALITY_CONFIG = {
  'A+': { color: '#bbf7d0', bg: 'rgba(22,101,52,0.85)', border: 'rgba(34,197,94,0.4)' },
  'A':  { color: '#4ade80', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.25)' },
  'B':  { color: 'var(--yellow)', bg: 'var(--yellow-bg)', border: 'rgba(234,179,8,0.25)' },
};

// ─── Shared card shell ────────────────────────────────────────────────────────
const Card = ({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) => (
  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18, ...style }}>
    {children}
  </div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 4 }}>
    {children}
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────
interface Props {
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function MindsetRisk({ onToast }: Props) {
  const [data, setData] = useState<MindsetData>(DEFAULT_DATA);
  const [draft, setDraft] = useState<MindsetData>(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addRuleModal, setAddRuleModal] = useState<{ open: boolean; category: MindsetRule['category'] }>({ open: false, category: 'market' });
  const [newRuleText, setNewRuleText] = useState('');

  useEffect(() => {
    SettingsRepo.get('mindsetData').then(saved => {
      if (saved) { setData(saved as MindsetData); setDraft(saved as MindsetData); }
      setLoaded(true);
    });
  }, []);

  const persistSave = useCallback(async (next: MindsetData) => {
    setData(next);
    setDraft(next);
    await SettingsRepo.set('mindsetData', next);
  }, []);

  const handleEdit = () => { setDraft({ ...data }); setEditing(true); };

  const handleSave = async () => {
    await persistSave(draft);
    setEditing(false);
    onToast('Changes saved ✓', 'success');
  };

  const handleCancel = () => { setDraft({ ...data }); setEditing(false); };

  // ── Draft mutators (only used in edit mode) ────────────────────────────────
  const setDraftField = (updater: (d: MindsetData) => MindsetData) =>
    setDraft(d => updater(d));

  const updateRule    = (id: string, text: string) =>
    setDraftField(d => ({ ...d, mindsetRules: d.mindsetRules.map(r => r.id === id ? { ...r, text } : r) }));
  const deleteRule    = (id: string) =>
    setDraftField(d => ({ ...d, mindsetRules: d.mindsetRules.filter(r => r.id !== id) }));
  const addRule       = () => {
    if (!newRuleText.trim()) return;
    setDraftField(d => ({ ...d, mindsetRules: [...d.mindsetRules, { id: uid(), text: newRuleText.trim(), category: addRuleModal.category }] }));
    setNewRuleText('');
    setAddRuleModal({ open: false, category: 'market' });
  };
  const updateTier    = (id: string, field: keyof RiskTier, val: number) =>
    setDraftField(d => ({ ...d, riskTiers: d.riskTiers.map(r => r.id === id ? { ...r, [field]: val } : r) }));
  const updateTP      = (id: string, field: keyof TakeProfit, val: string) =>
    setDraftField(d => ({ ...d, takeProfits: d.takeProfits.map(t => t.id === id ? { ...t, [field]: val } : t) }));
  const addTP         = () =>
    setDraftField(d => ({ ...d, takeProfits: [...d.takeProfits, { id: uid(), label: 'New target', ratios: '1.5 / 2 / 3' }] }));
  const deleteTP      = (id: string) =>
    setDraftField(d => ({ ...d, takeProfits: d.takeProfits.filter(t => t.id !== id) }));
  const updateDay     = (id: string, field: keyof DayRule, val: string | number | null) =>
    setDraftField(d => ({ ...d, dayRules: d.dayRules.map(r => r.id === id ? { ...r, [field]: val } : r) }));
  const addDayRule    = () =>
    setDraftField(d => ({ ...d, dayRules: [...d.dayRules, { id: uid(), maxTrades: null, maxLoss: null, note: '' }] }));
  const deleteDayRule = (id: string) =>
    setDraftField(d => ({ ...d, dayRules: d.dayRules.filter(r => r.id !== id) }));

  if (!loaded) return (
    <div className="page"><div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div></div>
  );

  // The data to render: draft in edit mode, saved data in view mode
  const view = editing ? draft : data;
  const categories: MindsetRule['category'][] = ['market', 'psychology', 'skip'];

  return (
    <div className="page">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="page-title">🧘 Mindset & Risk</div>
          <div className="page-subtitle">Your personal trading constitution — read this before every session</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {editing ? (
            <>
              <button className="btn btn-ghost" onClick={handleCancel}>✕ Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>💾 Save Changes</button>
            </>
          ) : (
            <button className="btn btn-ghost" onClick={handleEdit}>✏️ Edit</button>
          )}
        </div>
      </div>

      {/* Edit mode banner */}
      {editing && (
        <div style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: '10px 16px', marginBottom: 20, fontSize: 13, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 }}>
          ✏️ <strong>Edit mode</strong> — make your changes then click <strong>Save Changes</strong> to apply. Click <strong>Cancel</strong> to discard.
        </div>
      )}

      {/* ── Pre-trade checklist ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        {categories.map(cat => {
          const cfg = CAT_CONFIG[cat];
          const rules = view.mindsetRules.filter(r => r.category === cat);
          return (
            <Card key={cat} style={{ borderTop: `3px solid ${cfg.color}`, padding: 16 }}>
              {/* Column header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 15 }}>{cfg.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: cfg.color }}>{cfg.label}</span>
                </div>
                {editing && (
                  <button
                    onClick={() => setAddRuleModal({ open: true, category: cat })}
                    title="Add rule"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: 'var(--text-muted)', lineHeight: 1, padding: '2px 4px', borderRadius: 4 }}
                    onMouseEnter={e => (e.currentTarget.style.color = cfg.color)}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >＋</button>
                )}
              </div>

              {/* Rules list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {rules.map((r, i) => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', background: cfg.bg, borderRadius: 'var(--radius-sm)', border: `1px solid ${cfg.color}22` }}>
                    <span style={{ fontSize: 11, color: cfg.color, fontWeight: 700, minWidth: 16, marginTop: 1 }}>{i + 1}</span>
                    {editing ? (
                      <input
                        className="form-control"
                        value={r.text}
                        onChange={e => updateRule(r.id, e.target.value)}
                        style={{ flex: 1, fontSize: 12.5, padding: '2px 7px', height: 'auto' }}
                      />
                    ) : (
                      <span style={{ flex: 1, fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{r.text}</span>
                    )}
                    {editing && (
                      <button
                        onClick={() => deleteRule(r.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', padding: '2px 3px', lineHeight: 1, flexShrink: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                      >✕</button>
                    )}
                  </div>
                ))}
                {rules.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0', fontStyle: 'italic' }}>
                    {editing ? 'Click ＋ to add a rule' : 'No rules defined'}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* ── Risk per trade ──────────────────────────────────────────────── */}
        <Card>
          <SectionLabel>💰 Risk Per Trade</SectionLabel>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Amount to risk based on setup quality</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {view.riskTiers.map(tier => {
              const qcfg = QUALITY_CONFIG[tier.quality];
              return (
                <div key={tier.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 700, background: qcfg.bg, color: qcfg.color, border: `1px solid ${qcfg.border}`, minWidth: 34, textAlign: 'center' }}>
                    {tier.quality}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 12, flex: 1 }}>Risk / trade</span>
                  {tier.quality === 'B' ? (
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>— skip or minimal</span>
                  ) : editing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>$</span>
                      <input
                        type="number"
                        value={tier.minRisk || ''}
                        onChange={e => updateTier(tier.id, 'minRisk', parseFloat(e.target.value) || 0)}
                        style={{ width: 52, padding: '4px 6px', background: 'var(--bg-secondary)', border: '1px solid var(--accent)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-mono)', textAlign: 'center' }}
                      />
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>–</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>$</span>
                      <input
                        type="number"
                        value={tier.maxRisk || ''}
                        onChange={e => updateTier(tier.id, 'maxRisk', parseFloat(e.target.value) || 0)}
                        style={{ width: 52, padding: '4px 6px', background: 'var(--bg-secondary)', border: '1px solid var(--accent)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, fontFamily: 'var(--font-mono)', textAlign: 'center' }}
                      />
                    </div>
                  ) : (
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      ${tier.minRisk} – ${tier.maxRisk}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* ── Daily limits ────────────────────────────────────────────────── */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <SectionLabel>🛑 Max Risk / Day</SectionLabel>
            {editing && (
              <button className="btn btn-ghost btn-sm" onClick={addDayRule} style={{ fontSize: 11.5, padding: '3px 10px' }}>+ Add</button>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Stop trading when either limit is hit</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {view.dayRules.map(rule => (
              <div key={rule.id} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Max trades */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🔢</span>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Max Trades</div>
                      {editing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            type="number"
                            value={rule.maxTrades ?? ''}
                            placeholder="—"
                            onChange={e => updateDay(rule.id, 'maxTrades', e.target.value ? parseInt(e.target.value) : null)}
                            style={{ width: 50, padding: '3px 6px', background: 'var(--bg-secondary)', border: '1px solid var(--accent)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 700, textAlign: 'center' }}
                          />
                          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>trades</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                          {rule.maxTrades ?? '—'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>or</div>

                  {/* Max loss */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>💸</span>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>Max Daily Loss</div>
                      {editing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>-$</span>
                          <input
                            type="number"
                            value={rule.maxLoss ?? ''}
                            placeholder="—"
                            onChange={e => updateDay(rule.id, 'maxLoss', e.target.value ? parseFloat(e.target.value) : null)}
                            style={{ width: 60, padding: '3px 6px', background: 'var(--bg-secondary)', border: '1px solid var(--accent)', borderRadius: 6, color: 'var(--red)', fontSize: 15, fontFamily: 'var(--font-mono)', fontWeight: 700, textAlign: 'center' }}
                          />
                        </div>
                      ) : (
                        <span style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--red)' }}>
                          {rule.maxLoss != null ? `-$${rule.maxLoss}` : '—'}
                        </span>
                      )}
                    </div>
                  </div>

                  {editing && (
                    <button
                      onClick={() => deleteDayRule(rule.id)}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)', padding: '3px 6px', borderRadius: 4 }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >✕</button>
                  )}
                </div>

                {/* Note */}
                {(rule.note || editing) && (
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: 10, paddingTop: 8 }}>
                    {editing ? (
                      <input
                        className="form-control"
                        value={rule.note}
                        onChange={e => updateDay(rule.id, 'note', e.target.value)}
                        placeholder="Add a note…"
                        style={{ fontSize: 12, padding: '4px 8px', height: 'auto' }}
                      />
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>{rule.note}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Take profit targets ─────────────────────────────────────────────── */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <SectionLabel>🎯 Take Profit Targets</SectionLabel>
          {editing && (
            <button className="btn btn-ghost btn-sm" onClick={addTP} style={{ fontSize: 11.5, padding: '3px 10px' }}>+ Add</button>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>R:R levels to target per trade type</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {view.takeProfits.map(tp => (
            <div key={tp.id} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
              {editing ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <input
                      className="form-control"
                      value={tp.label}
                      onChange={e => updateTP(tp.id, 'label', e.target.value)}
                      placeholder="Target name…"
                      style={{ fontSize: 12.5, padding: '4px 8px', height: 'auto', flex: 1 }}
                    />
                    <button
                      onClick={() => deleteTP(tp.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)', padding: '2px 5px', borderRadius: 4, flexShrink: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >✕</button>
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 5 }}>R:R ratios (slash-separated):</div>
                  <input
                    className="form-control"
                    value={tp.ratios}
                    onChange={e => updateTP(tp.id, 'ratios', e.target.value)}
                    placeholder="e.g. 1.2 / 1.5 / 2 / 3"
                    style={{ fontSize: 13, fontFamily: 'var(--font-mono)', padding: '4px 8px', height: 'auto' }}
                  />
                </>
              ) : (
                <>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>{tp.label}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {tp.ratios.split('/').map(r => r.trim()).filter(Boolean).map((ratio, i) => (
                      <span key={i} style={{ padding: '4px 11px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent)' }}>
                        1:{ratio}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ── Trading mantra ──────────────────────────────────────────────────── */}
      <Card style={{ borderLeft: '3px solid var(--accent)' }}>
        <SectionLabel>📌 Trading Mantra & General Notes</SectionLabel>
        {editing ? (
          <textarea
            className="form-control"
            rows={4}
            value={draft.generalNotes}
            onChange={e => setDraft(d => ({ ...d, generalNotes: e.target.value }))}
            placeholder="Write your personal trading mantra, reminders, or anything you want to read every session…"
            style={{ fontSize: 13.5, lineHeight: 1.7, resize: 'vertical', marginTop: 10 }}
          />
        ) : (
          <p style={{ fontSize: 14, lineHeight: 1.85, color: 'var(--text-secondary)', marginTop: 10, whiteSpace: 'pre-wrap' }}>
            {data.generalNotes || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No mantra set — click Edit to add one.</span>}
          </p>
        )}
      </Card>

      {/* ── Add rule modal (edit mode only) ─────────────────────────────────── */}
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
