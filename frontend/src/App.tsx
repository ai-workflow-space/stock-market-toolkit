import { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend, Area
} from "recharts";
import { getStock, getIndicators, getStockInfo } from "./api/stockApi";
import type { StockData, Indicators, StockInfo } from "./types";
import { TIMEFRAMES } from "./types";
import "./index.css";

/* ─── helpers ─── */
const fmt = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number | null | undefined) =>
  n == null ? "—" : `${n >= 0 ? "+" : ""}${(n * 100).toFixed(2)}%`;
const volFmt = (n: number | null | undefined) =>
  n == null ? "—" : n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : `${(n / 1e3).toFixed(0)}K`;
const mktcap = (n: number | null | undefined) =>
  n == null ? "—" : n >= 1e12 ? `$${(n / 1e12).toFixed(2)}T` : n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B` : `$${(n / 1e6).toFixed(2)}M`;

/* ─── SearchBar ─── */
function SearchBar({ onSearch, loading }: { onSearch: (s: string) => void; loading: boolean }) {
  const [val, setVal] = useState("");

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    const s = val.trim().toUpperCase();
    if (!s) return;
    onSearch(s);
  };

  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "2rem" }}>
      <form onSubmit={handle} style={{ display: "flex", gap: "0.5rem", flex: 1, maxWidth: 480 }}>
        <div className="search-container" style={{ flex: 1 }}>
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            placeholder="Search ticker… AAPL, TSLA, MSFT"
            value={val}
            onChange={e => setVal(e.target.value)}
          />
        </div>
        <button className="search-btn" type="submit" disabled={loading}>
          {loading ? "Loading…" : "Analyze"}
        </button>
      </form>
      <Link to="/compare" style={{ color: "#64748b", fontSize: "0.85rem", fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap" }}>
        + Compare
      </Link>
    </div>
  );
}

/* ─── TimeframeSelector ─── */
function TimeframeSelector({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  return (
    <div className="timeframe-bar">
      {TIMEFRAMES.map(tf => (
        <button
          key={tf.value}
          className={`tf-btn${value === tf.value ? " active" : ""}`}
          onClick={() => onChange(tf.value)}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
}

/* ─── IndicatorToggle ─── */
type IndicatorKey = "sma20" | "sma50" | "sma200" | "ema12" | "ema26" | "rsi" | "macd" | "bb" | "atr";
const INDICATORS: { key: IndicatorKey; label: string }[] = [
  { key: "sma20", label: "SMA 20" },
  { key: "sma50", label: "SMA 50" },
  { key: "sma200", label: "SMA 200" },
  { key: "ema12", label: "EMA 12" },
  { key: "ema26", label: "EMA 26" },
  { key: "rsi", label: "RSI" },
  { key: "macd", label: "MACD" },
  { key: "bb", label: "Bollinger" },
  { key: "atr", label: "ATR" },
];

function IndicatorToggle({ active, onToggle }: { active: Set<IndicatorKey>; onToggle: (k: IndicatorKey) => void }) {
  return (
    <div className="indicators-panel">
      {INDICATORS.map(({ key, label }) => (
        <button
          key={key}
          className={`ind-btn${active.has(key) ? " active" : ""}`}
          onClick={() => onToggle(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ─── PriceChart ─── */
interface ChartData { date: string; close: number; volume: number; [key: string]: unknown }
interface PriceChartProps {
  data: ChartData[];
  indicators: Indicators | null;
  activeInds: Set<IndicatorKey>;
}

function PriceChart({ data, indicators, activeInds }: PriceChartProps) {
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{value: number; dataKey: string; color: string}>; label?: string }) => {
    if (!active || !payload?.length) return null;
    const price = payload.find(p => p.dataKey === "close");
    const vol = payload.find(p => p.dataKey === "volume");
    return (
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "0.75rem 1rem", fontSize: "0.82rem" }}>
        <div style={{ color: "#94a3b8", marginBottom: "0.4rem" }}>{label}</div>
        {price && <div style={{ color: "#e2e8f0" }}>Close: <b>${fmt(price.value)}</b></div>}
        {vol && <div style={{ color: "#94a3b8" }}>Vol: {volFmt(vol.value)}</div>}
        {activeInds.has("rsi") && indicators && (
          <div style={{ color: "#fbbf24" }}>RSI: {fmt(indicators.rsi[data.findIndex(d => d.date === label)])}</div>
        )}
      </div>
    );
  };

  if (!data.length) return <div style={{ color: "#475569", textAlign: "center", padding: "3rem" }}>No chart data</div>;

  return (
    <ResponsiveContainer width="100%" height={420}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#1e293b" }} interval="preserveStartEnd" />
        <YAxis yAxisId="price" orientation="right" tick={{ fill: "#475569", fontSize: 11 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} tickFormatter={v => `$${v.toFixed(0)}`} />
        <YAxis yAxisId="volume" orientation="left" hide domain={["auto", "auto"]} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: "0.8rem", color: "#94a3b8" }} />

        {activeInds.has("bb") && indicators && (
          <>
            <Area yAxisId="price" type="monotone" dataKey="bb_upper" stroke="#a855f7" fill="transparent" strokeWidth={1} strokeDasharray="4 2" dot={false} name="BB Upper" />
            <Area yAxisId="price" type="monotone" dataKey="bb_lower" stroke="#a855f7" fill="transparent" strokeWidth={1} strokeDasharray="4 2" dot={false} name="BB Lower" />
            <Area yAxisId="price" type="monotone" dataKey="bb_middle" stroke="#a855f7" fill="rgba(168,85,247,0.08)" strokeWidth={1} dot={false} name="BB Middle" />
          </>
        )}

        <Bar yAxisId="volume" dataKey="volume" fill="#1e3a5f" opacity={0.4} name="Volume" maxBarSize={8} />

        {activeInds.has("sma20") && <Line yAxisId="price" type="monotone" dataKey="sma20" stroke="#60a5fa" strokeWidth={1.5} dot={false} name="SMA 20" />}
        {activeInds.has("sma50") && <Line yAxisId="price" type="monotone" dataKey="sma50" stroke="#fbbf24" strokeWidth={1.5} dot={false} name="SMA 50" />}
        {activeInds.has("sma200") && <Line yAxisId="price" type="monotone" dataKey="sma200" stroke="#f97316" strokeWidth={1.5} dot={false} name="SMA 200" />}
        {activeInds.has("ema12") && <Line yAxisId="price" type="monotone" dataKey="ema12" stroke="#34d399" strokeWidth={1.2} dot={false} name="EMA 12" />}
        {activeInds.has("ema26") && <Line yAxisId="price" type="monotone" dataKey="ema26" stroke="#f472b6" strokeWidth={1.2} dot={false} name="EMA 26" />}

        <Line yAxisId="price" type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Close" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ─── RSIChart ─── */
function RSIChart({ data, rsi }: { data: ChartData[]; rsi: (number | null)[] }) {
  const rsiData = data.map((d, i) => ({ date: d.date, rsi: rsi[i] }));
  return (
    <ResponsiveContainer width="100%" height={120}>
      <ComposedChart data={rsiData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis yAxisId="rsi" domain={[0, 100]} tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} ticks={[30, 50, 70]} />
        <ReferenceLine yAxisId="rsi" y={70} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
        <ReferenceLine yAxisId="rsi" y={30} stroke="#22c55e" strokeDasharray="3 3" strokeWidth={1} />
        <Tooltip content={({ active, payload, label }) => {
          if (!active || !payload?.length) return null;
          return <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "0.5rem 0.75rem", fontSize: "0.8rem" }}>
            <div style={{ color: "#94a3b8" }}>{label}</div>
            <div style={{ color: "#fbbf24" }}>RSI: {fmt(payload[0]?.value as number)}</div>

          </div>;
        }} />
        <Line yAxisId="rsi" type="monotone" dataKey="rsi" stroke="#fbbf24" strokeWidth={1.5} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ─── MACDChart ─── */
function MACDChart({ data, macd, signal, hist }: { data: ChartData[]; macd: (number | null)[]; signal: (number | null)[]; hist: (number | null)[] }) {
  const mData = data.map((d, i) => ({ date: d.date, macd: macd[i], signal: signal[i], hist: hist[i] }));
  return (
    <ResponsiveContainer width="100%" height={120}>
      <ComposedChart data={mData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis yAxisId="m" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip content={({ active, payload, label }) => {
          if (!active || !payload?.length) return null;
          return <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "0.5rem 0.75rem", fontSize: "0.8rem" }}>
            <div style={{ color: "#94a3b8" }}>{String(label)}</div>
            {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{String(p.dataKey)}: {fmt(p.value as number)}</div>)}
          </div>;
        }} />
        <Bar yAxisId="m" dataKey="hist" fill="#6366f1" opacity={0.5} name="Histogram" maxBarSize={6} />
        <Line yAxisId="m" type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="MACD" />
        <Line yAxisId="m" type="monotone" dataKey="signal" stroke="#f97316" strokeWidth={1.5} dot={false} name="Signal" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ─── StockInfoCard ─── */
function StockInfoCard({ info }: { info: StockInfo | null }) {
  if (!info) return null;
  const change = info.week52_change ?? 0;
  return (
    <div className="info-card">
      <div className="info-title">Key Metrics</div>
      <div className="info-grid">
        <div className="info-item"><div className="info-label">Market Cap</div><div className="info-value">{mktcap(info.market_cap)}</div></div>
        <div className="info-item"><div className="info-label">P/E Ratio</div><div className="info-value">{fmt(info.pe_ratio)}</div></div>
        <div className="info-item"><div className="info-label">Dividend Yield</div><div className="info-value">{info.dividend_yield ? `${(info.dividend_yield * 100).toFixed(2)}%` : "—" }</div></div>
        <div className="info-item"><div className="info-label">Beta</div><div className="info-value">{fmt(info.beta)}</div></div>
        <div className="info-item"><div className="info-label">52W High</div><div className="info-value up">${fmt(info.week52_high)}</div></div>
        <div className="info-item"><div className="info-label">52W Low</div><div className="info-value down">${fmt(info.week52_low)}</div></div>
        <div className="info-item"><div className="info-label">52W Change</div><div className={`info-value ${change >= 0 ? "up" : "down"}`}>{pct(change)}</div></div>
        <div className="info-item"><div className="info-label">Avg Volume</div><div className="info-value">{volFmt(info.avg_volume)}</div></div>
        <div className="info-item"><div className="info-label">Open</div><div className="info-value">${fmt(info.open_price)}</div></div>
        <div className="info-item"><div className="info-label">Prev Close</div><div className="info-value">${fmt(info.prev_close)}</div></div>
        <div className="info-item"><div className="info-label">Sector</div><div className="info-value" style={{ fontSize: "0.8rem" }}>{info.sector || "—"}</div></div>
        <div className="info-item"><div className="info-label">Exchange</div><div className="info-value">{info.exchange || "—"}</div></div>
      </div>
      {info.description && (
        <>
          <div className="info-title" style={{ marginTop: "1.25rem" }}>About</div>
          <p style={{ fontSize: "0.8rem", color: "#64748b", lineHeight: 1.6 }}>{info.description.slice(0, 300)}…</p>
        </>
      )}
    </div>
  );
}

/* ─── Dashboard ─── */
function Dashboard() {
  const [symbol, setSymbol] = useState("AAPL");
  const [period, setPeriod] = useState("3mo");
  const [stock, setStock] = useState<StockData | null>(null);
  const [indicators, setIndicators] = useState<Indicators | null>(null);
  const [info, setInfo] = useState<StockInfo | null>(null);
  const [activeInds, setActiveInds] = useState<Set<IndicatorKey>>(new Set(["sma20", "rsi"]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async (sym: string, per: string) => {
    setLoading(true);
    setError(null);
    try {
      const [st, ind, inf] = await Promise.all([
        getStock(sym, per),
        getIndicators(sym, per),
        getStockInfo(sym),
      ]);
      setStock(st);
      setIndicators(ind);
      setInfo(inf);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(symbol, period); }, [symbol, period, fetchAll]);

  const toggleInd = (k: IndicatorKey) => {
    setActiveInds(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  };

  const chartData = stock ? stock.timestamp.map((t, i) => ({
    date: new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    close: stock.close[i],
    volume: stock.volume[i],
    sma20: indicators?.sma20[i] ?? null,
    sma50: indicators?.sma50[i] ?? null,
    sma200: indicators?.sma200[i] ?? null,
    ema12: indicators?.ema12[i] ?? null,
    ema26: indicators?.ema26[i] ?? null,
    bb_upper: indicators?.bb_upper[i] ?? null,
    bb_middle: indicators?.bb_middle[i] ?? null,
    bb_lower: indicators?.bb_lower[i] ?? null,
  })) : [];

  const prevClose = info?.prev_close;
  const price = info?.current_price;
  const priceChange = price != null && prevClose != null ? price - prevClose : null;

  return (
    <div className="main-content">
      <SearchBar onSearch={setSymbol} loading={loading} />

      {error && <div className="error-msg">{error}</div>}

      {stock && info && (
        <>
          <div className="ticker-header">
            <div>
              <div className="ticker-symbol">{symbol}</div>
              <div className="ticker-name">{info.company_name}</div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div className="ticker-price">${fmt(price)}</div>
              {priceChange != null && (
                <div className={`ticker-change ${priceChange >= 0 ? "up" : "down"}`}>
                  {priceChange >= 0 ? "▲" : "▼"} ${fmt(Math.abs(priceChange))} ({pct(priceChange / prevClose!)})
                </div>
              )}
            </div>
          </div>

          <TimeframeSelector value={period} onChange={setPeriod} />

          {loading && <div className="loading-bar" />}
          {!loading && (
            <>
              <div className="chart-card">
                <PriceChart data={chartData} indicators={indicators} activeInds={activeInds} />
              </div>

              <IndicatorToggle active={activeInds} onToggle={toggleInd} />

              {activeInds.has("rsi") && indicators && (
                <div className="chart-card" style={{ padding: "1rem 1.5rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#475569", marginBottom: "0.5rem" }}>RSI (14)</div>
                  <RSIChart data={chartData} rsi={indicators.rsi} />
                </div>
              )}

              {activeInds.has("macd") && indicators && (
                <div className="chart-card" style={{ padding: "1rem 1.5rem" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#475569", marginBottom: "0.5rem" }}>MACD (12, 26, 9)</div>
                  <MACDChart data={chartData} macd={indicators.macd} signal={indicators.macd_signal} hist={indicators.macd_hist} />
                </div>
              )}

              <div className="content-grid">
                <div className="chart-card">
                  <div className="info-title">Price & Volume Summary</div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #1e293b" }}>
                          {["Date","Open","High","Low","Close","Volume"].map(h => <th key={h} style={{ textAlign: "right", color: "#475569", fontWeight: 600, padding: "0.5rem 0.75rem" }}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {[...Array(Math.min(10, chartData.length))].map((_, i) => {
                          const idx = chartData.length - 10 + i;
                          const d = chartData[idx];
                          return (
                            <tr key={idx} style={{ borderBottom: "1px solid #1e293b" }}>
                              <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{d.date}</td>
                              <td style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>${fmt(stock.open[idx])}</td>
                              <td style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>${fmt(stock.high[idx])}</td>
                              <td style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>${fmt(stock.low[idx])}</td>
                              <td style={{ padding: "0.5rem 0.75rem", textAlign: "right", color: "#3b82f6", fontWeight: 600 }}>${fmt(d.close)}</td>
                              <td style={{ padding: "0.5rem 0.75rem", textAlign: "right", color: "#64748b" }}>{volFmt(stock.volume[idx])}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <StockInfoCard info={info} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Compare ─── */
function Compare() {
  const [symbols, setSymbols] = useState(["AAPL", "MSFT", "GOOG"]);
  const [editing, setEditing] = useState(symbols.join(", "));
  const [period, setPeriod] = useState("1mo");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCompare = useCallback(async () => {
    const syms = symbols.filter(Boolean);
    if (!syms.length) return;
    setLoading(true);
    setError(null);
    try {
      const axios = (await import("axios")).default;
      const result = await axios.post("http://localhost:8001/api/compare", { symbols: syms, period });
      setData(result.data.stocks);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to compare");
    } finally {
      setLoading(false);
    }
  }, [symbols, period]);

  useEffect(() => { fetchCompare(); }, [fetchCompare]);

  const chartColors = ["#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ef4444"];

  return (
    <div className="main-content">
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <Link to="/" style={{ color: "#64748b", textDecoration: "none", fontSize: "0.9rem" }}>← Back</Link>
        <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>Compare Stocks</span>
      </div>

      <div className="search-container" style={{ maxWidth: 600, marginBottom: "1rem" }}>
        <span className="search-icon">📊</span>
        <input className="search-input" value={editing} onChange={e => { setEditing(e.target.value); setSymbols(e.target.value.split(",").map(s => s.trim().toUpperCase())); }} placeholder="AAPL, MSFT, GOOG (comma separated)" />
      </div>
      <div style={{ marginBottom: "1.5rem" }}>
        <TimeframeSelector value={period} onChange={setPeriod} />
      </div>

      {error && <div className="error-msg">{error}</div>}
      {loading && <div className="loading-bar" />}

      {data.length > 0 && (
        <>
          <div className="chart-card">
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "#1e293b" }} interval="preserveStartEnd" />
                <YAxis yAxisId="price" orientation="right" tick={{ fill: "#475569", fontSize: 11 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} tickFormatter={v => `$${v.toFixed(0)}`} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "0.75rem 1rem", fontSize: "0.82rem" }}>
                      <div style={{ color: "#94a3b8", marginBottom: "0.4rem" }}>{String(label)}</div>
                      {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{String(p.dataKey)}: ${fmt(p.value as number)}</div>)}
                    </div>
                  );
                }} />
                <Legend wrapperStyle={{ fontSize: "0.8rem", color: "#94a3b8" }} />
                {data.map((s, i) => (
                  <Line key={s.symbol} yAxisId="price" type="monotone" dataKey="close" data={s.timestamp.map((t: string, j: number) => ({ date: new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" }), close: s.close[j] })).filter((_: any, j: number) => j < (data[0]?.timestamp?.length || 0))} stroke={chartColors[i % chartColors.length]} strokeWidth={2} dot={false} name={s.symbol} />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="compare-grid">
            {data.map((s, i) => {
              const closes = s.close.filter(Boolean);
              const last = closes[closes.length - 1];
              const first = closes[0];
              const change = first ? (last - first) / first : 0;
              return (
                <div key={s.symbol} className="compare-symbol-card">
                  <div className="compare-symbol-name" style={{ color: chartColors[i % chartColors.length] }}>{s.symbol}</div>
                  <div className="compare-symbol-price">${fmt(last)}</div>
                  <div className={`compare-symbol-change ${change >= 0 ? "up" : "down"}`}>{pct(change)} ({period})</div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Navbar ─── */
function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">📈 Stock Toolkit</Link>
      <div className="navbar-links">
        <Link to="/">Dashboard</Link>
        <Link to="/compare">Compare</Link>
      </div>
    </nav>
  );
}

/* ─── App ─── */
export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/compare" element={<Compare />} />
      </Routes>
    </BrowserRouter>
  );
}
