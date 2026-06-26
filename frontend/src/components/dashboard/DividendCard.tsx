import type { DividendData, DividendEvent } from "@/types";
import { fmt, pct, fmtDate } from "@/lib/format";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import StatCard from "@/components/common/StatCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const HEALTH_LABEL: Record<string, { label: string; cls: string }> = {
  low: { label: "Low", cls: "text-blue-500" },
  healthy: { label: "Healthy", cls: "text-green-600" },
  high: { label: "High", cls: "text-orange-500" },
};

export default function DividendCard({ data }: { data: DividendData }) {
  const chartData = data.yearly.map((y) => ({
    name: String(y.year),
    dividend: y.total,
  }));

  const health = data.payout_health ? HEALTH_LABEL[data.payout_health] : null;

  const payoutValue = data.payout_ratio != null ? pct(data.payout_ratio / 100) : "—";

  const recent = data.events.slice(0, 10);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 px-4 pb-2 pt-4">
        <div className="min-w-0">
          <div className="text-sm font-medium">Dividends</div>
          <div className="text-xs text-muted-foreground">Yearly per share</div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-0">
        {chartData.length > 0 ? (
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={45} />
                <Tooltip
                  content={({ active: isOpen, payload, label }) => {
                    if (!isOpen || !payload?.length) return null;
                    return (
                      <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                        <div className="mb-0.5 text-muted-foreground">{label}</div>
                        <div className="font-mono tabular-nums text-foreground">
                          ${fmt(payload[0]?.value as number)}
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="dividend" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
            No dividend data available
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Dividend yield" value={data.yield_pct != null ? pct(data.yield_pct / 100) : "—"} />
          <div className="rounded-md bg-secondary/50 p-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Payout ratio</div>
            <div className="mt-1 flex items-center gap-1.5 font-mono text-sm font-medium tabular-nums text-foreground">
              <span>{payoutValue}</span>
              {health && <span className={`text-[11px] font-medium ${health.cls}`}>{health.label}</span>}
            </div>
          </div>
          <StatCard label="Streak" value={data.streak > 0 ? `${data.streak} yr` : "—"} />
        </div>
        {recent.length > 0 && (
          <div className="mt-1">
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">Recent dividends</div>
            <div className="max-h-36 space-y-0.5 overflow-y-auto">
              {recent.map((ev, i) => (
                <EventRow key={`${ev.date}-${ev.type}-${i}`} event={ev} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EventRow({ event }: { event: DividendEvent }) {
  const typeLabel = event.type === "stock" ? "stock" : null;
  return (
    <div className="flex items-center justify-between rounded px-2 py-1 text-xs hover:bg-secondary/50">
      <span className="text-muted-foreground">{fmtDate(event.date)}</span>
      <span className="flex items-center gap-1.5 font-mono tabular-nums">
        {typeLabel && (
          <span className="rounded bg-secondary/70 px-1 py-0.5 text-[10px] uppercase text-muted-foreground">
            {typeLabel}
          </span>
        )}
        <span>${fmt(event.amount)}</span>
      </span>
    </div>
  );
}
