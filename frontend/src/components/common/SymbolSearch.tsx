import { useCallback, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { searchSymbols } from "@/api/stockApi";

type SearchResult = { symbol: string; name: string; exchange: string };

export default function SymbolSearch({
  value,
  onSearch,
  loading,
}: {
  value?: string;
  onSearch: (symbol: string) => void;
  loading?: boolean;
}) {
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
        const data = (await searchSymbols(v.trim())) as SearchResult[];
        setResults(data.slice(0, 8));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const select = (symbol: string) => {
    setOpen(false);
    setQuery("");
    setResults([]);
    onSearch(symbol);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full max-w-md justify-start gap-2 font-normal text-muted-foreground">
          {loading ? <Loader2 className="animate-spin" /> : <Search />}
          {value ? <span className="font-medium text-foreground">{value}</span> : "Search ticker… AAPL, TSLA"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search ticker…" value={query} onValueChange={handleQuery} />
          <CommandList>
            {searching && <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>}
            {!searching && query.trim().length >= 2 && results.length === 0 && (
              <CommandEmpty>No matches.</CommandEmpty>
            )}
            {results.length > 0 && (
              <CommandGroup heading="Results">
                {results.map((r) => (
                  <CommandItem key={r.symbol} value={r.symbol} onSelect={() => select(r.symbol)}>
                    <span className="font-medium">{r.symbol}</span>
                    <span className="ml-2 truncate text-muted-foreground">{r.name}</span>
                    {r.exchange && <span className="ml-auto text-xs text-muted-foreground">{r.exchange}</span>}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {query.trim().length >= 1 && (
              <CommandGroup>
                <CommandItem value={`__raw_${query}`} onSelect={() => select(query.trim().toUpperCase())}>
                  <Search />
                  Search “{query.trim().toUpperCase()}”
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
