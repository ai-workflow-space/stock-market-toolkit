import { useTheme } from "../hooks/useTheme";

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="page">
      <div className="container">
        <h1 style={{ color: "#e2e8f0", fontSize: "1.5rem", fontWeight: 600, marginBottom: "1.5rem" }}>Settings</h1>

        <div className="card" style={{ marginBottom: "1rem" }}>
          <div className="card-title">Appearance</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 0" }}>
            <div>
              <div style={{ color: "#e2e8f0", fontWeight: 500 }}>Theme</div>
              <div style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                {theme === "dark" ? "Dark mode is active" : "Light mode is active"}
              </div>
            </div>
            <button
              className="search-btn"
              onClick={toggleTheme}
              style={{ minWidth: 100 }}
            >
              {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-title">About</div>
          <div style={{ color: "#94a3b8", fontSize: "0.9rem", lineHeight: 1.6 }}>
            <p>Stock Market Toolkit v1.0.0</p>
            <p style={{ color: "#64748b", marginTop: "0.5rem" }}>
              A comprehensive stock analysis and monitoring tool.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}