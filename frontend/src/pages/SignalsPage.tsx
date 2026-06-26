import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Plus, Star, TrendingUp, BarChart3, Loader2 } from "lucide-react";
import SignalCard from "@/components/SignalCard";
import StatCard from "@/components/common/StatCard";
import SymbolSearch from "@/components/common/SymbolSearch";
import WatchlistButton from "@/components/common/WatchlistButton";
import { useWatchlist } from "@/hooks/useWatchlist";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import type { Signal } from "@/types";

type AnalysisResponse = {
  symbol?: string;
  signal?: string;
  confidence?: number;
  reasons?: string[];
  indicators?: { bias?: number; volume_ratio?: number };
  price?: number;
  timestamp?: string;
};

function mapAnalysisToSignal(data: AnalysisResponse, symbolOverride?: string): Signal {
  const sym = symbolOverride ?? data.symbol ?? "";
  const directionMap: Record<string, Signal["direction"]> = {
    BUY: "bullish",
    SELL: "bearish",
    NEUTRAL: "neutral",
  };
  const direction = directionMap[data.signal ?? ""] ?? "neutral";
  const confidence = data.confidence ?? 0.5;
  const reasons = (data.reasons ?? []).join("; ");
  const indicators = data.indicators;
  let signal_type: Signal["signal_type"] = "macd_cross";
  if ((indicators?.bias ?? 0) < -3 || (indicators?.bias ?? 0) > 3) signal_type = "bb_touch";
  else if ((indicators?.volume_ratio ?? 0) > 1.3) signal_type = "volume_spike";

  return {
    id: `sig-${sym}`,
    symbol: sym,
    direction,
    signal_type,
    price: data.price ?? 0,
    timestamp: data.timestamp ?? new Date().toISOString(),
    strength: Math.round(confidence * 100),
    description: `[${data.signal ?? "NEUTRAL"}] ${reasons} — confidence ${(confidence * 100).toFixed(0)}%`,
  } satisfies Signal;
}

