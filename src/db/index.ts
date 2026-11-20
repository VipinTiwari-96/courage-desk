import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Trade, PlaybookEntry } from '../types';

// ── Record types ──────────────────────────────────────────────────────────────
interface SettingsRecord { key: string; value: unknown; }

export interface ScreenshotPair {
  id?: number;
  label: string;
  description?: string;
  beforeImg?: string | null;
  afterImg?: string | null;
  createdAt: string;
}

/** Shapes written by older builds (DB v2/v3). Kept so old data can be migrated, never deleted. */
interface LegacyExample { id?: string; before?: string; after?: string; image?: string; }
interface LegacyGroup {
  id?: number;
  name: string;
  examples?: LegacyExample[];
  screenshots?: string[];
}

// ── Database ──────────────────────────────────────────────────────────────────
/**
 * IMPORTANT — schema versioning rules (data-loss prevention):
 *  1. NEVER lower or reuse a version number. A browser refuses to open a database
 *     whose on-disk version is higher than the one requested, which makes every
 *     existing trade look like it vanished.
 *  2. Only ever ADD a new version() at the bottom. Never edit an old one.
 *  3. Never drop a table; copy data out of it instead.
 *
 * History: v1 base · v2/v3 introduced `screenshotGroups` (shipped to users) ·
 *          v4 adds the standalone `screenshots` table + copies groups into it.
 */
class TradeLogDB extends Dexie {
  trades!: Table<Trade, number>;
  settings!: Table<SettingsRecord, string>;
  playbook!: Table<PlaybookEntry, number>;
  screenshots!: Table<ScreenshotPair, number>;
  screenshotGroups!: Table<LegacyGroup, number>;

  constructor() {
    super('TradeLogDB');

    this.version(1).stores({
      trades: '++id, date, asset, result, direction, setup, session, quality',
      settings: 'key',
      playbook: '++id, name',
    });

    // v2 + v3 already ran in users' browsers. They are declared (schema only) so the
    // version chain stays valid, but their old data-moving upgrade steps are omitted:
    // those steps deleted screenshots from playbook entries and must not run again.
    this.version(2).stores({ screenshotGroups: '++id, name' });
    this.version(3).stores({});

    this.version(4)
      .stores({ screenshots: '++id, label, createdAt' })
      .upgrade(async tx => {
        // Copy (never delete) old screenshot groups into the new Screenshots page.
        const groups = (await tx.table('screenshotGroups').toArray()) as LegacyGroup[];
        const base = Date.now();
        const pairs: ScreenshotPair[] = [];
        for (const g of groups) {
          const examples: LegacyExample[] = [
            ...(g.examples ?? []),
            ...(g.screenshots ?? []).map((image, i) => ({ id: `legacy-${i + 1}`, image })),
          ];
          examples.forEach((ex, i) => {
            const before = ex.before ?? ex.image;
            const after = ex.after;
            if (!before && !after) return;
            pairs.push({
              label: examples.length > 1 ? `${g.name} #${i + 1}` : g.name,
              beforeImg: before ?? null,
              afterImg: after ?? null,
              createdAt: new Date(base - pairs.length).toISOString(),
            });
          });
        }
        if (pairs.length) await tx.table('screenshots').bulkAdd(pairs);
      });
  }
}

export const db = new TradeLogDB();

// ── Repositories (swap these for a real backend later) ────────────────────────
export const TradeRepo = {
  async getAll(): Promise<Trade[]> { return db.trades.orderBy('date').reverse().toArray(); },
  async getById(id: number): Promise<Trade | undefined> { return db.trades.get(id); },
  async save(trade: Trade): Promise<number> {
    if (trade.id) { await db.trades.put(trade); return trade.id; }
    return db.trades.add(trade);
  },
  async delete(id: number): Promise<void> { await db.trades.delete(id); },
};

export const SettingsRepo = {
  async get(key: string): Promise<unknown> {
    const r = await db.settings.get(key); return r ? r.value : null;
  },
  async set(key: string, value: unknown): Promise<void> { await db.settings.put({ key, value }); },
};

export const PlaybookRepo = {
  async getAll(): Promise<PlaybookEntry[]> { return db.playbook.orderBy('name').toArray(); },
  async save(entry: PlaybookEntry): Promise<number> {
    if (entry.id) { await db.playbook.put(entry); return entry.id; }
    return db.playbook.add(entry);
  },
  async delete(id: number): Promise<void> { await db.playbook.delete(id); },
};

export const ScreenshotRepo = {
  async getAll(): Promise<ScreenshotPair[]> {
    return db.screenshots.orderBy('createdAt').reverse().toArray();
  },
  async save(pair: ScreenshotPair): Promise<number> {
    if (pair.id) { await db.screenshots.put(pair); return pair.id; }
    return db.screenshots.add(pair);
  },
  async delete(id: number): Promise<void> { await db.screenshots.delete(id); },
};

