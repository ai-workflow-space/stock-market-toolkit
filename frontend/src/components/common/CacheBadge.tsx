import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface CacheBadgeProps {
  expiresAt: string;
  className?: string;
}

export default function CacheBadge({ expiresAt, className }: CacheBadgeProps) {
  const { t } = useTranslation();
  const expiry = new Date(expiresAt);
  const now = new Date();
  const isExpired = now >= expiry;
  const remainingSec = Math.max(0, Math.floor((expiry.getTime() - now.getTime()) / 1000));

  const label = isExpired
    ? t("common.cache.expired")
    : remainingSec < 60
    ? t("common.cache.expiresInSeconds", { count: remainingSec })
    : t("common.cache.expiresInMinutes", { count: Math.floor(remainingSec / 60) });

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium font-mono tabular-nums",
        isExpired
          ? "bg-destructive/20 text-destructive"
          : remainingSec < 60
          ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
          : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        className,
      )}
    >
      <span className={cn("h-1 w-1 rounded-full", isExpired ? "bg-destructive" : remainingSec < 60 ? "bg-yellow-500" : "bg-emerald-500")} />
      {label}
    </span>
  );
}