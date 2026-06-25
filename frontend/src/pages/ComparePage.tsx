import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Plus, X, Download } from "lucide-react";
import { compareStocks, getIndicators, searchSymbols } from "@/api/stockApi";
import type { StockData, Indicators } from "@/types";
import { TIMEFRAMES } from "@/types";
import { buildSeries, buildNormalizedSeries, buildSmaSeries, performance, summary, type SmaKey } from "@/lib/compare";
import { fmt, pct } from "@/lib/format";
import { useChartTheme } from "@/hooks/useChartTheme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import ChartCard from "@/components/common/ChartCard";
import WatchlistButton from "@/components/common/WatchlistButton";
import StatCard from "@/components/common/StatCard";
import { ToggleBar, MultiToggleBar } from "@/components/common/ToggleBar";
import { cn } from "@/lib/utils";

type SearchResult = { symbol: string; name: string; exchange: string };

const SERIES_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];
const SERIES_DASH: (string | undefined)[] = [undefined, "6 3", "2 2", "8 4", "4 2 1 2"];
const TIMEFRAME_OPTIONS = TIMEFRAMES.map((t) => ({ value: t.value, label: t.label }));
const SMA_OPTIONS = [
  { value: "sma20", label: "SMA 20" },
  { value: "sma50", label: "SMA 50" },
  { value: "sma200", label: "SMA 200" },
];
const SMA_META: Record<SmaKey, { color: string; label: string; dash?: string }> = {
  sma20: { color: "#f59e0b", label: "SMA 20" },
  sma50: { color: "#10b981", label: "SMA 50" },
  sma200: { color: "#ef4444", label: "SMA 200", dash: "5 5" },
};

