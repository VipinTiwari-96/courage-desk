import { create } from 'zustand';
import type { Trade, PlaybookEntry, AppSettings, Theme } from '../types';
import { TradeRepo, PlaybookRepo, SettingsRepo, db } from '../db';

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

  // Actions
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

  loadAll: async () => {
    const [trades, playbook, savedSettings] = await Promise.all([
      TradeRepo.getAll(),
      PlaybookRepo.getAll(),
      SettingsRepo.get('appSettings'),
    ]);
    set({
      trades,
      playbook,
      settings: savedSettings ? { ...DEFAULT_SETTINGS, ...(savedSettings as AppSettings) } : DEFAULT_SETTINGS,
      isLoading: false,
    });
  },

  saveTrade: async (trade) => {
    await TradeRepo.save(trade);
    const trades = await TradeRepo.getAll();
    set({ trades });
  },

  deleteTrade: async (id) => {
    await TradeRepo.delete(id);
    const trades = await TradeRepo.getAll();
    set({ trades });
  },

  savePlaybook: async (entry) => {
    await PlaybookRepo.save(entry);
    const playbook = await PlaybookRepo.getAll();
    set({ playbook });
  },

  deletePlaybook: async (id) => {
    await PlaybookRepo.delete(id);
    const playbook = await PlaybookRepo.getAll();
    set({ playbook });
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
    await db.trades.clear();
    await db.settings.clear();
    await db.playbook.clear();
    await SettingsRepo.set('appSettings', DEFAULT_SETTINGS);
    set({ trades: [], playbook: [], settings: DEFAULT_SETTINGS });
  },
}));
