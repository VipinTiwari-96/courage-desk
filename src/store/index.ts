import { create } from 'zustand';
import type { Trade, PlaybookEntry, AppSettings, Theme } from '../types';
import { sameSetup } from '../utils/setups';
import { TradeRepo, PlaybookRepo, SettingsRepo, wipeAllData } from '../db';

const DEFAULT_SETTINGS: AppSettings = {
  assets: ['EUR/USD', 'XAU/USD', 'BTC/USD', 'GBP/USD', 'NAS100', 'US30'],
  setups: ['London Open Sweep', 'Asian Range Break', 'NY Session Reversal', 'FVG Fill', 'OB Retest'],
  sessions: ['London', 'New York', 'Asia', 'London/NY Overlap'],
  confirmations: ['Liquidity Grab', 'BOS', 'CHOCH', 'Rejection Candle', 'Order Block', 'Fair Value Gap', 'Volume Spike', 'Trendline Break'],
  pois: ['Order Block', 'Fair Value Gap', 'Breaker Block', 'Mitigation Block', 'Support/Resistance', 'Trendline'],
  rules: ['HTF trend aligned', 'Liquidity taken', 'Confirmation candle formed', 'POI identified', 'Risk defined'],
  mistakes: ['FOMO', 'Early Entry', 'Late Entry', 'Moved Stop Loss', 'Closed Early', 'Overtraded', 'Revenge Trade', 'Sized Too Large'],
};

interface AppStore {
  trades: Trade[];
  playbook: PlaybookEntry[];
  settings: AppSettings;
  theme: Theme;
  isLoading: boolean;
  /** Set when the database could not be opened — shown instead of a silently empty app. */
  dbError: string | null;

  loadAll: () => Promise<void>;
  saveTrade: (trade: Trade) => Promise<void>;
  deleteTrade: (id: number) => Promise<void>;
  savePlaybook: (entry: PlaybookEntry) => Promise<void>;
  deletePlaybook: (id: number) => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  toggleTheme: () => void;
  resetApp: () => Promise<void>;
}

export const useStore = create<AppStore>((set, get) => ({
  trades: [],
  playbook: [],
  settings: DEFAULT_SETTINGS,
  theme: (localStorage.getItem('tradelog-theme') as Theme) || 'dark',
  isLoading: true,
  dbError: null,

  loadAll: async () => {
    try {
      const [trades, playbook, savedSettings] = await Promise.all([
        TradeRepo.getAll(),
        PlaybookRepo.getAll(),
        SettingsRepo.get('appSettings'),
      ]);
      set({
        trades, playbook,
        settings: savedSettings ? { ...DEFAULT_SETTINGS, ...(savedSettings as AppSettings) } : DEFAULT_SETTINGS,
        isLoading: false,
        dbError: null,
      });
    } catch (err) {
      console.error('Could not open the TradeLog database:', err);
      set({ isLoading: false, dbError: err instanceof Error ? `${err.name}: ${err.message}` : String(err) });
    }
  },

  saveTrade: async (trade) => {
    await TradeRepo.save(trade);
    set({ trades: await TradeRepo.getAll() });
  },

  deleteTrade: async (id) => {
    await TradeRepo.delete(id);
    set({ trades: await TradeRepo.getAll() });
  },

  savePlaybook: async (entry) => {
    // Single source of truth — propagate name change to all trades
    if (entry.id) {
      const existing = await PlaybookRepo.getAll();
      const old = existing.find(p => p.id === entry.id);
      if (old && old.name.trim() !== entry.name.trim()) {
        const allTrades = await TradeRepo.getAll();
        const affected = allTrades.filter(t => sameSetup(t.setup, old.name));
        for (const trade of affected) await TradeRepo.save({ ...trade, setup: entry.name });
        if (affected.length > 0) set({ trades: await TradeRepo.getAll() });
      }
    }
    await PlaybookRepo.save(entry);
    set({ playbook: await PlaybookRepo.getAll() });
  },

  deletePlaybook: async (id) => {
    await PlaybookRepo.delete(id);
    set({ playbook: await PlaybookRepo.getAll() });
  },

  saveSettings: async (settings) => {
    await SettingsRepo.set('appSettings', settings);
    set({ settings });
  },

  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('tradelog-theme', next);
    set({ theme: next });
  },

  resetApp: async () => {
    await wipeAllData();
    await SettingsRepo.set('appSettings', DEFAULT_SETTINGS);
    set({ trades: [], playbook: [], settings: DEFAULT_SETTINGS });
  },
}));
