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
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Skeleton } from "../components/ui/skeleton";
import { Bell, CheckCircle2, X } from "lucide-react";
import { fmt } from "../lib/format";

const CONDITION_OPTIONS = [
  { value: "above", label: "Price Above", description: "Trigger when price rises above threshold" },
  { value: "below", label: "Price Below", description: "Trigger when price falls below threshold" },
  { value: "pct_change_up", label: "% Up", description: "Trigger on percentage increase" },
  { value: "pct_change_down", label: "% Down", description: "Trigger on percentage decrease" },
];

const PERIOD_OPTIONS = [
  { value: "5m", label: "5 min" },
  { value: "15m", label: "15 min" },
  { value: "30m", label: "30 min" },
  { value: "1h", label: "1 hour" },
  { value: "4h", label: "4 hours" },
  { value: "1d", label: "1 day" },
];

function conditionLabel(ct: string): string {
  const opt = CONDITION_OPTIONS.find(o => o.value === ct);
  return opt?.label || ct;
}

/* ─── Create Alert Dialog ─── */
function CreateAlertDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
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
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Price Alert</DialogTitle>
          <DialogDescription>
            Set up a price alert for any stock symbol
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Input
                id="symbol"
                placeholder="AAPL, TSLA, MSFT"
                value={symbol}
                onChange={e => setSymbol(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="condition">Condition</Label>
              <select
                id="condition"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={conditionType}
                onChange={e => setConditionType(e.target.value)}
              >
                {CONDITION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {CONDITION_OPTIONS.find(o => o.value === conditionType)?.description}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="threshold">
                {conditionType.startsWith("pct") ? "Percentage (%)" : "Price Threshold ($)"}
              </Label>
              <Input
                id="threshold"
                type="number"
                step={conditionType.startsWith("pct") ? "0.1" : "0.01"}
                min="0"
                max={conditionType.startsWith("pct") ? "100" : undefined}
                placeholder={conditionType.startsWith("pct") ? "5.0" : "200.00"}
                value={threshold}
                onChange={e => setThreshold(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="period">Period</Label>
              <select
                id="period"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={period}
                onChange={e => setPeriod(e.target.value)}
              >
                {PERIOD_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Alert"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>Configure how you receive alert notifications</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center gap-3">
          <Switch
            id="discord-toggle"
            checked={discordEnabled}
            onCheckedChange={setDiscordEnabled}
          />
          <Label htmlFor="discord-toggle">Enable Discord Notifications</Label>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="webhook">Discord Webhook URL</Label>
          <Input
            id="webhook"
            placeholder="https://discord.com/api/webhooks/..."
            value={discordWebhook}
            onChange={e => setDiscordWebhook(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Get your webhook URL from Discord channel settings → Integrations → Webhooks
          </p>
        </div>
        <Button onClick={handleSave} disabled={loading} className="w-fit">
          {loading ? "Saving..." : saved ? "Saved!" : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
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
  const [activeTab, setActiveTab] = useState("alerts");

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

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Price alerts</h1>
        <Button onClick={() => setShowCreate(true)}>New alert</Button>
      </div>

        {error && <p className="text-sm text-destructive mb-4">{error}</p>}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="alerts">My Alerts ({alerts.length})</TabsTrigger>
            <TabsTrigger value="triggered">
              Triggered
              {unreadCount > 0 && <Badge variant="destructive" className="ml-1.5">{unreadCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts">
            {alerts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <Bell className="size-8 text-muted-foreground" />
                  <p className="text-muted-foreground">No alerts yet</p>
                  <Button onClick={() => setShowCreate(true)}>New alert</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {alerts.map(alert => (
                  <Card key={alert.id} className={alert.enabled ? "" : "opacity-50"}>
                    <CardContent className="flex items-center gap-4 py-4">
                      <span className="font-bold text-base min-w-[60px]">{alert.symbol}</span>
                      <span className="text-sm text-muted-foreground flex-1">
                        {conditionLabel(alert.condition_type)}
                      </span>
                      <span className="font-semibold text-sm">
                        {alert.condition_type.startsWith("pct") ? `${alert.threshold}%` : `$${fmt(alert.threshold)}`}
                      </span>
                      <span className="text-xs text-muted-foreground uppercase">{alert.period}</span>
                      <Switch
                        checked={alert.enabled}
                        onCheckedChange={() => handleToggle(alert)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(alert.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${alert.symbol} alert`}
                      >
                        <X />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="triggered">
            {triggered.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <CheckCircle2 className="size-8 text-muted-foreground" />
                  <p className="text-muted-foreground">No triggered alerts</p>
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                {triggered.map(alert => (
                  <Card
                    key={alert.id}
                    className={`cursor-pointer transition-colors ${alert.read ? "opacity-70" : "border-primary"}`}
                    onClick={() => !alert.read && handleMarkRead(alert.id)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold">{alert.symbol}</span>
                        <span className="text-sm text-muted-foreground">{conditionLabel(alert.condition_type)}</span>
                        {!alert.read && <span className="size-2 rounded-full bg-primary inline-block ml-auto" />}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Triggered at ${fmt(alert.trigger_price)} (threshold: ${fmt(alert.threshold_value)})
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(alert.triggered_at).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings">
            {settings && (
              <NotificationSettingsPanel settings={settings} onUpdate={setSettings} />
            )}
          </TabsContent>
        </Tabs>

      <CreateAlertDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={alert => setAlerts(prev => [alert, ...prev])}
      />
    </div>
  );
}
