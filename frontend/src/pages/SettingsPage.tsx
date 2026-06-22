import { useTheme } from "../hooks/useTheme";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="page">
      <div className="container">
        <h1 style={{ color: "var(--text)", fontSize: "1.5rem", fontWeight: 600, marginBottom: "1.5rem" }}>Settings</h1>

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
              <span className="theme-toggle-icon">{theme === "dark" ? "☀️" : "🌙"}</span>
              <span className="theme-toggle-label">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-title">About</div>
          <div style={{ color: "var(--text-dim)", fontSize: "0.9rem", lineHeight: 1.6 }}>
            <p>Stock Market Toolkit v1.0.0</p>
            <p style={{ color: "var(--text-dim)", marginTop: "0.5rem" }}>
              A comprehensive stock analysis and monitoring tool.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}