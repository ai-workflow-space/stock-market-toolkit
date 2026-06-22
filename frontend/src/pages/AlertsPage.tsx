import { useState, useEffect, useCallback } from "react";
import {
  createAlert,
  getAlerts,
  updateAlert,
  deleteAlert,
  getTriggeredAlerts,
  markTriggeredAlertRead,
  getNotificationSettings,
  updateNotificationSettings,
  type Alert,
  type TriggeredAlert,
  type NotificationSettings,
} from "../api/alertsApi";

const CONDITION_OPTIONS = [
  { value: "above", label: "🔼 Price Above", description: "Trigger when price rises above threshold" },
  { value: "below", label: "🔽 Price Below", description: "Trigger when price falls below threshold" },
  { value: "pct_change_up", label: "📈 % Up", description: "Trigger on percentage increase" },
  { value: "pct_change_down", label: "📉 % Down", description: "Trigger on percentage decrease" },
];

const PERIOD_OPTIONS = [
  { value: "5m", label: "5 min" },
  { value: "15m", label: "15 min" },
  { value: "30m", label: "30 min" },
  { value: "1h", label: "1 hour" },
  { value: "4h", label: "4 hours" },
  { value: "1d", label: "1 day" },
];

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function conditionLabel(ct: string): string {
  const opt = CONDITION_OPTIONS.find(o => o.value === ct);
  return opt?.label || ct;
}

function conditionDesc(ct: string): string {
  const opt = CONDITION_OPTIONS.find(o => o.value === ct);
  return opt?.description || "";
}

