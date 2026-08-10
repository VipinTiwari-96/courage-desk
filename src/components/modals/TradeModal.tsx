import { useState, useEffect } from 'react';
import type { Trade, TradeDirection, TradeResult, TradeQuality } from '../../types';
import { useStore } from '../../store';
import { nowDatetimeLocal } from '../../utils';
import { ImageUpload } from '../ui/ImageUpload';
import { Lightbox } from '../ui/Lightbox';

interface Props {
  trade?: Trade | null;
  onClose: () => void;
  onSave: (msg: string) => void;
}

function emptyTrade(): Partial<Trade> {
  return { date: nowDatetimeLocal(), confirmations: [], mistakes: [], rules: [], exitRating: 0, quality: 'B' };
}

export function TradeModal({ trade, onClose, onSave }: Props) {
  const { settings, saveTrade, playbook } = useStore();
  const [form, setForm] = useState<Partial<Trade>>(emptyTrade());
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Track whether user has manually picked a quality or if it's auto-assigned
  const [qualityLocked, setQualityLocked] = useState(false);

  useEffect(() => {
    if (trade) {
      setForm({ ...trade });
      setQualityLocked(!!trade.quality && trade.quality !== 'B');
    } else {
      setForm(emptyTrade());
      setQualityLocked(false);
    }
  }, [trade]);

  // Auto-set quality based on the selected setup's Playbook grade
  const handleSetupChange = (setupName: string) => {
    // Find matching playbook entry
    const pbEntry = playbook.find(
      p => p.name.trim().toLowerCase() === setupName.trim().toLowerCase()
    );

    if (!qualityLocked) {
      // Inherit the setup's quality grade directly, fall back to B
      const autoQuality: TradeQuality = pbEntry?.quality ?? 'B';
      setQualityLocked(false); // keep unlocked so future setup changes still auto-update
      setForm(f => ({ ...f, setup: setupName, quality: autoQuality }));
    } else {
      // User manually locked quality — just update the setup name
      setForm(f => ({ ...f, setup: setupName }));
    }
  };

  const set = (key: keyof Trade, value: unknown) => setForm(f => ({ ...f, [key]: value }));

  const setQuality = (val: TradeQuality) => {
    // If user explicitly clicks a quality button, lock it
    setQualityLocked(true);
    set('quality', val);
  };

  const toggleList = (key: 'confirmations' | 'mistakes', val: string) => {
    const arr = (form[key] as string[]) || [];
    set(key, arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const toggleRule = (i: number) => {
    const arr = [...((form.rules as boolean[]) || [])];
    arr[i] = !arr[i];
    set('rules', arr);
    const allChecked = settings.rules.length > 0 && arr.every(Boolean);
    set('planFollowed', allChecked);
  };

  const allRulesChecked = settings.rules.length > 0 && (form.rules as boolean[] || []).every(Boolean) && (form.rules as boolean[] || []).length === settings.rules.length;

  const handleSave = async () => {
    if (!form.asset || !form.direction || !form.result || !form.date) {
      onSave('__error__Please fill required fields: Asset, Direction, Date, Result');
      return;
    }
    setSaving(true);
    const ruleChecks = settings.rules.map((_, i) => !!(form.rules as boolean[] || [])[i]);
    await saveTrade({
      ...form,
      rules: ruleChecks,
      planFollowed: ruleChecks.length > 0 && ruleChecks.every(Boolean),
      createdAt: trade?.createdAt || new Date().toISOString(),
    } as Trade);
    setSaving(false);
    onSave(trade ? 'Trade updated ✓' : 'Trade logged ✓');
    onClose();
  };

  // Only 3 quality options now: A+, A, B
  const qualityMap: { val: TradeQuality; cls: string; label: string; hint: string }[] = [
    { val: 'A+', cls: 'active-aplus', label: 'A+', hint: 'Highest-conviction setup from your playbook' },
    { val: 'A',  cls: 'active-a',    label: 'A',  hint: 'Solid playbook setup with full confirmation' },
    { val: 'B',  cls: 'active-b',    label: 'B',  hint: 'Setup not in playbook or partial confirmation' },
  ];

  const isInPlaybook = form.setup
    ? playbook.some(p => p.name.trim().toLowerCase() === (form.setup || '').trim().toLowerCase())
    : false;

  return (
    <>
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">{trade ? 'Edit Trade' : 'Log New Trade'}</div>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>

          <div className="modal-body">

            {/* Trade Info */}
            <div className="form-section">
              <div className="section-title">📍 Trade Information</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Asset *</label>
                  <select className="form-control" value={form.asset || ''} onChange={e => set('asset', e.target.value)}>
                    <option value="">Select asset...</option>
                    {settings.assets.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Direction *</label>
                  <div className="toggle-group">
                    {(['Buy', 'Sell'] as TradeDirection[]).map(d => (
                      <button key={d} className={`toggle-btn ${d.toLowerCase()}${form.direction === d ? ' active' : ''}`}
                        onClick={() => set('direction', d)}>
                        {d === 'Buy' ? '▲' : '▼'} {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Date & Time *</label>
                  <input type="datetime-local" className="form-control" value={form.date || ''} onChange={e => set('date', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Session</label>
                  <select className="form-control" value={form.session || ''} onChange={e => set('session', e.target.value)}>
                    <option value="">Select session...</option>
                    {settings.sessions.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Trade Type</label>
                  <select className="form-control" value={form.type || ''} onChange={e => set('type', e.target.value)}>
                    <option value="">Select type...</option>
                    <option>Scalp (1m-5m)</option><option>Intraday (15m-1H)</option><option>Swing (4H-1D)</option>
                  </select>
                </div>

                {/* Trade Quality — 3 options only */}
                <div className="form-group">
                  <label className="form-label">
                    Trade Quality
                    {!form.setup ? (
                      <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
                        auto-set when you pick a setup
                      </span>
                    ) : !isInPlaybook ? (
                      <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--yellow)', fontWeight: 400 }}>
                        ⚡ B — setup not in Playbook
                      </span>
                    ) : (
                      <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--green)', fontWeight: 400 }}>
                        ✓ inherited from Playbook
                      </span>
                    )}
                  </label>
                  <div className="quality-selector">
                    {qualityMap.map(({ val, cls, label, hint }) => (
                      <button
                        key={val}
                        className={`quality-btn${form.quality === val ? ' ' + cls : ''}`}
                        onClick={() => setQuality(val)}
                        title={hint}
                        style={val === 'B' && (!form.setup || !isInPlaybook) ? { opacity: 1 } : {}}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {qualityLocked && (
                    <div
                      style={{ marginTop: 5, fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', display: 'inline-block' }}
                      onClick={() => {
                        setQualityLocked(false);
                        // Re-evaluate auto
                        const inPb = form.setup
                          ? playbook.some(p => p.name.trim().toLowerCase() === (form.setup || '').trim().toLowerCase())
                          : false;
                        if (!form.setup || !inPb) set('quality', 'B');
                      }}
                    >
                      ↺ Reset to auto
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Market Context */}
            <div className="form-section">
              <div className="section-title">🧭 Market Context</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">HTF Bias</label>
                  <div className="toggle-group">
                    {['Bullish', 'Bearish', 'Neutral'].map(v => (
                      <button key={v} className={`toggle-btn${form.htfBias === v ? ' active' : ''}`} onClick={() => set('htfBias', form.htfBias === v ? '' : v)}>
                        {v === 'Bullish' ? '▲' : v === 'Bearish' ? '▼' : '—'} {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">HTF Timeframe</label>
                  <div className="toggle-group">
                    {['4H', '1D'].map(v => (
                      <button key={v} className={`toggle-btn${form.htfTf === v ? ' active' : ''}`} onClick={() => set('htfTf', form.htfTf === v ? '' : v)}>{v}</button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Intraday Bias</label>
                  <div className="toggle-group">
                    {['Bullish', 'Bearish', 'Neutral'].map(v => (
                      <button key={v} className={`toggle-btn${form.idBias === v ? ' active' : ''}`} onClick={() => set('idBias', form.idBias === v ? '' : v)}>
                        {v === 'Bullish' ? '▲' : v === 'Bearish' ? '▼' : '—'} {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Intraday Timeframe</label>
                  <div className="toggle-group">
                    {['15m', '1H'].map(v => (
                      <button key={v} className={`toggle-btn${form.idTf === v ? ' active' : ''}`} onClick={() => set('idTf', form.idTf === v ? '' : v)}>{v}</button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">POI</label>
                  <select className="form-control" value={form.poi || ''} onChange={e => set('poi', e.target.value)}>
                    <option value="">Select POI...</option>
                    {settings.pois.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Setup Name
                    {playbook.length === 0 && (
                      <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--yellow)', fontWeight: 400 }}>
                        ⚠ No setups in Playbook yet
                      </span>
                    )}
                  </label>
                  <select className="form-control" value={form.setup || ''} onChange={e => handleSetupChange(e.target.value)}>
                    <option value="">Select setup...</option>
                    {playbook.map(pb => (
                      <option key={pb.id} value={pb.name}>
                        {pb.quality ? `${pb.quality} · ` : ''}{pb.name}
                      </option>
                    ))}
                  </select>
                  {form.setup && (
                    <div style={{ marginTop: 4, fontSize: 11 }}>
                      {isInPlaybook
                        ? <span style={{ color: 'var(--green)' }}>✓ Found in your Playbook</span>
                        : <span style={{ color: 'var(--yellow)' }}>⚠ Not in Playbook → quality auto-set to B</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Confirmations */}
            <div className="form-section">
              <div className="section-title">✅ Confirmations</div>
              <div className="checkbox-group">
                {settings.confirmations.map(c => (
                  <label key={c} className="checkbox-item">
                    <input type="checkbox" checked={(form.confirmations || []).includes(c)} onChange={() => toggleList('confirmations', c)} />
                    <span>{c}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Rule Checklist */}
            <div className="form-section">
              <div className="section-title">📋 Rule Checklist</div>
              {settings.rules.map((r, i) => (
                <div key={i} className="rule-item">
                  <input type="checkbox" id={`rule-${i}`} checked={!!(form.rules as boolean[] || [])[i]} onChange={() => toggleRule(i)} />
                  <label htmlFor={`rule-${i}`}>{r}</label>
                </div>
              ))}
              {settings.rules.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {allRulesChecked
                    ? <span className="plan-followed">✓ Plan Followed ({settings.rules.length}/{settings.rules.length} rules)</span>
                    : <span className="plan-violated">✕ Plan Not Fully Followed ({(form.rules as boolean[] || []).filter(Boolean).length}/{settings.rules.length} rules)</span>}
                </div>
              )}
            </div>

            {/* Psychology */}
            <div className="form-section">
              <div className="section-title">🎭 Psychology</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Emotional State</label>
                  <select className="form-control" value={form.emotion || ''} onChange={e => set('emotion', e.target.value)}>
                    <option value="">Select state...</option>
                    {['Calm','Focused','Fear','FOMO','Revenge','Hesitation','Confident'].map(e => <option key={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">❌ Mistakes Made</label>
                <div className="checkbox-group">
                  {settings.mistakes.map(m => (
                    <label key={m} className="checkbox-item">
                      <input type="checkbox" checked={(form.mistakes || []).includes(m)} onChange={() => toggleList('mistakes', m)} />
                      <span>{m}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Risk & Result */}
            <div className="form-section">
              <div className="section-title">💰 Risk & Result</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Risk Amount ($)</label>
                  <input type="number" className="form-control" value={form.risk ?? ''} onChange={e => set('risk', e.target.value ? parseFloat(e.target.value) : null)} placeholder="e.g. 50" step="0.01" />
                </div>
                <div className="form-group">
                  <label className="form-label">Risk:Reward Ratio</label>
                  <input type="number" className="form-control" value={form.rr ?? ''} onChange={e => set('rr', e.target.value ? parseFloat(e.target.value) : null)} placeholder="e.g. 2.5" step="0.1" min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Result *</label>
                  <div className="toggle-group">
                    {(['Win', 'Loss', 'Breakeven'] as TradeResult[]).map(r => {
                      const cls = r === 'Win' ? 'win' : r === 'Loss' ? 'loss' : 'be';
                      const label = r === 'Win' ? '✔ Win' : r === 'Loss' ? '✖ Loss' : '⟺ BE';
                      return <button key={r} className={`toggle-btn ${cls}${form.result === r ? ' active' : ''}`} onClick={() => set('result', r)}>{label}</button>;
                    })}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">P&L Amount ($)</label>
                  <input type="number" className="form-control" value={form.pnl ?? ''} onChange={e => set('pnl', e.target.value ? parseFloat(e.target.value) : null)} placeholder="e.g. 125.50" step="0.01" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Exit Quality</label>
                <div className="star-rating">
                  {[1,2,3,4,5].map(n => (
                    <span key={n} className={`star${(form.exitRating || 0) >= n ? ' active' : ''}`} onClick={() => set('exitRating', n)}>★</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="form-section">
              <div className="section-title">📝 Notes</div>
              <div className="form-group">
                <label className="form-label">Trade Notes</label>
                <textarea className="form-control" rows={3} value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="What did you observe? Why did you take this trade?" />
              </div>
              <div className="form-group">
                <label className="form-label">🔁 Trade Replay Notes</label>
                <textarea className="form-control" rows={2} value={form.replay || ''} onChange={e => set('replay', e.target.value)} placeholder="If you saw this setup again, what would you do differently?" />
              </div>
            </div>

            {/* Screenshots */}
            <div className="form-section">
              <div className="section-title">📸 Screenshots</div>
              <div className="form-grid">
                <ImageUpload label="📷 Before Entry" value={form.beforeImg || null} onChange={v => set('beforeImg', v)} onPreview={setLightboxSrc} />
                <ImageUpload label="📷 After Exit" value={form.afterImg || null} onChange={v => set('afterImg', v)} onPreview={setLightboxSrc} />
              </div>
            </div>

          </div>

          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '⏳ Saving...' : '💾 Save Trade'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
