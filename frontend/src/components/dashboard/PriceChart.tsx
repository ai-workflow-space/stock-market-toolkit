import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area } from "recharts";
import { useTranslation } from "react-i18next";
import type { StockData, Indicators } from "@/types";
import { fmt } from "@/lib/format";
import { useChartTheme } from "@/hooks/useChartTheme";

const SERIES = {
  price: "#3b82f6",
  sma20: "#f59e0b",
  sma50: "#10b981",
  sma200: "#ef4444",
  ema12: "#8b5cf6",
  ema26: "#ec4899",
  bb: "#6366f1",
};

export default function PriceChart({
  data,
  indicators,
  showBB,
  active,
}: {
  data: StockData;
  indicators: Indicators;
  showBB: boolean;
  active?: Set<string>;
}) {
  const { t } = useTranslation();
  const c = useChartTheme();
  const chartData = data.close.map((close, i) => ({
    date: new Date(data.timestamp[i]).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
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
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
        <XAxis dataKey="date" tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis domain={["auto", "auto"]} tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} />
        <Tooltip
          content={({ active: isOpen, payload, label }) => {
            if (!isOpen || !payload?.length) return null;
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
        {showBB && <Area dataKey="bb_upper" stroke={SERIES.bb} fill="none" strokeWidth={1} strokeDasharray="3 3" dot={false} name="BB Upper" />}
        {showBB && <Area dataKey="bb_middle" stroke={SERIES.bb} fill="none" strokeWidth={1} dot={false} name="BB Middle" />}
        {showBB && <Area dataKey="bb_lower" stroke={SERIES.bb} fill="rgba(99,102,241,0.1)" strokeWidth={1} strokeDasharray="3 3" dot={false} name="BB Lower" />}
        <Line type="monotone" dataKey="close" stroke={SERIES.price} strokeWidth={2} dot={false} name={t("common.charts.price")} />
        {active?.has("sma20") && <Line type="monotone" dataKey="sma20" stroke={SERIES.sma20} strokeWidth={1} dot={false} name="SMA 20" />}
        {active?.has("sma50") && <Line type="monotone" dataKey="sma50" stroke={SERIES.sma50} strokeWidth={1} dot={false} name="SMA 50" />}
        {active?.has("sma200") && <Line type="monotone" dataKey="sma200" stroke={SERIES.sma200} strokeWidth={1} dot={false} name="SMA 200" />}
        {active?.has("ema12") && <Line type="monotone" dataKey="ema12" stroke={SERIES.ema12} strokeWidth={1} dot={false} name="EMA 12" />}
        {active?.has("ema26") && <Line type="monotone" dataKey="ema26" stroke={SERIES.ema26} strokeWidth={1} dot={false} name="EMA 26" />}
        <Legend wrapperStyle={{ fontSize: "0.75rem" }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
