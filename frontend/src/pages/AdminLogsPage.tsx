import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, ChevronDown, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchLogs, type LogEntry } from "@/api/adminLogsApi";

const LEVELS = ["", "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"];

const LEVEL_COLORS: Record<string, string> = {
  DEBUG: "bg-gray-500/20 text-gray-300 hover:bg-gray-500/30",
  INFO: "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30",
  WARNING: "bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30",
  ERROR: "bg-red-500/20 text-red-300 hover:bg-red-500/30",
  CRITICAL: "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30",
};

function LevelBadge({ level }: { level: string }) {
  const colorClass = LEVEL_COLORS[level] ?? "bg-secondary text-secondary-foreground";
  return (
    <Badge variant="outline" className={`font-mono text-[10px] ${colorClass} border-0`}>
      {level}
    </Badge>
  );
}

function LogRow({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="border-b border-border hover:bg-accent/50 cursor-pointer text-sm"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="py-2 px-3 text-muted-foreground font-mono text-[11px] whitespace-nowrap">
          {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "—"}
        </td>
        <td className="py-2 px-3">
          <LevelBadge level={entry.level} />
        </td>
        <td className="py-2 px-3 text-muted-foreground font-mono text-[11px] max-w-[160px] truncate">
          {entry.logger ?? "—"}
        </td>
        <td className="py-2 px-3 text-foreground max-w-xs truncate">
          {entry.message ?? "—"}
        </td>
        <td className="py-2 px-3 text-muted-foreground">
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/30">
          <td colSpan={5} className="p-3">
            <pre className="rounded bg-background p-3 text-xs font-mono overflow-auto max-h-96 whitespace-pre-wrap break-all">
              {JSON.stringify(entry, null, 2)}
            </pre>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [level, setLevel] = useState("");
  const [search, setSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadLogs = useCallback(async () => {
    setError("");
    try {
      const data = await fetchLogs({
        level: level || undefined,
        search: search || undefined,
        limit: 500,
      });
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, [level, search]);

  useEffect(() => {
    setLoading(true);
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(loadLogs, 5000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, loadLogs]);

  const handleRefresh = () => {
    setLoading(true);
    loadLogs();
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Log Viewer</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Application logs from app.json ({total} entries)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="auto-refresh" className="text-sm text-muted-foreground">
              Auto-refresh
            </Label>
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`size-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="level-filter" className="text-xs text-muted-foreground">
              Level
            </Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger id="level-filter" className="w-32">
                <SelectValue placeholder="All levels" />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l || "All levels"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
            <Label htmlFor="search" className="text-xs text-muted-foreground">
              Search
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search log entries..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-4 border-destructive/40 bg-destructive/10">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-muted-foreground">No log entries found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left text-xs font-medium text-muted-foreground">
                <th className="py-2.5 px-3 w-[170px]">Timestamp</th>
                <th className="py-2.5 px-3 w-[90px]">Level</th>
                <th className="py-2.5 px-3">Logger</th>
                <th className="py-2.5 px-3">Message</th>
                <th className="py-2.5 px-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {logs.map((entry, i) => (
                <LogRow key={`${entry.timestamp}-${i}`} entry={entry} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