function TickerPicker({ onAdd, disabled }: { onAdd: (s: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQuery = useCallback((v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchSymbols(v.trim());
        setResults(data.slice(0, 8));
      } catch {
        setResults([]);
      }
    }, 300);
  }, []);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const add = (s: string) => { setOpen(false); setQuery(""); setResults([]); onAdd(s); };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={disabled}>
          <Plus /> Add ticker
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search ticker…" value={query} onValueChange={handleQuery} />
          <CommandList>
            {query.trim().length >= 2 && results.length === 0 && <CommandEmpty>No matches.</CommandEmpty>}
            {results.length > 0 && (
              <CommandGroup heading="Results">
                {results.map((r) => (
                  <CommandItem key={r.symbol} value={r.symbol} onSelect={() => add(r.symbol)}>
                    <span className="font-medium">{r.symbol}</span>
                    <span className="ml-2 truncate text-muted-foreground">{r.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {query.trim().length >= 1 && (
              <CommandGroup>
                <CommandItem value={`__raw_${query}`} onSelect={() => add(query.trim().toUpperCase())}>
                  <Plus /> Add “{query.trim().toUpperCase()}”
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function ComparePage() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [period, setPeriod] = useState("1mo");
  const [data, setData] = useState<StockData[] | null>(null);
  const [indicatorsData, setIndicatorsData] = useState<Record<string, Indicators>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeSMAs, setActiveSMAs] = useState<string[]>([]);
  const [showNormalized, setShowNormalized] = useState(false);
  const c = useChartTheme();

  const addTicker = (sym: string) => {
    setTickers((prev) => (prev.includes(sym) || prev.length >= 5 ? prev : [...prev, sym]));
  };
  const removeTicker = (sym: string) => setTickers((prev) => prev.filter((t) => t !== sym));

  const handleCompare = async () => {
    if (tickers.length < 2) { setError("Add at least 2 tickers"); return; }
    setError("");
    setLoading(true);
    setActiveSMAs([]);
    try {
      const result = await compareStocks(tickers, period);
      const stocks = result?.stocks ?? [];
      setData(stocks);
      if (stocks.length === 0) setError("No data returned for those tickers");
      const indResults: Record<string, Indicators> = {};
      await Promise.all(
        tickers.map(async (sym) => {
          try { indResults[sym] = await getIndicators(sym, period); } catch { /* ignore */ }
        }),
      );
      setIndicatorsData(indResults);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Compare failed");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!data?.length) return;
    const len = Math.max(...data.map((s) => s.close.length));
    const ts = data.reduce((a, s) => (s.timestamp.length > a.length ? s.timestamp : a), data[0].timestamp);
    const lines = [["Date", ...data.map((s) => s.symbol)].join(",")];
    for (let i = 0; i < len; i++) {
      const date = ts[i]
        ? new Date(ts[i]).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "";
      lines.push([date, ...data.map((s) => s.close[i] ?? "")].join(","));
    }
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `compare_${tickers.join("_")}_${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const priceData = data ? (showNormalized ? buildNormalizedSeries(data) : buildSeries(data)) : [];
  const perf = data ? performance(data, SERIES_COLORS) : [];
  const stats = perf.length ? summary(perf) : null;
  const smaKeys = activeSMAs.filter((k): k is SmaKey => k in SMA_META);
  const smaData = data && smaKeys.length ? buildSmaSeries(data, indicatorsData, smaKeys) : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2">
        <h1 className="text-2xl font-semibold">Compare</h1>
        <span className="text-sm text-muted-foreground">
          {tickers.length}/5 tickers{tickers.length < 2 ? " — add at least 2" : tickers.length >= 5 ? " — max" : ""}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tickers.map((sym, i) => (
          <Fragment key={sym}>
            <Badge variant="secondary" className="gap-1.5 py-1 pl-2 pr-1">
              <span className="size-2 rounded-full" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
              {sym}
              <button
                type="button"
                onClick={() => removeTicker(sym)}
                aria-label={`Remove ${sym}`}
                className="rounded-sm text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </Badge>
            <WatchlistButton symbol={sym} size="sm" />
          </Fragment>
        ))}
        <TickerPicker onAdd={addTicker} disabled={tickers.length >= 5} />
        <ToggleBar ariaLabel="Timeframe" options={TIMEFRAME_OPTIONS} value={period} onChange={setPeriod} />
        <Button size="sm" onClick={handleCompare} disabled={loading || tickers.length < 2}>
          {loading ? "Loading…" : "Compare"}
        </Button>
        {data && (
          <Button size="sm" variant="ghost" onClick={() => { setData(null); setTickers([]); }}>
            Reset
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {!data && (
        <p className="text-sm text-muted-foreground">Add 2–5 tickers, then press Compare.</p>
      )}

      {data && stats && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label={`Best · ${stats.best.symbol}`} value={pct(stats.best.pctChange)} tone={stats.best.pctChange >= 0 ? "up" : "down"} />
            <StatCard label={`Worst · ${stats.worst.symbol}`} value={pct(stats.worst.pctChange)} tone={stats.worst.pctChange >= 0 ? "up" : "down"} />
            <StatCard label="Average" value={pct(stats.avg)} tone={stats.avg >= 0 ? "up" : "down"} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <MultiToggleBar ariaLabel="SMA overlays" options={SMA_OPTIONS} value={activeSMAs} onChange={setActiveSMAs} />
            <Button size="sm" variant={showNormalized ? "secondary" : "outline"} onClick={() => setShowNormalized((v) => !v)}>
              Normalized
            </Button>
            <Button size="sm" variant="outline" className="ml-auto gap-2" onClick={exportCSV}>
              <Download /> Export CSV
            </Button>
          </div>

          <ChartCard title={showNormalized ? "Normalized price (base 100)" : "Price comparison"}>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={priceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                <XAxis dataKey="date" tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => (showNormalized ? `${(v as number).toFixed(0)}` : `$${(v as number).toFixed(0)}`)} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                        <div className="mb-0.5 text-muted-foreground">{String(label)}</div>
                        {payload.map((p, i) => (
                          <div key={i} className="font-mono tabular-nums" style={{ color: p.color }}>
                            {String(p.dataKey)}: {showNormalized ? (p.value as number).toFixed(2) : `$${fmt(p.value as number)}`}
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "0.8rem" }} />
                {data.map((s, i) => (
                  <Line key={s.symbol} type="monotone" dataKey={s.symbol} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeDasharray={SERIES_DASH[i % SERIES_DASH.length]} strokeWidth={2} dot={false} />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>

          {smaKeys.length > 0 && (
            <ChartCard title="SMA overlay">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={smaData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
                  <XAxis dataKey="date" tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v as number).toFixed(0)}`} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                          <div className="mb-0.5 text-muted-foreground">{String(label)}</div>
                          {payload.map((p, i) => (
                            <div key={i} className="font-mono tabular-nums" style={{ color: p.color }}>
                              {String(p.dataKey)}: ${fmt(p.value as number)}
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "0.8rem" }} />
                  {data.map((s, i) => (
                    <Line key={s.symbol} type="monotone" dataKey={s.symbol} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2} dot={false} />
                  ))}
                  {data.map((s) =>
                    smaKeys.map((key) => (
                      <Line
                        key={`${s.symbol}_${key}`}
                        type="monotone"
                        dataKey={`${s.symbol}_${key}`}
                        stroke={SMA_META[key].color}
                        strokeWidth={1.5}
                        strokeDasharray={SMA_META[key].dash}
                        dot={false}
                        name={`${s.symbol} ${SMA_META[key].label}`}
                      />
                    )),
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {data.map((s, i) => {
              const change = s.close[0] ? ((s.close[s.close.length - 1] - s.close[0]) / s.close[0]) * 100 : 0;
              return (
                <Card key={s.symbol} className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
                    <span className="font-medium">{s.symbol}</span>
                  </div>
                  <div className="mt-1 font-mono text-sm tabular-nums">${fmt(s.close[s.close.length - 1])}</div>
                  <div className={cn("font-mono text-xs tabular-nums", change >= 0 ? "text-up" : "text-down")}>{pct(change)}</div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
