import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { searchSymbols } from "@/api/stockApi";

export type SearchResult = { symbol: string; name: string; exchange: string };

export default function SymbolSearch({
  value,
  onSearch,
  onSelect,
  loading,
}: {
  value?: string;
  onSearch: (symbol: string) => void;
  onSelect?: (result: SearchResult) => void;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQuery = useCallback((v: string) => {
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchSymbols(v.trim());
        setResults(data.slice(0, 8));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const select = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    onSearch(result.symbol);
    onSelect?.(result);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full max-w-md justify-start gap-2 font-normal text-muted-foreground">
          {loading ? <Loader2 className="animate-spin" /> : <Search />}
          {value ? <span className="font-medium text-foreground">{value}</span> : t("common.search.tickerPromptExample")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={t("common.search.tickerPlaceholder")} value={query} onValueChange={handleQuery} />
          <CommandList>
            {searching && <div className="px-3 py-2 text-sm text-muted-foreground">{t("common.search.searching")}</div>}
            {!searching && query.trim().length >= 2 && results.length === 0 && (
              <CommandEmpty>{t("common.search.noMatches")}</CommandEmpty>
            )}
            {results.length > 0 && (
              <CommandGroup heading={t("common.search.results")}>
                {results.map((r) => (
                  <CommandItem key={r.symbol} value={r.symbol} onSelect={() => select(r)}>
                    <span className="font-medium">{r.symbol}</span>
                    <span className="ml-2 truncate text-muted-foreground">{r.name}</span>
                    {r.exchange && <span className="ml-auto text-xs text-muted-foreground">{r.exchange}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {query.trim().length >= 1 && (
              <CommandGroup>
                <CommandItem value={`__raw_${query}`} onSelect={() => select({ symbol: query.trim().toUpperCase(), name: query.trim().toUpperCase(), exchange: "" })}>
                  <Search />
                  {t("common.search.searchFor", { query: query.trim().toUpperCase() })}
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
