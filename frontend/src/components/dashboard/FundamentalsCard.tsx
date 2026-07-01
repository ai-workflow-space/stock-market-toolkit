import { useTranslation } from "react-i18next";
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

function DividendQualityBadge({ score }: { score: number }) {
  const color =
    score >= 2 ? "text-green-500"
    : score === 1 ? "text-yellow-500"
    : "text-red-500";
  return <span className={cn("text-lg font-bold tabular-nums", color)}>{score}<span className="text-xs text-muted-foreground"> / 3</span></span>;
}

export default function FundamentalsCard({ data }: { data: Fundamentals }) {
  const { t } = useTranslation();
  const p = data.profitability;
  const rows: { label: string; value: string; tone?: "up" | "down" | "neutral" }[] = [
    { label: "ROE", value: p.roe != null ? pct(p.roe) : "—" },
    { label: "ROA", value: p.roa != null ? pct(p.roa) : "—" },
    { label: t("common.fields.grossMargin"), value: p.gross_margin != null ? pct(p.gross_margin) : "—" },
    { label: t("common.fields.operatingMargin"), value: p.op_margin != null ? pct(p.op_margin) : "—" },
    { label: t("common.fields.netMargin"), value: p.net_margin != null ? pct(p.net_margin) : "—" },
    {
      label: t("common.fields.epsGrowth"),
      value: p.eps_growth != null ? pct(p.eps_growth) : "—",
      tone: p.eps_growth != null ? (p.eps_growth >= 0 ? "up" : "down") : undefined,
    },
    {
      label: t("common.fields.revenueGrowth"),
      value: p.rev_growth != null ? pct(p.rev_growth) : "—",
      tone: p.rev_growth != null ? (p.rev_growth >= 0 ? "up" : "down") : undefined,
    },
  ];

  const dq = data.dividend_quality;
  const dqRows: { label: string; value: string; tone?: "up" | "down" | "neutral" }[] = [
    { label: t("common.fields.consistent"), value: dq.consistent ? t("common.values.yes") : t("common.values.no"), tone: dq.consistent ? "up" : "down" },
    {
      label: t("common.fields.growth"),
      value: dq.growth != null ? pct(dq.growth) : "—",
      tone: dq.growth != null ? (dq.growth >= 0 ? "up" : "down") : undefined,
    },
    {
      label: t("common.fields.payoutRatio"),
      value: dq.payout_ratio != null ? pct(dq.payout_ratio) : "—",
      tone: dq.payout_ratio != null ? (dq.payout_ratio < 0.6 ? "up" : "down") : undefined,
    },
  ];

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 px-4 pb-3 pt-4">
        <div className="min-w-0">
          <div className="text-sm font-medium">{t("common.cards.fundamentals")}</div>
          <div className="text-xs text-muted-foreground">{t("common.cards.piotroskiFScore")}</div>
        </div>
        <FScoreGauge score={data.f_score} />
      </CardHeader>
      <CardContent className="flex-1 space-y-4 px-4 pb-4 pt-0">
        <div className="grid grid-cols-2 gap-2">
          {rows.map((r) => (
            <StatCard key={r.label} label={r.label} value={r.value} tone={r.tone} />
          ))}
        </div>
        <div className="border-t pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t("common.cards.dividendQuality")}</span>
            <DividendQualityBadge score={dq.score} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {dqRows.map((r) => (
              <StatCard key={r.label} label={r.label} value={r.value} tone={r.tone} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