/* ─── Create Alert Modal ─── */
function CreateAlertModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (alert: Alert) => void;
}) {
  const [symbol, setSymbol] = useState("");
  const [conditionType, setConditionType] = useState<string>("above");
  const [threshold, setThreshold] = useState("");
  const [period, setPeriod] = useState("1h");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) { setError("Symbol is required"); return; }
    const thresh = parseFloat(threshold);
    if (isNaN(thresh) || thresh <= 0) { setError("Enter a valid threshold"); return; }
    if (conditionType.startsWith("pct") && thresh > 100) { setError("Percentage must be ≤ 100"); return; }

    setLoading(true);
    setError("");
    try {
      const alert = await createAlert({
        symbol: symbol.trim().toUpperCase(),
        condition_type: conditionType as Alert["condition_type"],
        threshold: thresh,
        period,
      });
      onCreated(alert);
      onClose();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to create alert");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2 style={{ color: "#e2e8f0", marginBottom: "1.5rem" }}>Create Price Alert</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Symbol</label>
            <input
              className="form-input"
              placeholder="AAPL, TSLA, MSFT"
              value={symbol}
              onChange={e => setSymbol(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Condition</label>
            <select
              className="form-select"
              value={conditionType}
              onChange={e => setConditionType(e.target.value)}
            >
              {CONDITION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <small style={{ color: "#64748b", fontSize: "0.75rem" }}>{conditionDesc(conditionType)}</small>
          </div>

          <div className="form-group">
            <label className="form-label">
              {conditionType.startsWith("pct") ? "Percentage (%)" : "Price Threshold ($)"}
            </label>
            <input
              className="form-input"
              type="number"
              step={conditionType.startsWith("pct") ? "0.1" : "0.01"}
              min="0"
              max={conditionType.startsWith("pct") ? "100" : undefined}
              placeholder={conditionType.startsWith("pct") ? "5.0" : "200.00"}
              value={threshold}
              onChange={e => setThreshold(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Period</label>
            <select
              className="form-select"
              value={period}
              onChange={e => setPeriod(e.target.value)}
            >
              {PERIOD_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.5rem" }}>
            <button type="submit" className="search-btn" disabled={loading}>
              {loading ? "Creating..." : "Create Alert"}
            </button>
            <button type="button" className="search-btn" style={{ background: "#334155" }} onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Notification Settings ─── */
function NotificationSettingsPanel({ settings, onUpdate }: {
  settings: NotificationSettings;
  onUpdate: (s: NotificationSettings) => void;
}) {
  const [discordWebhook, setDiscordWebhook] = useState(settings.discord_webhook_url || "");
  const [discordEnabled, setDiscordEnabled] = useState(settings.discord_enabled);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    try {
      const updated = await updateNotificationSettings({
        discord_webhook_url: discordWebhook || null,
        discord_enabled: discordEnabled,
      });
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: "1.5rem" }}>
      <div className="card-title">Notification Settings</div>
      <div className="form-group">
        <label className="form-label">
          <input
            type="checkbox"
            checked={discordEnabled}
            onChange={e => setDiscordEnabled(e.target.checked)}
            style={{ marginRight: "0.5rem" }}
          />
          Enable Discord Notifications
        </label>
      </div>
      <div className="form-group">
        <label className="form-label">Discord Webhook URL</label>
        <input
          className="form-input"
          placeholder="https://discord.com/api/webhooks/..."
          value={discordWebhook}
          onChange={e => setDiscordWebhook(e.target.value)}
        />
        <small style={{ color: "#64748b", fontSize: "0.75rem" }}>
          Get your webhook URL from Discord channel settings → Integrations → Webhooks
        </small>
      </div>
      <button className="search-btn" onClick={handleSave} disabled={loading}>
        {loading ? "Saving..." : saved ? "✓ Saved!" : "Save Settings"}
      </button>
    </div>
  );
}

/* ─── Main Alerts Page ─── */
export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [triggered, setTriggered] = useState<TriggeredAlert[]>([]);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"alerts" | "triggered" | "settings">("alerts");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [alertsData, triggeredData, settingsData] = await Promise.all([
        getAlerts(),
        getTriggeredAlerts(),
        getNotificationSettings(),
      ]);
      setAlerts(alertsData);
      setTriggered(triggeredData);
      setSettings(settingsData);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const handleToggle = async (alert: Alert) => {
    try {
      const updated = await updateAlert(alert.id, { enabled: !alert.enabled });
      setAlerts(prev => prev.map(a => a.id === alert.id ? updated : a));
    } catch { /* ignore */ }
  };

  const handleDelete = async (alertId: number) => {
    if (!confirm("Delete this alert?")) return;
    try {
      await deleteAlert(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch { /* ignore */ }
  };

  const handleMarkRead = async (alertId: number) => {
    try {
      const updated = await markTriggeredAlertRead(alertId);
      setTriggered(prev => prev.map(a => a.id === alertId ? updated : a));
    } catch { /* ignore */ }
  };

  const unreadCount = triggered.filter(t => !t.read).length;

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h1 style={{ color: "#e2e8f0", fontSize: "1.5rem", fontWeight: 600 }}>Price Alerts</h1>
          <button className="search-btn" onClick={() => setShowCreate(true)}>
            + New Alert
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === "alerts" ? "active" : ""}`}
            onClick={() => setActiveTab("alerts")}
          >
            My Alerts ({alerts.length})
          </button>
          <button
            className={`tab-btn ${activeTab === "triggered" ? "active" : ""}`}
            onClick={() => setActiveTab("triggered")}
          >
            Triggered {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </button>
          <button
            className={`tab-btn ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            Settings
          </button>
        </div>

        {/* Alerts List */}
        {activeTab === "alerts" && (
          <div>
            {alerts.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔔</div>
                <div style={{ color: "#94a3b8", marginBottom: "1rem" }}>No alerts yet</div>
                <button className="search-btn" onClick={() => setShowCreate(true)}>+ New Alert</button>
              </div>
            ) : (
              <div className="alerts-list">
                {alerts.map(alert => (
                  <div key={alert.id} className={`alert-card ${alert.enabled ? "" : "disabled"}`}>
                    <div className="alert-symbol">{alert.symbol}</div>
                    <div className="alert-condition">{conditionLabel(alert.condition_type)}</div>
                    <div className="alert-threshold">
                      {alert.condition_type.startsWith("pct") ? `${alert.threshold}%` : `$${fmt(alert.threshold)}`}
                    </div>
                    <div className="alert-period">{alert.period}</div>
                    <label className="toggle">
                      <input type="checkbox" checked={alert.enabled} onChange={() => handleToggle(alert)} />
                      <span className="toggle-slider" />
                    </label>
                    <button className="delete-btn" onClick={() => handleDelete(alert.id)}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Triggered Alerts */}
        {activeTab === "triggered" && (
          <div>
            {triggered.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
                <div style={{ color: "#94a3b8" }}>No triggered alerts</div>
              </div>
            ) : (
              <div className="triggered-list">
                {triggered.map(alert => (
                  <div
                    key={alert.id}
                    className={`triggered-card ${alert.read ? "read" : "unread"}`}
                    onClick={() => !alert.read && handleMarkRead(alert.id)}
                  >
                    <div className="triggered-header">
                      <span className="triggered-symbol">{alert.symbol}</span>
                      <span className="triggered-condition">{conditionLabel(alert.condition_type)}</span>
                      {!alert.read && <span className="unread-dot" />}
                    </div>
                    <div className="triggered-details">
                      <span>Triggered at ${fmt(alert.trigger_price)} (threshold: ${fmt(alert.threshold_value)})</span>
                    </div>
                    <div className="triggered-time">
                      {new Date(alert.triggered_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && settings && (
          <NotificationSettingsPanel settings={settings} onUpdate={setSettings} />
        )}

        {showCreate && (
          <CreateAlertModal
            onClose={() => setShowCreate(false)}
            onCreated={alert => setAlerts(prev => [alert, ...prev])}
          />
        )}
      </div>
    </div>
  );
}