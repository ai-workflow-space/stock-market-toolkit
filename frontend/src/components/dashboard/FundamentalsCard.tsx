import type { Fundamentals } from "@/types";
import { pct } from "@/lib/format";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import StatCard from "@/components/common/StatCard";
import { cn } from "@/lib/utils";

function FScoreGauge({ score }: { score: number }) {
  const segments = Array.from({ length: 9 }, (_, i) => i + 1);
  const color =
    score >= 8 ? "bg-green-500"
    : score >= 5 ? "bg-yellow-500"
    : "bg-red-500";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-baseline gap-1">
        <span className={cn("text-3xl font-bold tabular-nums", color.replace("bg-", "text-"))}>{score}</span>
        <span className="text-xs text-muted-foreground">/ 9</span>
      </div>
      <div className="flex gap-1">
        {segments.map((s) => (
          <div
            key={s}
            className={cn(
              "h-2 w-2.5 rounded-sm",
              s <= score ? color : "bg-muted",
            )}
          />
        ))}
      </div>
    </div>
  );
}

export default function FundamentalsCard({ data }: { data: Fundamentals }) {
  const rows: { label: string; value: string; tone?: "up" | "down" | "neutral" }[] = [
    { label: "ROE", value: data.roe != null ? pct(data.roe / 100) : "—" },
    { label: "ROA", value: data.roa != null ? pct(data.roa / 100) : "—" },
    { label: "Gross margin", value: data.gross_margin != null ? pct(data.gross_margin / 100) : "—" },
    { label: "Operating margin", value: data.op_margin != null ? pct(data.op_margin / 100) : "—" },
    { label: "Net margin", value: data.net_margin != null ? pct(data.net_margin / 100) : "—" },
    {
      label: "EPS growth",
      value: data.eps_growth != null ? pct(data.eps_growth / 100) : "—",
      tone: data.eps_growth != null ? (data.eps_growth >= 0 ? "up" : "down") : undefined,
    },
    {
      label: "Revenue growth",
      value: data.rev_growth != null ? pct(data.rev_growth / 100) : "—",
      tone: data.rev_growth != null ? (data.rev_growth >= 0 ? "up" : "down") : undefined,
    },
  ];

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 px-4 pb-3 pt-4">
        <div className="min-w-0">
          <div className="text-sm font-medium">Fundamentals</div>
          <div className="text-xs text-muted-foreground">Piotroski F-Score</div>
        </div>
        <FScoreGauge score={data.f_score} />
      </CardHeader>
      <CardContent className="flex-1 px-4 pb-4 pt-0">
        <div className="grid grid-cols-2 gap-2">
          {rows.map((r) => (
            <StatCard key={r.label} label={r.label} value={r.value} tone={r.tone} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
