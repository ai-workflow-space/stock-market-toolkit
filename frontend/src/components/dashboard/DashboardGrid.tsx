import type { StockData, Indicators, StockInfo } from "@/types";
import ChartCard from "@/components/common/ChartCard";
import PriceChart from "./PriceChart";
import RsiChart from "./RsiChart";
import MacdChart from "./MacdChart";
import StockInfoCard from "./StockInfoCard";
import HistoryTable from "./HistoryTable";
import WatchlistButton from "@/components/common/WatchlistButton";

export interface DashboardGridProps {
  stock: StockData;
  indicators: Indicators;
  info: StockInfo;
  active: Set<string>;
}

export default function DashboardGrid({ stock, indicators, info, active }: DashboardGridProps) {
  const dates = stock.timestamp.map((t) =>
    new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  );
  const showRsi = active.has("rsi");
  const showMacd = active.has("macd");

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12">
        <ChartCard title={`${stock.symbol} · ${stock.period.toUpperCase()}`} subtitle="Price" toolbar={<WatchlistButton symbol={stock.symbol} />}>
          <PriceChart data={stock} indicators={indicators} showBB={active.has("bb")} active={active} />
        </ChartCard>
      </div>

      {showRsi && (
        <div className="col-span-12 lg:col-span-6">
          <ChartCard title="RSI (14)">
            <RsiChart dates={dates} rsi={indicators.rsi} />
          </ChartCard>
        </div>
      )}

      {showMacd && (
        <div className="col-span-12 lg:col-span-6">
          <ChartCard title="MACD (12, 26, 9)">
            <MacdChart dates={dates} macd={indicators.macd} signal={indicators.macd_signal} hist={indicators.macd_hist} />
          </ChartCard>
        </div>
      )}

      <div className="col-span-12 lg:col-span-4">
        <StockInfoCard info={info} stock={stock} />
      </div>

      <div className="col-span-12 lg:col-span-8">
        <HistoryTable stock={stock} />
      </div>
    </div>
  );
}
