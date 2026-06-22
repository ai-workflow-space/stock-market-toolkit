import { useState, useEffect, useCallback, useRef, startTransition } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, Area } from "recharts";
import { getStock, getIndicators, getStockInfo, compareStocks, searchSymbols } from "./api/stockApi";
import type { StockData, Indicators, StockInfo } from "./types";
import { TIMEFRAMES } from "./types";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./hooks/useAuth";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AlertsPage from "./pages/AlertsPage";
import "./index.css";

/* ─── helpers ─── */
const fmt = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number | null | undefined) =>
  n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
const volFmt = (n: number | null | undefined) =>
  n == null ? "—" : n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : `${(n / 1e3).toFixed(0)}K`;

/* ─── Protected Route ─── */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

/* ─── Navbar ─── */
function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <nav className="navbar">
      <Link to="/" className="nav-logo">Stock Toolkit</Link>
      <div className="nav-links">
        <Link to="/" className="nav-link">Dashboard</Link>
        <Link to="/compare" className="nav-link">Compare</Link>
        <Link to="/alerts" className="nav-link">Alerts</Link>
        {user && (
          <div className="nav-user">
            <span className="nav-username">{user.username}</span>
            <button className="nav-logout" onClick={() => { logout(); navigate("/login"); }}>Logout</button>
          </div>
        )}
      </div>
    </nav>
  );
}

/* ─── SearchBar ─── */
type SearchResult = { symbol: string; name: string; exchange: string };

function SearchBar({ onSearch, loading }: { onSearch: (s: string) => void; loading: boolean }) {
  const [val, setVal] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Track when debounce is pending to prevent click-outside race
  const expectingShowRef = useRef(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Don't close if we're waiting for search results to show dropdown
      if (expectingShowRef.current) return;
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setVal(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 3) { setResults([]); setShowDropdown(false); expectingShowRef.current = false; return; }
    debounceRef.current = setTimeout(async () => {
      expectingShowRef.current = true;
      setSearching(true);
      try {
        const data = await searchSymbols(v.trim());
        setResults(data.slice(0, 8));
        setShowDropdown(true);
      } catch { setResults([]); }
      finally { setSearching(false); expectingShowRef.current = false; }
    }, 300);
  };

  const selectResult = (r: SearchResult) => {
    setVal(r.symbol);
    setShowDropdown(false);
    setResults([]);
    onSearch(r.symbol);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const s = val.trim().toUpperCase();
    if (!s) return;
    setShowDropdown(false);
    onSearch(s);
  };

  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "2rem" }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem", flex: 1, maxWidth: 480, position: "relative" }}>
        <div className="search-container" style={{ flex: 1 }} ref={containerRef}>
          <span className="search-icon"></span>
          <input
            className="search-input"
            placeholder="Search ticker… AAPL, TSLA, 0050"
            value={val}
            onChange={handleInput}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            autoComplete="off"
          />
          {showDropdown && results.length > 0 && (
            <div className="search-dropdown">
              {results.map(r => (
                <button
                  key={r.symbol}
                  type="button"
                  className="search-dropdown-item"
                  onClick={() => selectResult(r)}
                >
                  <span className="dropdown-symbol">{r.symbol}</span>
                  <span className="dropdown-name">{r.name}</span>
                  {r.exchange && <span className="dropdown-exchange">{r.exchange}</span>}
                </button>
              ))}
            </div>
          )}
          {showDropdown && searching && (
            <div className="search-dropdown">
              <div className="search-dropdown-item searching">Searching…</div>
            </div>
          )}
        </div>
        <button className="search-btn" type="submit" disabled={loading}>{loading ? "Loading…" : "Analyze"}</button>
      </form>
      <Link to="/compare" style={{ color: "#64748b", fontSize: "0.85rem", fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap" }}>+ Compare</Link>
    </div>
  );
}