/* ─── Signals Page ─── */
export default function SignalsPage() {
  const navigate = useNavigate();
  const {
    symbols: watchedSymbols,
    add: addToWatchlist,
    remove: removeFromWatchlist,
    isWatched,
    items,
    loading: watchlistLoading,
    error: watchlistError,
    refresh: refreshWatchlist,
  } = useWatchlist();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [addTickerOpen, setAddTickerOpen] = useState(false);
  const [newTicker, setNewTicker] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [tickerError, setTickerError] = useState("");
  const [addingTicker, setAddingTicker] = useState(false);
  const [viewMode, setViewMode] = useState<"signals" | "list">("signals");

  useEffect(() => {
    const symbols = watchedSymbols;
    if (symbols.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- false positive: early-return guard
      setSignals((prev) => (prev.length === 0 ? prev : []));
      setLoading(false);
      return;
    }
    const token = localStorage.getItem("access_token");

    async function fetchSignals() {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL || ""}/api/analysis/signals?symbols=${symbols.join(",")}&period=1mo`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) throw new Error("Failed to fetch signals");
        const data = (await res.json()) as AnalysisResponse[];
        const mapped = data.map((d) => mapAnalysisToSignal(d));
        setSignals(mapped);
        if (mapped.length < symbols.length) {
          toast(`Loaded ${mapped.length} of ${symbols.length} symbols`);
        }
      } catch {
        setSignals([]);
      } finally {
        setLoading(false);
      }
    }

    fetchSignals();
  }, [watchedSymbols]);

  const fetchSignalForTicker = useCallback(async (symbol: string): Promise<Signal> => {
    const token = localStorage.getItem("access_token");
    const res = await fetch(
      `${import.meta.env.VITE_API_URL || ""}/api/analysis/${symbol}?period=1mo`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(`${symbol} failed`);
    const data = (await res.json()) as AnalysisResponse;
    return {
      ...mapAnalysisToSignal(data, symbol),
      id: `sig-${symbol}-${Date.now()}`,
    };
  }, []);

  const handleAddTicker = async () => {
    const trimmed = (selectedSymbol || newTicker).trim().toUpperCase();
    if (!trimmed) {
      setTickerError("Select or enter a ticker symbol");
      return;
    }
    if (!/^[A-Z0-9]{1,10}(\.[A-Z]{1,2})?$/.test(trimmed)) {
      setTickerError("Invalid ticker symbol format");
      return;
    }
    if (isWatched(trimmed)) {
      setTickerError(`${trimmed} is already being tracked`);
      return;
    }

    setTickerError("");
    setAddingTicker(true);

    try {
      await addToWatchlist(trimmed);
      const signal = await fetchSignalForTicker(trimmed);
      setSignals((prev) => [...prev, signal]);
      setAddTickerOpen(false);
      setNewTicker("");
      setSelectedSymbol("");
      toast.success(`${trimmed} added to tracking`);
    } catch {
      toast.error(`Failed to add ${trimmed}. Please try again.`);
    } finally {
      setAddingTicker(false);
    }
  };

  const handleRemoveTicker = useCallback(async (symbol: string) => {
    await removeFromWatchlist(symbol);
    setSignals((prev) => prev.filter((s) => s.symbol !== symbol));
    toast(`${symbol} removed from tracking`);
  }, [removeFromWatchlist]);

  const handleDismissSignal = useCallback((id: string) => {
    setSignals((prev) => prev.filter((s) => s.id !== id));
    toast("Signal dismissed");
  }, []);

  const bullish = signals.filter((s) => s.direction === "bullish");
  const bearish = signals.filter((s) => s.direction === "bearish");
  const neutral = signals.filter((s) => s.direction === "neutral");

  const listViewContent = (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tracked Symbols</h2>
        <Button variant="outline" size="sm" onClick={refreshWatchlist} disabled={watchlistLoading}>
          {watchlistLoading ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      {watchlistError && <p className="mb-4 text-sm text-destructive">{watchlistError}</p>}

      {watchlistLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Star className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground">No tracked symbols</p>
            <p className="text-xs text-muted-foreground">
              Add tickers to start tracking them here
            </p>
            <Button variant="outline" size="sm" onClick={() => setAddTickerOpen(true)}>
              <Plus className="mr-1 size-4" />
              Add Ticker
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <WatchlistButton symbol={item.symbol} className="!text-yellow-500" />
                <span
                  className="flex-1 cursor-pointer font-bold text-base hover:underline"
                  onClick={() => navigate(`/?symbol=${item.symbol}`)}
                >
                  {item.symbol}
                </span>
                <span className="text-xs text-muted-foreground">
                  Added {new Date(item.created_at).toLocaleDateString()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/?symbol=${item.symbol}`)}
                >
                  <TrendingUp />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/compare?symbols=${item.symbol}`)}
                >
                  <BarChart3 />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Trading signals</h1>
          <p className="text-sm text-muted-foreground">Real-time signals based on technical indicators</p>
        </div>
        <Button onClick={() => setAddTickerOpen(true)} variant="outline" size="sm">
          <Plus className="size-4" />
          Add Ticker
        </Button>
      </div>

      <div className="flex items-center gap-1 self-start rounded-lg border bg-muted p-1">
        <button
          type="button"
          onClick={() => setViewMode("signals")}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            viewMode === "signals"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Signals
        </button>
        <button
          type="button"
          onClick={() => setViewMode("list")}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            viewMode === "list"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Tracked
        </button>
      </div>

      <Dialog open={addTickerOpen} onOpenChange={setAddTickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Ticker</DialogTitle>
            <DialogDescription>
              Enter a stock symbol to add to your tracking list.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <SymbolSearch
              value={selectedSymbol}
              onSearch={(sym) => {
                setSelectedSymbol(sym);
                setNewTicker(sym);
                setTickerError("");
              }}
            />
            {tickerError && (
              <p className="mt-2 text-sm text-destructive">{tickerError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTickerOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTicker} disabled={addingTicker}>
              {addingTicker ? "Adding..." : "Add Ticker"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {viewMode === "list" ? listViewContent : loading ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Skeleton className="h-[76px] rounded-xl" />
            <Skeleton className="h-[76px] rounded-xl" />
            <Skeleton className="h-[76px] rounded-xl" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[180px] rounded-xl" />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Bullish signals" value={String(bullish.length)} tone="up" />
            <StatCard label="Bearish signals" value={String(bearish.length)} tone="down" />
            <StatCard label="Neutral signals" value={String(neutral.length)} tone="neutral" />
          </div>

          {signals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                <Activity className="size-8 text-muted-foreground" />
                <p className="text-muted-foreground">No signals available</p>
                <p className="text-sm text-muted-foreground">
                  Signals will appear here when technical indicators trigger alerts
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {signals.map((signal) => (
                <SignalCard key={signal.id} signal={signal} onDismiss={handleDismissSignal} onRemoveTicker={handleRemoveTicker} />
              ))}
            </div>
          )}

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="m-0 text-xs text-muted-foreground">
              <strong>Disclaimer:</strong> These signals are generated by technical indicators and should not be
              considered financial advice. Always do your own research before making investment decisions.
            </p>
          </div>
        </>
      )}
    </div>
  );
}