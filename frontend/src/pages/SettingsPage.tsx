import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";
import { COMMON_TIMEZONES } from "../context/timezones";

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
      <div className="container">
        <h1 style={{ color: "var(--text)", fontSize: "1.5rem", fontWeight: 600, marginBottom: "1.5rem" }}>Settings</h1>

        {/* Appearance */}
        <div className="card" style={{ marginBottom: "1rem" }}>
          <div className="card-title">Appearance</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 0" }}>
            <div>
              <div style={{ color: "var(--text)", fontWeight: 500 }}>Theme</div>
              <div style={{ color: "var(--text-dim)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                {theme === "dark" ? "Dark mode is active" : "Light mode is active"}
              </div>
            </div>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              <span className="theme-toggle-label">
                {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
              </span>
            </button>
          </div>
        </div>

        {/* Timezone */}
        <div className="card" style={{ marginBottom: "1rem" }}>
          <div className="card-title">Timezone</div>
          <div style={{ padding: "0.75rem 0" }}>
            <div style={{ color: "var(--text-dim)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
              Current: <strong style={{ color: "var(--text)" }}>{timezone}</strong>
            </div>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              style={{
                background: "var(--bg-secondary)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                padding: "0.5rem 0.75rem",
                fontSize: "0.9rem",
                width: "100%",
                cursor: "pointer",
              }}
            >
              {COMMON_TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* YF Health */}
        <div className="card" style={{ marginBottom: "1rem" }}>
          <div className="card-title">Data Source Health</div>
          <div style={{ padding: "0.75rem 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
              {yfStatus === "loading" && (
                <>
                  <span style={{ fontSize: "0.9rem" }}>⏳</span>
                  <span style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>Checking Yahoo Finance...</span>
                </>
              )}
              {yfStatus === "ok" && (
                <>
                  <span style={{ fontSize: "0.9rem" }}>✅</span>
                  <span style={{ color: "#22c55e", fontSize: "0.9rem", fontWeight: 500 }}>Yahoo Finance operational</span>
                </>
              )}
              {yfStatus === "error" && (
                <>
                  <span style={{ fontSize: "0.9rem" }}>❌</span>
                  <span style={{ color: "#ef4444", fontSize: "0.9rem", fontWeight: 500 }}>Yahoo Finance error</span>
                </>
              )}
            </div>
            {yfMessage && (
              <div style={{ color: "var(--text-dim)", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                {yfMessage}
              </div>
            )}
          </div>
        </div>

        {/* About */}
        <div className="card">
          <div className="card-title">About</div>
          <div style={{ color: "var(--text-dim)", fontSize: "0.9rem", lineHeight: 1.6 }}>
            <p>Stock Market Toolkit v0.2.0</p>
            <p style={{ color: "var(--text-dim)", marginTop: "0.5rem" }}>
              A comprehensive stock analysis and monitoring tool.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}