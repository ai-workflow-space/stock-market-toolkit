import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { fmt } from "@/lib/format";
import { useChartTheme } from "@/hooks/useChartTheme";

export default function RsiChart({ dates, rsi }: { dates: string[]; rsi: (number | null)[] }) {
  const c = useChartTheme();
  const rsiData = dates.map((date, i) => ({ date, rsi: rsi[i] }));
  return (
    <ResponsiveContainer width="100%" height={120}>
      <ComposedChart data={rsiData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
        <XAxis dataKey="date" tick={{ fill: c.axis, fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis domain={[0, 100]} tick={{ fill: c.axis, fontSize: 10 }} tickLine={false} axisLine={false} ticks={[30, 50, 70]} />
        <ReferenceLine y={70} stroke={c.down} strokeDasharray="3 3" strokeWidth={1} />
        <ReferenceLine y={30} stroke={c.up} strokeDasharray="3 3" strokeWidth={1} />
        <Tooltip
          content={({ active: isOpen, payload, label }) => {
            if (!isOpen || !payload?.length) return null;
            return (
              <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                <div className="mb-0.5 text-muted-foreground">{String(label)}</div>
                <div className="font-mono tabular-nums text-foreground">RSI: {fmt(payload[0]?.value as number)}</div>
              </div>
            );
          }}
        />
        <Line type="monotone" dataKey="rsi" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
