import { useNavigate } from "react-router-dom";
import { Star, TrendingUp, BarChart3, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { useWatchlist } from "../hooks/useWatchlist";
import WatchlistButton from "../components/common/WatchlistButton";

export default function WatchlistPage() {
  const navigate = useNavigate();
  const { items, loading, error, refresh } = useWatchlist();

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        <Skeleton className="h-9 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Watchlist</h1>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          {loading ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Star className="size-8 text-muted-foreground" />
            <p className="text-muted-foreground">Your watchlist is empty</p>
            <p className="text-xs text-muted-foreground">
              Star tickers from the Dashboard or Compare page to add them here
            </p>
            <Button onClick={() => navigate("/")}>Browse stocks</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <WatchlistButton symbol={item.symbol} className="!text-yellow-500" />
                <span
                  className="flex-1 font-bold text-base cursor-pointer hover:underline"
                  onClick={() => navigate(`/?symbol=${item.symbol}`)}
                >
                  {item.symbol}
                </span>
                <span className="text-xs text-muted-foreground">
                  Added {new Date(item.created_at).toLocaleDateString()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/?symbol=${item.symbol}`)}
                >
                  <TrendingUp />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/compare?symbols=${item.symbol}`)}
                >
                  <BarChart3 />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
