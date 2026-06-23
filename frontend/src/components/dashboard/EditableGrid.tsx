import { useCallback, useMemo, useState } from "react";
import GridLayout, { type LayoutItem, useContainerWidth } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { defaultLayout, loadLayout, saveLayout } from "@/lib/dashboard-layout";
import ChartCard from "@/components/common/ChartCard";
import PriceChart from "./PriceChart";
import RsiChart from "./RsiChart";
import MacdChart from "./MacdChart";
import StockInfoCard from "./StockInfoCard";
import HistoryTable from "./HistoryTable";
import type { DashboardGridProps } from "./DashboardGrid";

export default function EditableGrid({ stock, indicators, info, active }: DashboardGridProps) {
  const { containerRef, width } = useContainerWidth();
  const dates = stock.timestamp.map((t) =>
    new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  );
  const [stored, setStored] = useState<LayoutItem[]>(() => loadLayout() ?? defaultLayout(active));

  const keys = useMemo(() => {
    const k = ["price"];
    if (active.has("rsi")) k.push("rsi");
    if (active.has("macd")) k.push("macd");
    k.push("info", "table");
    return k;
  }, [active]);

  // Reconcile stored positions with the currently-visible widgets, falling
  // back to default placement for any widget that has no stored entry yet.
  const layout = useMemo(() => {
    const base = defaultLayout(active);
    return keys
      .map((key) => stored.find((l) => l.i === key) ?? base.find((l) => l.i === key))
      .filter((l): l is LayoutItem => Boolean(l));
  }, [keys, stored, active]);

  const handleChange = useCallback((next: readonly LayoutItem[]) => {
    setStored(next as LayoutItem[]);
    saveLayout(next);
  }, []);

  return (
    <div ref={containerRef} className="w-full">
      <GridLayout
        layout={layout}
        width={width}
        gridConfig={{ cols: 12, rowHeight: 120, margin: [16, 16] as const }}
        dragConfig={{ enabled: true }}
        resizeConfig={{ enabled: true }}
        onLayoutChange={handleChange}
      >
        <div key="price" className="h-full overflow-hidden">
          <ChartCard className="h-full" title={`${stock.symbol} · ${stock.period.toUpperCase()}`} subtitle="Price">
            <PriceChart data={stock} indicators={indicators} showBB={active.has("bb")} active={active} />
          </ChartCard>
        </div>
        {active.has("rsi") && (
          <div key="rsi" className="h-full overflow-hidden">
            <ChartCard className="h-full" title="RSI (14)">
              <RsiChart dates={dates} rsi={indicators.rsi} />
            </ChartCard>
          </div>
        )}
        {active.has("macd") && (
          <div key="macd" className="h-full overflow-hidden">
            <ChartCard className="h-full" title="MACD (12, 26, 9)">
              <MacdChart dates={dates} macd={indicators.macd} signal={indicators.macd_signal} hist={indicators.macd_hist} />
            </ChartCard>
          </div>
        )}
        <div key="info" className="h-full overflow-auto">
          <StockInfoCard info={info} stock={stock} />
        </div>
        <div key="table" className="h-full overflow-auto">
          <HistoryTable stock={stock} />
        </div>
      </GridLayout>
    </div>
  );
}
