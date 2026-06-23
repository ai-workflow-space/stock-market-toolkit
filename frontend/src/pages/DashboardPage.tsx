import { useState, useEffect, useMemo, startTransition, lazy, Suspense } from "react";
import { LayoutGrid, List } from "lucide-react";
import { getStock, getIndicators, getStockInfo } from "@/api/stockApi";
import type { StockData, Indicators, StockInfo } from "@/types";
import { TIMEFRAMES } from "@/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleBar, MultiToggleBar } from "@/components/common/ToggleBar";
import SymbolSearch from "@/components/common/SymbolSearch";
import DashboardGrid from "@/components/dashboard/DashboardGrid";

const EditableGrid = lazy(() => import("@/components/dashboard/EditableGrid"));

const TIMEFRAME_OPTIONS = TIMEFRAMES.map((t) => ({ value: t.value, label: t.label }));
const INDICATOR_OPTIONS = [
  { value: "sma20", label: "SMA 20" },
  { value: "sma50", label: "SMA 50" },
  { value: "sma200", label: "SMA 200" },
  { value: "ema12", label: "EMA 12" },
  { value: "ema26", label: "EMA 26" },
  { value: "rsi", label: "RSI" },
  { value: "macd", label: "MACD" },
  { value: "bb", label: "Bollinger" },
];

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-4">
      <Skeleton className="col-span-12 h-[340px] rounded-xl" />
      <Skeleton className="col-span-12 h-[160px] rounded-xl lg:col-span-6" />
      <Skeleton className="col-span-12 h-[160px] rounded-xl lg:col-span-6" />
      <Skeleton className="col-span-12 h-[480px] rounded-xl lg:col-span-4" />
      <Skeleton className="col-span-12 h-[480px] rounded-xl lg:col-span-8" />
    </div>
  );
}

export default function DashboardPage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [period, setPeriod] = useState("1mo");
  const [stock, setStock] = useState<StockData | null>(null);
  const [indicators, setIndicators] = useState<Indicators | null>(null);
  const [info, setInfo] = useState<StockInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState<string[]>(["sma20", "rsi", "macd"]);
  const [editMode, setEditMode] = useState(false);

  // Fetch on symbol/period change. `loading` is raised in the change handlers
  // so this effect performs no synchronous setState (only after the await).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [st, ind, inf] = await Promise.all([
          getStock(symbol, period),
          getIndicators(symbol, period),
          getStockInfo(symbol),
        ]);
        if (cancelled) return;
        startTransition(() => {
          setStock(st);
          setIndicators(ind);
          setInfo(inf);
          setError("");
        });
      } catch (e: unknown) {
        if (cancelled) return;
        setError((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to load data");
        setStock(null);
        setIndicators(null);
        setInfo(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [symbol, period]);

  const onSymbol = (s: string) => { setLoading(true); setSymbol(s); };
  const onPeriod = (p: string) => { setLoading(true); setPeriod(p); };

  const activeSet = useMemo(() => new Set(active), [active]);
  const ready = Boolean(stock && indicators && info);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SymbolSearch value={symbol} onSearch={onSymbol} loading={loading} />
        <ToggleBar ariaLabel="Timeframe" options={TIMEFRAME_OPTIONS} value={period} onChange={onPeriod} />
        <Button
          variant={editMode ? "secondary" : "outline"}
          size="sm"
          className="ml-auto gap-2"
          onClick={() => setEditMode((v) => !v)}
        >
          {editMode ? <List /> : <LayoutGrid />}
          {editMode ? "Done" : "Edit layout"}
        </Button>
      </div>

      <MultiToggleBar ariaLabel="Indicators" options={INDICATOR_OPTIONS} value={active} onChange={setActive} />

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && !ready ? (
        <DashboardSkeleton />
      ) : ready && stock && indicators && info ? (
        editMode ? (
          <Suspense fallback={<DashboardSkeleton />}>
            <EditableGrid stock={stock} indicators={indicators} info={info} active={activeSet} />
          </Suspense>
        ) : (
          <DashboardGrid stock={stock} indicators={indicators} info={info} active={activeSet} />
        )
      ) : null}
    </div>
  );
}
