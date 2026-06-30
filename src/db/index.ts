import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Trade, PlaybookEntry } from '../types';

interface SettingsRecord {
  key: string;
  value: unknown;
}

class TradeLogDB extends Dexie {
  trades!: Table<Trade, number>;
  settings!: Table<SettingsRecord, string>;
  playbook!: Table<PlaybookEntry, number>;

  constructor() {
    super('TradeLogDB');
    this.version(1).stores({
      trades: '++id, date, asset, result, direction, setup, session, quality',
      settings: 'key',
      playbook: '++id, name',
    });
  }
}

export const db = new TradeLogDB();

// ── Trade Repository ──────────────────────────────────────────
export const TradeRepo = {
  async getAll(): Promise<Trade[]> {
    return db.trades.orderBy('date').reverse().toArray();
  },
  async getById(id: number): Promise<Trade | undefined> {
    return db.trades.get(id);
  },
  async save(trade: Trade): Promise<number> {
    if (trade.id) {
      await db.trades.put(trade);
      return trade.id;
    }
    return db.trades.add(trade);
  },
  async delete(id: number): Promise<void> {
    await db.trades.delete(id);
  },
};

// ── Settings Repository ───────────────────────────────────────
export const SettingsRepo = {
  async get(key: string): Promise<unknown> {
    const r = await db.settings.get(key);
    return r ? r.value : null;
  },
  async set(key: string, value: unknown): Promise<void> {
    await db.settings.put({ key, value });
  },
};

// ── Playbook Repository ───────────────────────────────────────
export const PlaybookRepo = {
  async getAll(): Promise<PlaybookEntry[]> {
    return db.playbook.orderBy('name').toArray();
  },
  async save(entry: PlaybookEntry): Promise<number> {
    if (entry.id) {
      await db.playbook.put(entry);
      return entry.id;
    }
    return db.playbook.add(entry);
  },
  async delete(id: number): Promise<void> {
    await db.playbook.delete(id);
  },
};

// ── Image compression util ────────────────────────────────────
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
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      canvas.width = w; canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.78));
    };
    img.src = url;
  });
}
