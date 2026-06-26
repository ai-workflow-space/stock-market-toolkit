export interface StockData {
  symbol: string;
  period: string;
  cached_at: string;
  timestamp: string[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
}

export interface Indicators extends StockData {
  sma20: (number | null)[];
  sma50: (number | null)[];
  sma200: (number | null)[];
  ema12: (number | null)[];
  ema26: (number | null)[];
  rsi: (number | null)[];
  macd: (number | null)[];
  macd_signal: (number | null)[];
  macd_hist: (number | null)[];
  bb_upper: (number | null)[];
  bb_middle: (number | null)[];
  bb_lower: (number | null)[];
  atr: (number | null)[];
}

export interface StockInfo {
  symbol: string;
  cached_at: string;
  short_name: string;
  long_name?: string;
  exchange?: string;
  sector?: string;
  industry?: string;
  price: number;
  currency?: string;
  market_cap: number | null;
  trailing_pe: number | null;
  forward_pe: number | null;
  dividend_yield: number | null;
  beta: number | null;
  week_52_high: number | null;
  week_52_low: number | null;
  avg_volume: number | null;
}

export const TIMEFRAMES = [
  { label: "1D", value: "1d" },
  { label: "5D", value: "5d" },
  { label: "1M", value: "1mo" },
  { label: "3M", value: "3mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
  { label: "2Y", value: "2y" },
  { label: "5Y", value: "5y" },
  { label: "Max", value: "max" },
];

export interface Fundamentals {
  symbol: string;
  cached_at: string;
  f_score: number;
  roe: number | null;
  roa: number | null;
  gross_margin: number | null;
  op_margin: number | null;
  net_margin: number | null;
  eps_growth: number | null;
  rev_growth: number | null;
}

export interface YearlyDividend {
  year: number;
  total: number;
}

export interface DividendData {
  symbol: string;
  cached_at: string;
  yearly: YearlyDividend[];
  yield_pct: number | null;
  payout_ratio: number | null;
  streak: number;
}

export type SignalDirection = "bullish" | "bearish" | "neutral";

export type SignalType = 
  | "rsi_oversold" 
  | "rsi_overbought" 
  | "macd_cross" 
  | "sma_cross" 
  | "bb_touch" 
  | "volume_spike";

export interface Signal {
  id: string;
  symbol: string;
  direction: SignalDirection;
  signal_type: SignalType;
  price: number;
  timestamp: string;
  strength: number; // 0-100
  description: string;
}
