import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export default function WatchlistButton({
  symbol,
  size,
  className,
}: {
  symbol: string;
  size?: "default" | "sm" | "icon";
  className?: string;
}) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { isWatched, add, remove } = useWatchlist();
  const watched = isWatched(symbol);

  if (!isAuthenticated) return null;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (watched) {
        await remove(symbol);
      } else {
        await add(symbol);
      }
    } catch {
      // silent
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size={size || "icon"}
          onClick={handleClick}
          className={cn("text-muted-foreground hover:text-yellow-500", className)}
          aria-label={watched ? t("common.watchlist.removeSymbol", { symbol }) : t("common.watchlist.addSymbol", { symbol })}
        >
          <Star
            className={cn("size-4", watched && "fill-yellow-500 text-yellow-500")}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {watched ? t("common.watchlist.remove") : t("common.watchlist.add")}
      </TooltipContent>
    </Tooltip>
  );
}
