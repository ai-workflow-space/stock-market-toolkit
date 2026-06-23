import type { ThemeMode } from "@/context/ThemeContext";
import { useTheme } from "./useTheme";

export interface ChartColors {
  grid: string;
  axis: string;
  up: string;
  down: string;
  primary: string;
}

/**
 * Resolved chart colors per theme. Recharts renders to SVG presentation
 * attributes, which do not resolve CSS `var()`, so we supply concrete values.
 * These mirror the token values in `src/index.css` — keep them in sync.
 */
const CHART_COLORS: Record<ThemeMode, ChartColors> = {
  dark: {
    grid: "hsl(223 30% 16%)",
    axis: "hsl(215 20% 65%)",
    up: "hsl(142 71% 45%)",
    down: "hsl(0 72% 55%)",
    primary: "hsl(217 91% 60%)",
  },
  light: {
    grid: "hsl(220 13% 91%)",
    axis: "hsl(220 9% 46%)",
    up: "hsl(142 71% 38%)",
    down: "hsl(0 72% 48%)",
    primary: "hsl(217 91% 60%)",
  },
};

/** Resolved chart colors that follow the active light/dark theme. */
export function useChartTheme(): ChartColors {
  const { theme } = useTheme();
  return CHART_COLORS[theme];
}
