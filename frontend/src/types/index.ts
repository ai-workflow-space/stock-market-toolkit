export interface StockData {
  symbol: string;
  period: string;
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
  company_name: string;
  exchange: string;
  sector: string;
  industry: string;
  market_cap: number | null;
  pe_ratio: number | null;
  dividend_yield: number | null;
  week52_high: number | null;
  week52_low: number | null;
  week52_change: number | null;
  avg_volume: number | null;
  current_price: number | null;
  prev_close: number | null;
  open_price: number | null;
  beta: number | null;
  description: string;
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