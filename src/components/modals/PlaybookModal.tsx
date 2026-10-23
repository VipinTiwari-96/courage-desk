import { useState, useEffect } from 'react';
import type { PlaybookEntry } from '../../types';

interface Props {
  entry?: PlaybookEntry | null;
  onClose: () => void;
  onSave: (entry: PlaybookEntry) => void;
}

export function PlaybookModal({ entry, onClose, onSave }: Props) {
  const [form, setForm] = useState<Partial<PlaybookEntry>>({});

  useEffect(() => {
    if (entry) {
      setForm({ ...entry });
    } else {
      setForm({});
    }
  }, [entry]);

  const set = (key: keyof PlaybookEntry, value: string) => setForm(f => ({ ...f, [key]: value }));
  const setQuality = (val: 'A+' | 'A') =>
    setForm(f => ({ ...f, quality: f.quality === val ? undefined : val }));

  const handleSave = () => {
    if (!form.name?.trim()) return;
    onSave(form as PlaybookEntry);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title">{entry ? 'Edit Setup' : 'Add Playbook Entry'}</div>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Setup Name *</label>
              <input className="form-control" value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="e.g. London Open Sweep" />
            </div>

            {/* Setup quality tag */}
            <div className="form-group">
              <label className="form-label">
                Setup Quality
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
                  How would you grade this setup?
                </span>
              </label>
              <div className="quality-selector" style={{ maxWidth: 220 }}>
                {(['A+', 'A'] as const).map(val => {
                  const cls = val === 'A+' ? 'active-aplus' : 'active-a';
                  const hint = val === 'A+' ? 'Highest-conviction, cleanest setup' : 'Solid, well-defined setup';
                  return (
                    <button
                      key={val}
                      className={`quality-btn${form.quality === val ? ' ' + cls : ''}`}
                      onClick={() => setQuality(val)}
                      title={hint}
                    >
                      {val}
                    </button>
                  );
                })}
                {!form.quality && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 6 }}>
                    (optional)
                  </span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows={3} value={form.desc || ''} onChange={e => set('desc', e.target.value)} placeholder="Describe the setup..." />
            </div>
            <div className="form-group">
              <label className="form-label">Entry Rules (one per line)</label>
              <textarea className="form-control" rows={4} value={form.rules || ''} onChange={e => set('rules', e.target.value)} placeholder={"HTF trend aligned\nLiquidity taken\nConfirmation candle formed"} />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Timeframes</label>
                <input className="form-control" value={form.timeframes || ''} onChange={e => set('timeframes', e.target.value)} placeholder="e.g. 15m, 1H" />
              </div>
              <div className="form-group">
                <label className="form-label">Typical R:R</label>
                <input className="form-control" value={form.rr || ''} onChange={e => set('rr', e.target.value)} placeholder="e.g. 1:3" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes / Edge</label>
              <textarea className="form-control" rows={2} value={form.notes || ''} onChange={e => set('notes', e.target.value)} placeholder="What makes this setup your edge?" />
            </div>


          </div>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave}>💾 Save</button>
          </div>
        </div>
    </div>
  );
}
