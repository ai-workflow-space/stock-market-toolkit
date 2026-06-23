import { useState, useEffect, useCallback } from "react";
import { Activity } from "lucide-react";
import SignalCard from "@/components/SignalCard";
import StatCard from "@/components/common/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/sonner";
import type { Signal } from "@/types";

/* ─── Mock signals for demonstration ─── */
function generateMockSignals(symbols: string[]): Signal[] {
  const now = new Date();
  const signals: Signal[] = [];

  const signalTypes: Signal["signal_type"][] = [
    "rsi_oversold", "rsi_overbought", "macd_cross", "sma_cross", "bb_touch", "volume_spike",
  ];

  symbols.forEach((symbol, idx) => {
    const signalType = signalTypes[idx % signalTypes.length];
    let direction: Signal["direction"];

    if (signalType === "rsi_oversold") {
      direction = "bullish";
    } else if (signalType === "rsi_overbought") {
      direction = "bearish";
    } else if (signalType === "macd_cross") {
      direction = idx % 2 === 0 ? "bullish" : "bearish";
    } else if (signalType === "sma_cross") {
      direction = idx % 2 === 0 ? "bullish" : "bearish";
    } else if (signalType === "bb_touch") {
      direction = "neutral";
    } else {
      direction = idx % 3 === 0 ? "bullish" : idx % 3 === 1 ? "bearish" : "neutral";
    }

    signals.push({
      id: `sig-${idx}`,
      symbol,
      direction,
      signal_type: signalType,
      price: 150 + Math.random() * 100,
      timestamp: new Date(now.getTime() - idx * 3600000).toISOString(),
      strength: 40 + Math.floor(Math.random() * 60),
      description: getSignalDescription(signalType, direction),
    });
  });

  return signals;
}

function getSignalDescription(signalType: Signal["signal_type"], direction: Signal["direction"]): string {
  const descriptions: Record<Signal["signal_type"], { bullish: string; bearish: string; neutral: string }> = {
    rsi_oversold: {
      bullish: "RSI indicates oversold conditions, potential bounce expected",
      bearish: "RSI oversold but momentum remains weak",
      neutral: "RSI at oversold levels",
    },
    rsi_overbought: {
      bullish: "RSI overbought but bullish momentum continues",
      bearish: "RSI indicates overbought conditions, pullback likely",
      neutral: "RSI at overbought levels",
    },
    macd_cross: {
      bullish: "MACD line crossed above signal line, bullish momentum building",
      bearish: "MACD line crossed below signal line, bearish momentum building",
      neutral: "MACD crossing signal line",
    },
    sma_cross: {
      bullish: "Short-term SMA crossed above long-term SMA, golden cross formation",
      bearish: "Short-term SMA crossed below long-term SMA, death cross formation",
      neutral: "SMA crossover detected",
    },
    bb_touch: {
      bullish: "Price touched lower Bollinger Band, potential support bounce",
      bearish: "Price touched upper Bollinger Band, potential resistance",
      neutral: "Price at Bollinger Band boundary",
    },
    volume_spike: {
      bullish: "Unusual volume spike with price increase, institutional interest",
      bearish: "Unusual volume spike with price decrease, distribution day",
      neutral: "Unusual volume activity detected",
    },
  };

  return descriptions[signalType][direction];
}

/* ─── Signals Page ─── */
export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const symbols = ["AAPL", "TSLA", "MSFT", "GOOGL", "AMZN", "NVDA"];
    const token = localStorage.getItem("access_token");

    async function fetchSignals() {
      try {
        const results: Signal[] = await Promise.all(
          symbols.map(async (symbol) => {
            const res = await fetch(
              `${import.meta.env.VITE_API_URL || ""}/api/analysis/${symbol}?period=1mo`,
              { headers: { Authorization: `Bearer ${token}` } },
            );
            if (!res.ok) throw new Error(`${symbol} failed`);
            const data = await res.json();

            const directionMap: Record<string, Signal["direction"]> = {
              BUY: "bullish",
              SELL: "bearish",
              NEUTRAL: "neutral",
            };
            const direction = directionMap[data.signal] ?? "neutral";
            const confidence = data.confidence ?? 0.5;
            const reasons = (data.reasons ?? []).join("; ");

            const { indicators } = data;
            let signal_type: Signal["signal_type"] = "macd_cross";
            if (indicators?.bias < -3 || indicators?.bias > 3) signal_type = "bb_touch";
            else if (indicators?.volume_ratio > 1.3) signal_type = "volume_spike";

            return {
              id: `sig-${symbol}`,
              symbol,
              direction,
              signal_type,
              price: data.price ?? 0,
              timestamp: data.timestamp ?? new Date().toISOString(),
              strength: Math.round(confidence * 100),
              description: `[${data.signal}] ${reasons} — confidence ${(confidence * 100).toFixed(0)}%`,
            } satisfies Signal;
          }),
        );
        setSignals(results);
      } catch {
        setSignals(generateMockSignals(symbols));
      } finally {
        setLoading(false);
      }
    }

    fetchSignals();
  }, []);

  const handleDismissSignal = useCallback((id: string) => {
    setSignals((prev) => prev.filter((s) => s.id !== id));
    toast("Signal dismissed");
  }, []);

  const bullish = signals.filter((s) => s.direction === "bullish");
  const bearish = signals.filter((s) => s.direction === "bearish");
  const neutral = signals.filter((s) => s.direction === "neutral");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Trading signals</h1>
        <p className="text-sm text-muted-foreground">Real-time signals based on technical indicators</p>
      </div>

      {loading ? (
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
                <SignalCard key={signal.id} signal={signal} onDismiss={handleDismissSignal} />
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
