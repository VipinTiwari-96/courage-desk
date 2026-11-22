import { useState, useEffect } from 'react';
import { useStore } from '../store';
import type { AppSettings } from '../types';
import { exportBackup, importBackup, describeBackup, getLastBackup, isStoragePersistent, requestPersistentStorage } from '../db';
import type { BackupFile } from '../db';
import { canInstall, isInstalled, onInstallChange, promptInstall } from '../utils/pwa';

interface Props {
  onConfirm: (msg: string, label?: string) => Promise<boolean>;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type Category = keyof AppSettings;

interface StorageInfo {
  used: number;       // bytes
  total: number;      // bytes
  remaining: number;  // bytes
  tradesWithImages: number;
  loading: boolean;
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// Average trade with 2 compressed screenshots ≈ 350 KB
const AVG_TRADE_WITH_IMAGES_BYTES = 350 * 1024;

export function Settings({ onConfirm, onToast }: Props) {
  const { settings, saveSettings, resetApp, loadAll } = useStore();
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [lastBackup, setLastBackup] = useState<Date | null>(getLastBackup());
  useEffect(() => { isStoragePersistent().then(setPersisted); }, []);
  const [installable, setInstallable] = useState(canInstall());
  useEffect(() => onInstallChange(() => setInstallable(canInstall())), []);
  const installed = isInstalled();

  const checkProtection = async () => {
    const granted = await requestPersistentStorage();
    setPersisted(granted);
    onToast(granted ? 'Storage is now protected ✓' : 'Still not protected — follow the steps below, then try again.', granted ? 'success' : 'info');
  };
  const handleInstall = async () => {
    const r = await promptInstall();
    if (r === 'accepted') onToast('Installing… open it from your desktop/taskbar, then press “Check again”.', 'success');
  };
  const [addModal, setAddModal] = useState<{ category: Category; editIdx: number | null; value: string } | null>(null);
  const [storage, setStorage] = useState<StorageInfo>({ used: 0, total: 0, remaining: 0, tradesWithImages: 0, loading: true });

  // Load real storage estimate on mount
  useEffect(() => {
    async function fetchStorage() {
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage ?? 0;
        const total = estimate.quota ?? 0;
        const remaining = total - used;
        // Count trades that have at least one screenshot stored
        const tradesCanFit = Math.floor(remaining / AVG_TRADE_WITH_IMAGES_BYTES);
        setStorage({ used, total, remaining, tradesWithImages: tradesCanFit, loading: false });
      } catch {
        setStorage(s => ({ ...s, loading: false }));
      }
    }
    fetchStorage();
  }, []);

  const usedPct = storage.total > 0 ? Math.min((storage.used / storage.total) * 100, 100) : 0;
  const barColor = usedPct > 80 ? 'var(--red)' : usedPct > 60 ? 'var(--yellow)' : 'var(--green)';

  const openAdd = (category: Category) => setAddModal({ category, editIdx: null, value: '' });
  const openEdit = (category: Category, idx: number) => setAddModal({ category, editIdx: idx, value: settings[category][idx] });

  const handleSaveItem = async () => {
    if (!addModal || !addModal.value.trim()) return;
    const updated = { ...settings, [addModal.category]: [...settings[addModal.category]] };
    if (addModal.editIdx !== null) updated[addModal.category][addModal.editIdx] = addModal.value.trim();
    else (updated[addModal.category] as string[]).push(addModal.value.trim());
    await saveSettings(updated);
    setAddModal(null);
    onToast('Saved ✓', 'success');
  };

  const handleDelete = async (category: Category, idx: number) => {
    const ok = await onConfirm('Delete this item?');
    if (!ok) return;
    const updated = { ...settings, [category]: settings[category].filter((_, i) => i !== idx) };
    await saveSettings(updated);
    onToast('Deleted', 'info');
  };

  const handleExport = async () => {
    try {
      const { blob, counts } = await exportBackup();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tradelog-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000); // keep alive so big files finish downloading
      setLastBackup(new Date());
      onToast(`Backup saved — ${counts.trades} trades, ${counts.screenshots} screenshot pairs, ${counts.playbook} setups ✓`, 'success');
    } catch (err) {
      console.error(err);
      onToast('Export failed. See console for details.', 'error');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      let data: BackupFile;
      try { data = JSON.parse(await file.text()); }
      catch { onToast('That file is not valid JSON.', 'error'); return; }
      const c = describeBackup(data);
      const ok = await onConfirm(
        `Restore this backup? It contains ${c.trades} trades, ${c.playbook} playbook setups and ${c.screenshots} screenshot pairs. ` +
        `This REPLACES the matching data currently in the app. If anything goes wrong, nothing is changed.`,
        'Restore'
      );
      if (!ok) return;
      await importBackup(data);
      await loadAll();
      onToast('Backup restored ✓', 'success');
    } catch (err) {
      console.error(err);
      onToast(err instanceof Error ? err.message : 'Import failed.', 'error');
    } finally {
      input.value = '';
    }
  };

  const handleReset = async () => {
    const ok = await onConfirm('⚠️ Reset ALL data? This permanently deletes everything and cannot be undone.', 'Reset Everything');
    if (!ok) return;
    await resetApp();
    onToast('App reset', 'info');
  };

  const sections: { key: Category; title: string; icon: string }[] = [
    { key: 'assets',        title: 'Assets',           icon: '💱' },
    { key: 'sessions',      title: 'Trading Sessions',  icon: '⏰' },
    { key: 'confirmations', title: 'Confirmations',     icon: '✅' },
    { key: 'pois',          title: 'POI Types',         icon: '📍' },
    { key: 'rules',         title: 'Setup Checklist',   icon: '☑️' },
    { key: 'mistakes',      title: 'Mistake Types',     icon: '❌' },
  ];

