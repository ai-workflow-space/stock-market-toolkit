import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { COMMON_TIMEZONES } from "../context/timezones";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";

export default function SettingsPage() {
  const { theme, toggleTheme, timezone, setTimezone } = useTheme();
  const [yfStatus, setYfStatus] = useState<"loading" | "ok" | "error">("loading");
  const [yfMessage, setYfMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    fetch(`${import.meta.env.VITE_API_URL || ""}/api/mcp/yf-health`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === "ok") {
          setYfStatus("ok");
          setYfMessage(data.message ?? "yfinance is working");
        } else {
          setYfStatus("error");
          setYfMessage(data.message ?? "yfinance check failed");
        }
      })
      .catch(() => setYfStatus("error"));
  }, []);

  return (
    <div className="page">
      <div className="container max-w-2xl">
        <h1 className="text-2xl font-semibold mb-6">Settings</h1>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize your viewing experience</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {theme === "dark" ? "Dark mode is active" : "Light mode is active"}
                </p>
              </div>
              <Button variant="outline" onClick={toggleTheme}>
                {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Timezone</CardTitle>
            <CardDescription>Set your preferred timezone for alerts and timestamps</CardDescription>
          </CardHeader>
          <CardContent>
            <Label>Current: {timezone}</Label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="mt-2 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {COMMON_TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Data Source Health</CardTitle>
            <CardDescription>Status of connected data providers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-1">
              {yfStatus === "loading" && (
                <>
                  <span className="text-sm">Checking Yahoo Finance...</span>
                </>
              )}
              {yfStatus === "ok" && (
                <>
                  <span className="size-2 rounded-full bg-green-500 inline-block" />
                  <span className="text-sm text-green-500 font-medium">Yahoo Finance operational</span>
                </>
              )}
              {yfStatus === "error" && (
                <>
                  <span className="size-2 rounded-full bg-red-500 inline-block" />
                  <span className="text-sm text-red-500 font-medium">Yahoo Finance error</span>
                </>
              )}
            </div>
            {yfMessage && (
              <p className="text-xs text-muted-foreground mt-1">{yfMessage}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>Stock Market Toolkit</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">v0.2.0</p>
            <p className="text-sm text-muted-foreground mt-2">
              A comprehensive stock analysis and monitoring tool.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