// ── Backup: export / import EVERYTHING ────────────────────────────────────────
export interface BackupFile {
  app?: string;
  version?: number;
  exportedAt?: string;
  trades?: Trade[];
  playbook?: PlaybookEntry[];
  screenshots?: ScreenshotPair[];
  screenshotGroups?: LegacyGroup[];
  /** Old backups: the appSettings object. New backups keep it too (compat). */
  settings?: unknown;
  /** New backups: every row of the settings table (appSettings, mindsetData, …). */
  settingsRecords?: SettingsRecord[];
}

export interface BackupCounts {
  trades: number; playbook: number; screenshots: number; settings: number;
}

const LAST_BACKUP_KEY = 'tradelog-last-backup';
export const getLastBackup = (): Date | null => {
  const v = localStorage.getItem(LAST_BACKUP_KEY);
  return v ? new Date(v) : null;
};
const markBackupDone = () => localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());

/**
 * Build the backup as a Blob from many small pieces. A single JSON.stringify of
 * hundreds of MB of base64 screenshots can exhaust memory; streaming rows avoids that.
 */
export async function exportBackup(): Promise<{ blob: Blob; counts: BackupCounts }> {
  const [trades, playbook, screenshots, screenshotGroups, settingsRecords] = await Promise.all([
    db.trades.toArray(), db.playbook.toArray(), db.screenshots.toArray(),
    db.screenshotGroups.toArray(), db.settings.toArray(),
  ]);
  const appSettings = settingsRecords.find(r => r.key === 'appSettings')?.value ?? null;

  const parts: string[] = [];
  const rows = (name: string, list: unknown[]) => {
    parts.push(`"${name}":[`);
    list.forEach((row, i) => { if (i) parts.push(','); parts.push(JSON.stringify(row)); });
    parts.push(']');
  };
  parts.push(`{"app":"tradelog","version":2,"exportedAt":${JSON.stringify(new Date().toISOString())},`);
  rows('trades', trades);              parts.push(',');
  rows('playbook', playbook);          parts.push(',');
  rows('screenshots', screenshots);    parts.push(',');
  rows('screenshotGroups', screenshotGroups); parts.push(',');
  parts.push(`"settings":${JSON.stringify(appSettings)},`);
  rows('settingsRecords', settingsRecords);
  parts.push('}');

  markBackupDone();
  return {
    blob: new Blob(parts, { type: 'application/json' }),
    counts: { trades: trades.length, playbook: playbook.length, screenshots: screenshots.length, settings: settingsRecords.length },
  };
}

export function describeBackup(data: BackupFile): BackupCounts {
  return {
    trades: data.trades?.length ?? 0,
    playbook: data.playbook?.length ?? 0,
    screenshots: data.screenshots?.length ?? 0,
    settings: data.settingsRecords?.length ?? (data.settings ? 1 : 0),
  };
}

/**
 * Restore a backup. Runs in ONE transaction: if anything fails, nothing is changed.
 * Only tables present in the file are replaced, so an old backup (which has no
 * screenshots/mindset data) will not wipe those. IDs are preserved.
 */
export async function importBackup(data: BackupFile): Promise<BackupCounts> {
  const known = data && typeof data === 'object' &&
    (Array.isArray(data.trades) || Array.isArray(data.playbook) || Array.isArray(data.screenshots) ||
     Array.isArray(data.settingsRecords) || data.settings);
  if (!known) throw new Error('This file does not look like a TradeLog backup.');

  await db.transaction('rw', [db.trades, db.playbook, db.screenshots, db.screenshotGroups, db.settings], async () => {
    if (Array.isArray(data.trades))           { await db.trades.clear();           await db.trades.bulkAdd(data.trades); }
    if (Array.isArray(data.playbook))         { await db.playbook.clear();         await db.playbook.bulkAdd(data.playbook); }
    if (Array.isArray(data.screenshots))      { await db.screenshots.clear();      await db.screenshots.bulkAdd(data.screenshots); }
    if (Array.isArray(data.screenshotGroups)){ await db.screenshotGroups.clear(); await db.screenshotGroups.bulkAdd(data.screenshotGroups); }
    if (Array.isArray(data.settingsRecords))  { await db.settings.clear();         await db.settings.bulkPut(data.settingsRecords); }
    else if (data.settings && typeof data.settings === 'object') {
      await db.settings.put({ key: 'appSettings', value: data.settings }); // old-format backup
    }
  });
  return describeBackup(data);
}

export async function wipeAllData(): Promise<void> {
  await db.transaction('rw', [db.trades, db.playbook, db.screenshots, db.screenshotGroups, db.settings], async () => {
    await Promise.all([db.trades.clear(), db.playbook.clear(), db.screenshots.clear(), db.screenshotGroups.clear(), db.settings.clear()]);
  });
}

// ── Persistent storage (stops the browser auto-evicting your journal) ─────────
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch { return false; }
}
export async function isStoragePersistent(): Promise<boolean> {
  try { return (await navigator.storage?.persisted?.()) ?? false; } catch { return false; }
}

// ── Image compression ─────────────────────────────────────────────────────────
export function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxW = 1280, maxH = 960;
      let w = img.width, h = img.height;
      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio); h = Math.round(h * ratio);
      }
      canvas.width = w; canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };
    img.src = url;
  });
}
