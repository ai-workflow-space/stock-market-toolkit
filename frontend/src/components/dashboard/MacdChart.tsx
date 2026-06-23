import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fmt } from "@/lib/format";
import { useChartTheme } from "@/hooks/useChartTheme";

export default function MacdChart({
  dates,
  macd,
  signal,
  hist,
}: {
  dates: string[];
  macd: (number | null)[];
  signal: (number | null)[];
  hist: (number | null)[];
}) {
  const c = useChartTheme();
  const macdData = dates.map((date, i) => ({ date, macd: macd[i], signal: signal[i], hist: hist[i] }));
  return (
    <ResponsiveContainer width="100%" height={120}>
      <ComposedChart data={macdData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
        <XAxis dataKey="date" tick={{ fill: c.axis, fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fill: c.axis, fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip
          content={({ active: isOpen, payload, label }) => {
            if (!isOpen || !payload?.length) return null;
            return (
              <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                <div className="mb-0.5 text-muted-foreground">{String(label)}</div>
                {payload.map((p, i) => (
                  <div key={i} className="font-mono tabular-nums" style={{ color: p.color }}>
                    {String(p.dataKey)}: {fmt(p.value as number)}
                  </div>
                ))}
              </div>
            );
          }}
        />
        <Bar dataKey="hist" fill="#6366f1" opacity={0.5} name="Histogram" maxBarSize={6} />
        <Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="MACD" />
        <Line type="monotone" dataKey="signal" stroke="#f97316" strokeWidth={1.5} dot={false} name="Signal" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
