import { cn } from "@/lib/utils";

export type StatTone = "up" | "down" | "neutral";

export default function StatCard({
  label,
  value,
  delta,
  tone = "neutral",
  className,
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: StatTone;
  className?: string;
}) {
  const toneCls = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-foreground";
  return (
    <div className={cn("rounded-md bg-secondary/50 p-3", className)}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-mono text-sm font-medium tabular-nums", toneCls)}>{value}</div>
      {delta && <div className={cn("mt-0.5 font-mono text-xs tabular-nums", toneCls)}>{delta}</div>}
    </div>
  );
}
