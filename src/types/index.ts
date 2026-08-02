export type TradeResult = 'Win' | 'Loss' | 'Breakeven';
export type TradeDirection = 'Buy' | 'Sell';
export type TradeQuality = 'A+' | 'A' | 'B';

export interface Trade {
  id?: number;
  asset: string;
  direction: TradeDirection;
  result: TradeResult;
  date: string;       // ISO string (datetime-local value)
  session?: string;
  type?: string;
  quality?: TradeQuality;
  htfBias?: string;
  htfTf?: string;
  idBias?: string;
  idTf?: string;
  poi?: string;
  setup?: string;
  confirmations?: string[];
  emotion?: string;
  mistakes?: string[];
  rules?: boolean[];
  planFollowed?: boolean;
  risk?: number | null;
  rr?: number | null;
  pnl?: number | null;
  exitRating?: number;
  notes?: string;
  replay?: string;
  beforeImg?: string | null;
  afterImg?: string | null;
  createdAt?: string;
}

export interface PlaybookEntry {
  id?: number;
  name: string;
  quality?: 'A+' | 'A';   // A+ = highest-conviction setup, A = solid setup
  desc?: string;
  rules?: string;
  timeframes?: string;
  rr?: string;
  notes?: string;
  screenshots?: string[];
}

export interface AppSettings {
  assets: string[];
  setups: string[];
  sessions: string[];
  confirmations: string[];
  pois: string[];
  rules: string[];
  mistakes: string[];
}

export type Theme = 'dark' | 'light';
