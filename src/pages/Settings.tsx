import { useState } from 'react';
import { useStore } from '../store';
import type { AppSettings } from '../types';
import { TradeRepo, PlaybookRepo } from '../db';

interface Props {
  onConfirm: (msg: string, label?: string) => Promise<boolean>;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type Category = keyof AppSettings;

export function Settings({ onConfirm, onToast }: Props) {
  const { settings, saveSettings, resetApp } = useStore();
  const [addModal, setAddModal] = useState<{ category: Category; editIdx: number | null; value: string } | null>(null);

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
    const trades = await TradeRepo.getAll();
    const playbook = await PlaybookRepo.getAll();
    const data = { trades, playbook, settings, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tradelog-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('Data exported ✓', 'success');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await onConfirm('Import data? This will merge with existing data.', 'Import');
    if (!ok) { e.target.value = ''; return; }
    const text = await file.text();
    const data = JSON.parse(text);
    if (data.trades) for (const t of data.trades) { delete t.id; await TradeRepo.save(t); }
    if (data.playbook) for (const p of data.playbook) { delete p.id; await PlaybookRepo.save(p); }
    if (data.settings) await saveSettings({ ...settings, ...data.settings });
    onToast('Data imported ✓', 'success');
    e.target.value = '';
  };

  const handleReset = async () => {
    const ok = await onConfirm('⚠️ Reset ALL data? This permanently deletes everything and cannot be undone.', 'Reset Everything');
    if (!ok) return;
    await resetApp();
    onToast('App reset', 'info');
  };

  const sections: { key: Category; title: string; icon: string }[] = [
    { key: 'assets', title: 'Assets', icon: '💱' },
    { key: 'setups', title: 'Setup Names', icon: '📋' },
    { key: 'sessions', title: 'Trading Sessions', icon: '⏰' },
    { key: 'confirmations', title: 'Confirmations', icon: '✅' },
    { key: 'pois', title: 'POI Types', icon: '📍' },
    { key: 'rules', title: 'Rule Checklist', icon: '📏' },
    { key: 'mistakes', title: 'Mistake Types', icon: '❌' },
  ];

  return (
    <div className="page">
      <div className="page-header"><div className="page-title">Settings</div></div>
      <div className="settings-section">

        {sections.map(({ key, title, icon }) => (
          <div className="card mb-24" key={key}>
            <div className="flex-between mb-12">
              <div className="card-title" style={{ margin: 0 }}>{icon} {title}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => openAdd(key)}>+ Add</button>
            </div>
            <div className="settings-list">
              {settings[key].map((item, i) => (
                <div className="settings-item" key={i}>
                  <span style={{ fontSize: 13.5 }}>{item}</span>
                  <div className="flex gap-8">
                    <button className="btn-icon btn-sm" onClick={() => openEdit(key, i)} title="Edit">✏️</button>
                    <button className="btn-icon btn-sm" onClick={() => handleDelete(key, i)} title="Delete">🗑</button>
                  </div>
                </div>
              ))}
              {settings[key].length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>No items yet.</div>}
            </div>
          </div>
        ))}

        {/* Data management */}
        <div className="card mb-24">
          <div className="card-title mb-12">💾 Data Management</div>
          <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={handleExport}>⬇️ Export JSON</button>
            <button className="btn btn-ghost" onClick={() => document.getElementById('import-file')?.click()}>⬆️ Import JSON</button>
            <button className="btn btn-danger" onClick={handleReset}>🗑️ Reset All Data</button>
            <input type="file" id="import-file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          </div>
        </div>
      </div>

      {/* Add/Edit modal */}
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
                  placeholder="Enter name..."
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