/* ─── TimeframeSelector ─── */
function TimeframeSelector({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  return (
    <div className="timeframe-bar">
      {TIMEFRAMES.map(tf => (
        <button key={tf.value} className={`tf-btn ${value === tf.value ? "active" : ""}`} onClick={() => onChange(tf.value)}>
          {tf.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Indicator Toggles ─── */
function IndicatorToggles({ active, onToggle }: { active: Set<string>; onToggle: (k: string) => void }) {
  const indicators = [
    { key: "sma20", label: "SMA 20" }, { key: "sma50", label: "SMA 50" }, { key: "sma200", label: "SMA 200" },
    { key: "ema12", label: "EMA 12" }, { key: "ema26", label: "EMA 26" },
    { key: "rsi", label: "RSI" }, { key: "macd", label: "MACD" },
    { key: "bb", label: "Bollinger" }, { key: "atr", label: "ATR" },
  ];
  return (
    <div className="indicator-bar">
      {indicators.map(({ key, label }) => (
        <button key={key} className={`ind-btn ${active.has(key) ? "active" : ""}`} onClick={() => onToggle(key)}>
          {label}
        </button>
      ))}
    </div>
  );
}

/* ─── PriceChart ─── */
type ChartData = { date: string; close: number; sma20?: number | null; sma50?: number | null; sma200?: number | null; ema12?: number | null; ema26?: number | null; bb_upper?: number | null; bb_middle?: number | null; bb_lower?: number | null; };

function PriceChart({ data, indicators, showBB }: { data: StockData; indicators: Indicators; showBB: boolean }) {
  const chartData: ChartData[] = data.close.map((close, i) => ({
    date: new Date(data.timestamp[i]).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    close: close ?? 0,
    sma20: indicators.sma20[i],
    sma50: indicators.sma50[i],
    sma200: indicators.sma200[i],
    ema12: indicators.ema12[i],
    ema26: indicators.ema26[i],
    bb_upper: showBB ? indicators.bb_upper[i] : undefined,
    bb_middle: showBB ? indicators.bb_middle[i] : undefined,
    bb_lower: showBB ? indicators.bb_lower[i] : undefined,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis yAxisId="price" domain={["auto", "auto"]} tick={{ fill: "#475569", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v.toFixed(0)}`} />
        <Tooltip content={({ active, payload, label }) => {
          if (!active || !payload?.length) return null;
          return <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, padding: "0.5rem 0.75rem", fontSize: "0.8rem" }}>
            <div style={{ color: "#94a3b8" }}>{String(label)}</div>
            {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{String(p.dataKey)}: ${fmt(p.value as number)}</div>)}
          </div>;
        }} />
        {showBB && <Area yAxisId="price" dataKey="bb_upper" stroke="#6366f1" fill="none" strokeWidth={1} strokeDasharray="3 3" dot={false} name="BB Upper" />}
        {showBB && <Area yAxisId="price" dataKey="bb_middle" stroke="#6366f1" fill="none" strokeWidth={1} dot={false} name="BB Middle" />}
        {showBB && <Area yAxisId="price" dataKey="bb_lower" stroke="#6366f1" fill="rgba(99,102,241,0.1)" strokeWidth={1} strokeDasharray="3 3" dot={false} name="BB Lower" />}
        <Line yAxisId="price" type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2} dot={false} name="Price" />
        <Line yAxisId="price" type="monotone" dataKey="sma20" stroke="#f59e0b" strokeWidth={1} dot={false} name="SMA 20" />
        <Line yAxisId="price" type="monotone" dataKey="sma50" stroke="#10b981" strokeWidth={1} dot={false} name="SMA 50" />
        <Line yAxisId="price" type="monotone" dataKey="sma200" stroke="#ef4444" strokeWidth={1} dot={false} name="SMA 200" />
        <Line yAxisId="price" type="monotone" dataKey="ema12" stroke="#8b5cf6" strokeWidth={1} dot={false} name="EMA 12" />
        <Line yAxisId="price" type="monotone" dataKey="ema26" stroke="#ec4899" strokeWidth={1} dot={false} name="EMA 26" />
        <Legend wrapperStyle={{ fontSize: "0.75rem", color: "#94a3b8" }} />
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
            <div style={{ color: "#94a3b8" }}>{String(label)}</div>
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
  const macdData = data.map((d, i) => ({ date: d.date, macd: macd[i], signal: signal[i], hist: hist[i] }));
  return (
    <ResponsiveContainer width="100%" height={120}>
      <ComposedChart data={macdData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
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
function StockInfoCard({ info, stock }: { info: StockInfo; stock: StockData }) {
  const currentPrice = stock.close[stock.close.length - 1];
  const prevPrice = stock.close[stock.close.length - 2] || currentPrice;
  const priceChange = currentPrice - prevPrice;
  const priceChangePct = prevPrice ? (priceChange / prevPrice) * 100 : 0;

  const items = [
    { label: "Current Price", value: `$${fmt(currentPrice)}` },
    { label: "Day Change", value: `${pct(priceChangePct)}`, color: priceChange >= 0 ? "#22c55e" : "#ef4444" },
    { label: "Day High", value: `$${fmt(Math.max(...(stock.high.filter((v): v is number => v != null) as number[])))}` },
    { label: "Day Low", value: `$${fmt(Math.min(...(stock.low.filter((v): v is number => v != null) as number[])))}` },
    { label: "Volume", value: volFmt(stock.volume[stock.volume.length - 1]) },
    { label: "Avg Volume", value: volFmt(info.avg_volume) },
    { label: "Market Cap", value: info.market_cap ? (info.market_cap >= 1e12 ? `$${(info.market_cap / 1e12).toFixed(2)}T` : `$${(info.market_cap / 1e9).toFixed(2)}B`) : "—" },
    { label: "P/E Ratio", value: info.trailing_pe ? fmt(info.trailing_pe) : "—" },
    { label: "Forward P/E", value: info.forward_pe ? fmt(info.forward_pe) : "—" },
    { label: "Dividend Yield", value: info.dividend_yield ? `${(info.dividend_yield * 100).toFixed(2)}%` : "—" },
    { label: "Beta", value: info.beta ? fmt(info.beta) : "—" },
    { label: "52W High", value: info.week_52_high ? `$${fmt(info.week_52_high)}` : "—" },
    { label: "52W Low", value: info.week_52_low ? `$${fmt(info.week_52_low)}` : "—" },
    { label: "Sector", value: info.sector || "—" },
    { label: "Industry", value: info.industry || "—" },
  ];

  return (
    <div className="info-card">
      <div className="info-header">
        <div>
          <div className="info-symbol">{info.symbol}</div>
          <div className="info-name">{info.long_name || info.short_name || info.symbol}</div>
        </div>
        <div className="info-price-block">
          <div className="info-price">${fmt(currentPrice)}</div>
          <div className="info-change" style={{ color: priceChange >= 0 ? "#22c55e" : "#ef4444" }}>
            {priceChange >= 0 ? "▲" : "▼"} {fmt(Math.abs(priceChange))} ({pct(priceChangePct)})
          </div>
        </div>
      </div>
      <div className="info-grid">
        {items.map(item => (
          <div key={item.label} className="info-item">
            <div className="info-label">{item.label}</div>
            <div className="info-value" style={{ color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Data Table ─── */
function DataTable({ stock }: { stock: StockData }) {
  const rows = stock.close.map((_, i) => ({
    date: new Date(stock.timestamp[i]).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    open: stock.open[i], high: stock.high[i], low: stock.low[i], close: stock.close[i], volume: stock.volume[i],
  })).reverse();

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th><th>Open</th><th>High</th><th>Low</th><th>Close</th><th>Volume</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 30).map((d, idx) => (
            <tr key={idx}>
              <td style={{ padding: "0.5rem 0.75rem", color: "#64748b" }}>{d.date}</td>
              <td style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>${fmt(d.open)}</td>
              <td style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>${fmt(d.high)}</td>
              <td style={{ padding: "0.5rem 0.75rem", textAlign: "right" }}>${fmt(d.low)}</td>
              <td style={{ padding: "0.5rem 0.75rem", textAlign: "right", color: "#3b82f6", fontWeight: 600 }}>${fmt(d.close)}</td>
              <td style={{ padding: "0.5rem 0.75rem", textAlign: "right", color: "#64748b" }}>{volFmt(d.volume)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Dashboard ─── */
function Dashboard() {
  const [symbol, setSymbol] = useState("AAPL");
  const [period, setPeriod] = useState("1mo");
  const [stock, setStock] = useState<StockData | null>(null);
  const [indicators, setIndicators] = useState<Indicators | null>(null);
  const [info, setInfo] = useState<StockInfo | null>(null);
  const [loading] = useState(false);
  const [error, setError] = useState("");
  const [activeInds, setActiveInds] = useState<Set<string>>(new Set(["sma20", "rsi", "macd"]));

  const toggleInd = useCallback((key: string) => {
    setActiveInds(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const load = useCallback(async (sym: string) => {
    setError("");
    try {
      const [st, ind, inf] = await Promise.all([
        getStock(sym, period),
        getIndicators(sym, period),
        getStockInfo(sym),
      ]);
      startTransition(() => {
        setStock(st);
        setIndicators(ind);
        setInfo(inf);
      });
    } catch (e: unknown) {
      setError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to load data");
      setStock(null);
    }
  }, [period]);

  useEffect(() => {
    startTransition(() => { load(symbol); });
  }, [symbol, period, load]);

  const chartData: ChartData[] = stock ? stock.close.map((close, i) => ({
    date: new Date(stock.timestamp[i]).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    close: close ?? 0,
    sma20: indicators?.sma20[i],
    sma50: indicators?.sma50[i],
    sma200: indicators?.sma200[i],
    ema12: indicators?.ema12[i],
    ema26: indicators?.ema26[i],
    bb_upper: indicators?.bb_upper[i],
    bb_middle: indicators?.bb_middle[i],
    bb_lower: indicators?.bb_lower[i],
  })) : [];

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <SearchBar onSearch={setSymbol} loading={loading} />
          <TimeframeSelector value={period} onChange={setPeriod} />
          {indicators && <IndicatorToggles active={activeInds} onToggle={toggleInd} />}
        </div>

        {error && <div className="error-banner">{error}</div>}

        {stock && indicators && info && (
          <div className="charts-grid">
            <div className="card">
              <div className="card-title">{stock.symbol} — {period.toUpperCase()}</div>
              <PriceChart data={stock} indicators={indicators} showBB={activeInds.has("bb")} />
            </div>

            <div className="card">
              <div className="card-title">RSI (14)</div>
              <RSIChart data={chartData} rsi={indicators.rsi} />
            </div>

            <div className="card">
              <div className="card-title">MACD (12, 26, 9)</div>
              <MACDChart data={chartData} macd={indicators.macd} signal={indicators.macd_signal} hist={indicators.macd_hist} />
            </div>

            <StockInfoCard info={info} stock={stock} />
            <DataTable stock={stock} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Compare Page ─── */
function ComparePage() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [tickerInput, setTickerInput] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [period, setPeriod] = useState("1mo");
  const [data, setData] = useState<StockData[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const tickerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickerContainerRef = useRef<HTMLDivElement>(null);
  const expectingShowRef = useRef(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (expectingShowRef.current) return;
      if (tickerContainerRef.current && !tickerContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleTickerInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setTickerInput(v);
    if (tickerDebounceRef.current) clearTimeout(tickerDebounceRef.current);
    if (v.trim().length < 3) { setResults([]); setShowDropdown(false); expectingShowRef.current = false; return; }
    tickerDebounceRef.current = setTimeout(async () => {
      expectingShowRef.current = true;
      setSearching(true);
      try {
        const data = await searchSymbols(v.trim());
        setResults(data.slice(0, 8));
        setShowDropdown(true);
      } catch { setResults([]); }
      finally { setSearching(false); expectingShowRef.current = false; }
    }, 300);
  };

  const addTicker = (r: SearchResult) => {
    if (tickers.includes(r.symbol)) return;
    if (tickers.length >= 5) return;
    setTickers([...tickers, r.symbol]);
    setTickerInput("");
    setResults([]);
    setShowDropdown(false);
  };

  const removeTicker = (sym: string) => {
    setTickers(tickers.filter(t => t !== sym));
  };

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tickers.length < 2) { setError("Add at least 2 tickers"); return; }
    if (tickers.length > 5) { setError("Max 5 tickers"); return; }
    setError("");
    setLoading(true);
    try {
      const result = await compareStocks(tickers, period);
      setData(result.stocks);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Compare failed");
    } finally {
      setLoading(false);
    }
  };

  const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

  if (data) {
    // Build unified chart data
    const maxLen = Math.max(...data.map((s) => s.close.length));
    const chartData: Record<string, string | number>[] = Array.from({ length: maxLen }, (_, i) => {
      const row: Record<string, string | number> = { date: "" };
      data.forEach((s) => {
        row[s.symbol] = s.close[i];
        if (i === 0) row.date = new Date(s.timestamp[i]).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      });
      return row;
    });

    return (
      <div className="page">
        <div className="container">
          <h2 style={{ color: "#e2e8f0", marginBottom: "1.5rem" }}>Compare Stocks</h2>
          <form onSubmit={handle} style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", position: "relative" }} ref={tickerContainerRef}>
              {tickers.map(sym => (
                <span key={sym} className="compare-ticker-tag">
                  {sym}
                  <button type="button" onClick={() => removeTicker(sym)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: "0 0 0 4px", fontSize: "0.75rem" }}>×</button>
                </span>
              ))}
              {tickers.length < 5 && (
                <div style={{ position: "relative" }}>
                  <input
                    className="search-input"
                    style={{ maxWidth: 160 }}
                    value={tickerInput}
                    onChange={handleTickerInput}
                    onFocus={() => results.length > 0 && setShowDropdown(true)}
                    placeholder="Add ticker…"
                    autoComplete="off"
                  />
                  {showDropdown && results.length > 0 && (
                    <div className="search-dropdown">
                      {results.map(r => (
                        <button
                          key={r.symbol}
                          type="button"
                          className="search-dropdown-item"
                          onClick={() => addTicker(r)}
                        >
                          <span className="dropdown-symbol">{r.symbol}</span>
                          <span className="dropdown-name">{r.name}</span>
                          {r.exchange && <span className="dropdown-exchange">{r.exchange}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {showDropdown && searching && (
                    <div className="search-dropdown">
                      <div className="search-dropdown-item searching">Searching…</div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <TimeframeSelector value={period} onChange={setPeriod} />
            <button className="search-btn" type="submit" disabled={loading || tickers.length < 2}>{loading ? "Loading…" : "Compare"}</button>
            <button className="search-btn" style={{ background: "#334155" }} type="button" onClick={() => { setData(null); setTickers([]); }}>Edit</button>
          </form>

          <div className="card">
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#475569", fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v.toFixed(0)}`} />
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
                {data.map((s, i: number) => (
                  <Line key={s.symbol} type="monotone" dataKey={s.symbol} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="compare-table">
            {data.map((s, i: number) => (
              <div key={s.symbol} className="compare-stock-card">
                <div className="compare-symbol" style={{ color: colors[i % colors.length] }}>{s.symbol}</div>
                <div className="compare-price">${fmt(s.close[s.close.length - 1])}</div>
                <div className="compare-change">{pct(((s.close[s.close.length - 1] - s.close[0]) / s.close[0]) * 100)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <h2 style={{ color: "#e2e8f0", marginBottom: "1.5rem" }}>Compare Stocks</h2>
        <form onSubmit={handle}>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center", position: "relative" }} ref={tickerContainerRef}>
            {tickers.map(sym => (
              <span key={sym} className="compare-ticker-tag">
                {sym}
                <button type="button" onClick={() => removeTicker(sym)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: "0 0 0 4px", fontSize: "0.75rem" }}>×</button>
              </span>
            ))}
            {tickers.length < 5 && (
              <div style={{ position: "relative" }}>
                <input
                  className="search-input"
                  style={{ maxWidth: 160 }}
                  value={tickerInput}
                  onChange={handleTickerInput}
                  onFocus={() => results.length > 0 && setShowDropdown(true)}
                  placeholder="Add ticker…"
                  autoComplete="off"
                />
                {showDropdown && results.length > 0 && (
                  <div className="search-dropdown">
                    {results.map(r => (
                      <button
                        key={r.symbol}
                        type="button"
                        className="search-dropdown-item"
                        onClick={() => addTicker(r)}
                      >
                        <span className="dropdown-symbol">{r.symbol}</span>
                        <span className="dropdown-name">{r.name}</span>
                        {r.exchange && <span className="dropdown-exchange">{r.exchange}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {showDropdown && searching && (
                  <div className="search-dropdown">
                    <div className="search-dropdown-item searching">Searching…</div>
                  </div>
                )}
              </div>
            )}
            <TimeframeSelector value={period} onChange={setPeriod} />
            <button className="search-btn" type="submit" disabled={loading || tickers.length < 2}>{loading ? "Loading…" : "Compare"}</button>
          </div>
        </form>
        {error && <div className="error-banner">{error}</div>}
        <div style={{ color: "#475569", fontSize: "0.9rem", marginTop: "1rem" }}>Add 2–5 tickers to compare</div>
      </div>
    </div>
  );
}

/* ─── Footer ─── */
function Footer() {
  const sha = import.meta.env.VITE_GIT_SHA as string || 'local';
  const buildTime = import.meta.env.VITE_BUILD_TIME as string || '';
  return (
    <footer className="app-footer">
      <span>v1.0.0</span>
      {sha && <span className="footer-sha">@{sha}</span>}
      {buildTime && <span className="footer-time">built {buildTime}</span>}
    </footer>
  );
}

/* ─── Main App ─── */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<ProtectedRoute><><Navbar /><Dashboard /><Footer /></></ProtectedRoute>} />
          <Route path="/compare" element={<ProtectedRoute><><Navbar /><ComparePage /><Footer /></></ProtectedRoute>} />
          <Route path="/alerts" element={<ProtectedRoute><><Navbar /><AlertsPage /><Footer /></></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