  return (
    <div className="page">
      <div className="page-header"><div className="page-title">Settings</div></div>
      <div className="settings-section">

        {/* ── Storage card ─────────────────────────────────── */}
        <div className="card mb-24">
          <div className="card-title mb-16">💾 Storage Usage</div>
          {storage.loading ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Calculating…</div>
          ) : (
            <>
              {/* 4 stat pills */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Total Storage', value: fmtBytes(storage.total), icon: '🗄️', color: 'var(--text-primary)' },
                  { label: 'Used',          value: fmtBytes(storage.used),  icon: '📦', color: usedPct > 80 ? 'var(--red)' : 'var(--text-primary)' },
                  { label: 'Remaining',     value: fmtBytes(storage.remaining), icon: '✅', color: 'var(--green)' },
                  { label: 'Trades w/ Images', value: `~${storage.tradesWithImages.toLocaleString()}`, icon: '📸', color: 'var(--accent)' },
                ].map(({ label, value, icon, color }) => (
                  <div key={label} style={{
                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', padding: '10px 12px',
                  }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5 }}>
                      {icon} {label}
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Storage used</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{usedPct.toFixed(1)}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${usedPct}%`, background: barColor, borderRadius: 3, transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
                * "Trades w/ Images" estimates how many more trades with 2 screenshots (~350 KB each) you can store in remaining space.
              </div>
            </>
          )}
        </div>

        {/* ── Settings sections ─────────────────────────────── */}
        {sections.map(({ key, title, icon }) => (
          <div className="card mb-16" key={key}>
            <div className="flex-between mb-10">
              <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                {icon} {title}
              </div>
              <button
                className="btn btn-ghost"
                onClick={() => openAdd(key)}
                style={{ padding: '3px 10px', fontSize: 11.5, borderRadius: 6 }}
              >
                + Add
              </button>
            </div>

            {/* Compact chip layout */}
            {settings[key].length === 0 ? (
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', padding: '2px 0' }}>No items yet.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {settings[key].map((item, i) => (
                  <div key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                    borderRadius: 20, padding: '3px 8px 3px 10px',
                    fontSize: 11.5, color: 'var(--text-secondary)',
                    maxWidth: '100%',
                  }}>
                    <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item}</span>
                    <button
                      onClick={() => openEdit(key, i)}
                      title="Edit"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 2px', fontSize: 10, color: 'var(--text-muted)', lineHeight: 1, borderRadius: 4 }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >✏️</button>
                    <button
                      onClick={() => handleDelete(key, i)}
                      title="Delete"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '1px 2px', fontSize: 10, color: 'var(--text-muted)', lineHeight: 1, borderRadius: 4 }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* ── Data management ───────────────────────────────── */}
        <div className="card mb-24">
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 12 }}>
            🗂 Data Management
          </div>
          <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
              <span>{lastBackup ? '✅' : '⚠️'}</span>
              <span style={{ color: 'var(--text-secondary)' }}>
                Last backup: <strong>{lastBackup ? lastBackup.toLocaleString() : 'never'}</strong>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, padding: '8px 12px', borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <span>{persisted ? '🔒' : '⚠️'}</span>
              <span style={{ color: 'var(--text-secondary)', flex: 1 }}>
                Browser storage: <strong style={{ color: persisted ? 'var(--green)' : 'var(--yellow)' }}>{persisted ? 'protected from auto-cleanup' : 'not protected — browser may clear it'}</strong>
              </span>
              {!persisted && installable && !installed && (
                <button className="btn btn-primary btn-sm" onClick={handleInstall}>⬇ Install as app</button>
              )}
              {!persisted && <button className="btn btn-ghost btn-sm" onClick={checkProtection}>Check again</button>}
            </div>
            {!persisted && (
              <div style={{ fontSize: 12.5, lineHeight: 1.7, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-input)', border: '1px dashed var(--border-light)', color: 'var(--text-secondary)' }}>
                <strong>Why “declined”?</strong> Chrome decides this silently. It protects sites that are <em>installed as an app</em>, bookmarked or used often. To qualify:
                <ol style={{ margin: '6px 0 0 18px' }}>
                  <li><strong>Install it as an app</strong> — {installed ? 'done ✓' : installable ? 'press “Install as app” above' : 'use the install icon at the right end of the address bar, or the ⋮ menu → Install'}. Your data stays: it is the same storage.</li>
                  <li><strong>Bookmark this page</strong> (<kbd>Ctrl</kbd>+<kbd>D</kbd>).</li>
                  <li>Press <strong>Check again</strong>.</li>
                </ol>
                <div style={{ marginTop: 6, color: 'var(--text-muted)' }}>Until then, data is normally only cleared when the disk is nearly full. Regular backups remain your safety net.</div>
              </div>
            )}
          </div>
          <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={handleExport}>⬇️ Export Backup (everything)</button>
            <button className="btn btn-ghost btn-sm" onClick={() => document.getElementById('import-file')?.click()}>⬆️ Restore Backup</button>
            <button className="btn btn-danger btn-sm" onClick={handleReset}>🗑️ Reset All Data</button>
            <input type="file" id="import-file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          </div>
        </div>

      </div>

      {/* ── Add / Edit modal ─────────────────────────────────── */}
      {addModal && (
        <div className="modal-overlay" onClick={() => setAddModal(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{addModal.editIdx !== null ? 'Edit Item' : 'Add Item'}</div>
              <button className="close-btn" onClick={() => setAddModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  className="form-control"
                  autoFocus
                  value={addModal.value}
                  onChange={e => setAddModal(m => m ? { ...m, value: e.target.value } : null)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveItem()}
                  placeholder="Enter name…"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setAddModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveItem}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
