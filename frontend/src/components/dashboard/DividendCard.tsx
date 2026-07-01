import { useTranslation } from "react-i18next";
import type { DividendData } from "@/types";
import { fmt, pct } from "@/lib/format";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import StatCard from "@/components/common/StatCard";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function DividendCard({ data }: { data: DividendData }) {
  const { t } = useTranslation();

  const chartData = data.yearly.map((y) => ({
    name: String(y.year),
    dividend: y.total,
  }));

  const stats: { label: string; value: string }[] = [
    { label: t("common.fields.dividendYield"), value: data.yield_pct != null ? pct(data.yield_pct / 100) : "—" },
    { label: t("common.fields.payoutRatio"), value: data.payout_ratio != null ? pct(data.payout_ratio / 100) : "—" },
    { label: t("common.fields.streak"), value: data.streak > 0 ? t("common.fields.streakYears", { count: data.streak }) : "—" },
  ];

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 px-4 pb-2 pt-4">
        <div className="min-w-0">
          <div className="text-sm font-medium">{t("common.cards.dividends")}</div>
          <div className="text-xs text-muted-foreground">{t("common.cards.dividendsSubtitle")}</div>
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
            {t("common.cards.noDividendData")}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <StatCard key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
