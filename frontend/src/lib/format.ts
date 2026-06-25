export const fmt = (n: number | null | undefined): string =>
  n == null ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const pct = (n: number | null | undefined): string =>
  n == null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

export const volFmt = (n: number | null | undefined): string =>
  n == null ? "—"
    : n >= 1e9 ? `${(n / 1e9).toFixed(2)}B`
    : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M`
    : `${(n / 1e3).toFixed(0)}K`;

export const compactUsd = (n: number | null | undefined): string =>
  n == null ? "—"
    : n >= 1e12 ? `$${(n / 1e12).toFixed(2)}T`
    : n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B`
    : `$${(n / 1e6).toFixed(2)}M`;

export const fmtDate = (d: string | Date | null | undefined): string =>
  d == null ? "—" : new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
