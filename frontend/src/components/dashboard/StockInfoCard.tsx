import type { StockData, StockInfo } from "@/types";
import { fmt, pct, volFmt, compactUsd } from "@/lib/format";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import StatCard, { type StatTone } from "@/components/common/StatCard";
import { cn } from "@/lib/utils";

export default function StockInfoCard({ info, stock }: { info: StockInfo; stock: StockData }) {
  const currentPrice = stock.close[stock.close.length - 1];
  const prevPrice = stock.close[stock.close.length - 2] || currentPrice;
  const priceChange = currentPrice - prevPrice;
  const priceChangePct = prevPrice ? (priceChange / prevPrice) * 100 : 0;
  const tone: StatTone = priceChange >= 0 ? "up" : "down";

  const highs = stock.high.filter((v): v is number => v != null);
  const lows = stock.low.filter((v): v is number => v != null);

  const stats: { label: string; value: string; tone?: StatTone }[] = [
    { label: "Current price", value: `$${fmt(currentPrice)}` },
    { label: "Day change", value: pct(priceChangePct), tone },
    { label: "Period high", value: highs.length ? `$${fmt(Math.max(...highs))}` : "—" },
    { label: "Period low", value: lows.length ? `$${fmt(Math.min(...lows))}` : "—" },
    { label: "Volume", value: volFmt(stock.volume[stock.volume.length - 1]) },
    { label: "Avg volume", value: volFmt(info.avg_volume) },
    { label: "Market cap", value: compactUsd(info.market_cap) },
    { label: "P/E ratio", value: info.trailing_pe != null ? fmt(info.trailing_pe) : "—" },
    { label: "Forward P/E", value: info.forward_pe != null ? fmt(info.forward_pe) : "—" },
    { label: "Dividend yield", value: info.dividend_yield != null ? `${(info.dividend_yield * 100).toFixed(2)}%` : "—" },
    { label: "Beta", value: info.beta != null ? fmt(info.beta) : "—" },
    { label: "52W high", value: info.week_52_high != null ? `$${fmt(info.week_52_high)}` : "—" },
    { label: "52W low", value: info.week_52_low != null ? `$${fmt(info.week_52_low)}` : "—" },
    { label: "Sector", value: info.sector || "—" },
    { label: "Industry", value: info.industry || "—" },
  ];

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 px-4 pb-3 pt-4">
        <div className="min-w-0">
          <div className="text-lg font-semibold">{info.symbol}</div>
          <div className="truncate text-xs text-muted-foreground">{info.long_name || info.short_name || info.symbol}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg font-semibold tabular-nums">${fmt(currentPrice)}</div>
          <div className={cn("font-mono text-xs tabular-nums", priceChange >= 0 ? "text-up" : "text-down")}>
            {priceChange >= 0 ? "▲" : "▼"} {fmt(Math.abs(priceChange))} ({pct(priceChangePct)})
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="grid grid-cols-2 gap-2">
          {stats.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} tone={s.tone} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
