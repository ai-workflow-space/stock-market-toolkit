import axios from "axios";
import type { StockData, Indicators, StockInfo } from "../types";

const BASE = "http://localhost:8001";

const api = axios.create({ baseURL: BASE, timeout: 30000 });

export async function getStock(symbol: string, period = "1y"): Promise<StockData> {
  const { data } = await api.get<StockData>(`/api/stock/${encodeURIComponent(symbol)}`, { params: { period } });
  return data;
}

export async function getIndicators(symbol: string, period = "1y"): Promise<Indicators> {
  const { data } = await api.get<Indicators>(`/api/stock/${encodeURIComponent(symbol)}/indicators`, { params: { period } });
  return data;
}

export async function getStockInfo(symbol: string): Promise<StockInfo> {
  const { data } = await api.get<StockInfo>(`/api/stock/${encodeURIComponent(symbol)}/info`);
  return data;
}

export async function compareStocks(symbols: string[], period = "1mo") {
  const { data } = await api.post("/api/compare", { symbols, period });
  return data;
}
