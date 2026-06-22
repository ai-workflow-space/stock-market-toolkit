import { createContext, useState, useEffect, type ReactNode } from "react";
import { COMMON_TIMEZONES } from "./timezones";

export type ThemeMode = "light" | "dark";

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  timezone: string;
  setTimezone: (tz: string) => void;
}

export { COMMON_TIMEZONES };

export const ThemeContext = createContext<ThemeContextType | null>(null);

const THEME_KEY = "stock-toolkit-theme";
const TZ_KEY = "stock-toolkit-timezone";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const [timezone, setTimezoneState] = useState<string>(() => {
    const stored = localStorage.getItem(TZ_KEY);
    if (stored) return stored;
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  });

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(TZ_KEY, timezone);
  }, [timezone]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  const setTimezone = (tz: string) => {
    setTimezoneState(tz);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, timezone, setTimezone }}>
      {children}
    </ThemeContext.Provider>
  );
}