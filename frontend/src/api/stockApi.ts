import axios from "axios";
import type { StockData, Indicators, StockInfo } from "../types";

const API = import.meta.env.VITE_API_URL || "http://localhost:8001";

function getToken(): string | null {
  return localStorage.getItem("access_token");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getStock(symbol: string, period: string): Promise<StockData> {
  const res = await axios.get(`${API}/api/stock/${symbol}`, {
    params: { period },
    headers: authHeaders(),
  });
  return res.data;
}

export async function getIndicators(symbol: string, period: string): Promise<Indicators> {
  const res = await axios.get(`${API}/api/stock/${symbol}/indicators`, {
    params: { period },
    headers: authHeaders(),
  });
  return res.data;
}

export async function getStockInfo(symbol: string): Promise<StockInfo> {
  const res = await axios.get(`${API}/api/stock/${symbol}/info`, {
    headers: authHeaders(),
  });
  return res.data;
}

export async function compareStocks(symbols: string[], period: string) {
  const res = await axios.post(
    `${API}/api/compare`,
    { symbols, period },
    { headers: authHeaders() }
  );
  return res.data;
}

export async function searchSymbols(q: string) {
  const res = await axios.get(`${API}/api/search`, {
    params: { q },
    headers: authHeaders(),
  });
  return res.data;
}
