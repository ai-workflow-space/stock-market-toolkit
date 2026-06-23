import type { StockData } from "@/types";
import { fmt, volFmt } from "@/lib/format";
import ChartCard from "@/components/common/ChartCard";

export default function HistoryTable({ stock }: { stock: StockData }) {
  const rows = stock.close
    .map((_, i) => ({
      date: new Date(stock.timestamp[i]).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      open: stock.open[i],
      high: stock.high[i],
      low: stock.low[i],
      close: stock.close[i],
      volume: stock.volume[i],
    }))
    .reverse()
    .slice(0, 30);

  return (
    <ChartCard title="Historical data" subtitle={`${stock.symbol} · last ${rows.length} days`} bodyClassName="px-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 text-right font-medium">Open</th>
              <th className="px-4 py-2 text-right font-medium">High</th>
              <th className="px-4 py-2 text-right font-medium">Low</th>
              <th className="px-4 py-2 text-right font-medium">Close</th>
              <th className="px-4 py-2 text-right font-medium">Volume</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {rows.map((d, idx) => (
              <tr key={idx} className="border-b border-border/50 last:border-0 hover:bg-secondary/40">
                <td className="px-4 py-1.5 font-sans text-muted-foreground">{d.date}</td>
                <td className="px-4 py-1.5 text-right">${fmt(d.open)}</td>
                <td className="px-4 py-1.5 text-right">${fmt(d.high)}</td>
                <td className="px-4 py-1.5 text-right">${fmt(d.low)}</td>
                <td className="px-4 py-1.5 text-right font-medium text-primary">${fmt(d.close)}</td>
                <td className="px-4 py-1.5 text-right text-muted-foreground">{volFmt(d.volume)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
