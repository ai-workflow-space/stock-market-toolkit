import { useState, useEffect, useCallback } from "react";
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  type WatchlistItem,
} from "../api/watchlistApi";
import { useAuth } from "./useAuth";

export function useWatchlist() {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await getWatchlist();
      setItems(data);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail || "Failed to load watchlist"
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const symbols: string[] = items.map((i) => i.symbol);

  const add = async (symbol: string) => {
    const upper = symbol.toUpperCase();
    if (items.some((i) => i.symbol === upper)) return;
    try {
      const item = await addToWatchlist(upper);
      setItems((prev) => [item, ...prev]);
      return item;
    } catch (err: unknown) {
      throw err;
    }
  };

  const remove = async (symbol: string) => {
    const upper = symbol.toUpperCase();
    try {
      await removeFromWatchlist(upper);
      setItems((prev) => prev.filter((i) => i.symbol !== upper));
    } catch (err: unknown) {
      throw err;
    }
  };

  const isWatched = (symbol: string): boolean =>
    items.some((i) => i.symbol === symbol.toUpperCase());

  return { items, symbols, loading, error, refresh, add, remove, isWatched };
}
