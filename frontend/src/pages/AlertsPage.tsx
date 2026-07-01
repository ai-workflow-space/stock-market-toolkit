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
  testDiscordWebhook,
  testSmtpSettings,
  type Alert,
  type TriggeredAlert,
  type NotificationSettings,
} from "../api/alertsApi";
import { getStockInfo } from "../api/stockApi";
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
import { Bell, CheckCircle2, X, Plus, Trash2 } from "lucide-react";
import SymbolSearch from "@/components/common/SymbolSearch";
import { fmt } from "../lib/format";
import { toast } from "@/components/ui/sonner";

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

const METRIC_OPTIONS = [
  { value: "price", label: "Price" },
  { value: "rsi", label: "RSI" },
  { value: "macd_hist", label: "MACD Histogram" },
  { value: "signal", label: "Signal" },
  { value: "pct_change", label: "% Change" },
];

const OPERATOR_OPTIONS = [
  { value: "gt", label: ">" },
  { value: "lt", label: "<" },
  { value: "crosses_above", label: "Crosses Above" },
  { value: "eq", label: "=" },
];

function conditionLabel(ct: string): string {
  const opt = CONDITION_OPTIONS.find(o => o.value === ct);
  return opt?.label || ct;
}

function metricLabel(m: string): string {
  const opt = METRIC_OPTIONS.find(o => o.value === m);
  return opt?.label || m;
}

function operatorLabel(o: string): string {
  const opt = OPERATOR_OPTIONS.find(x => x.value === o);
  return opt?.label || o;
}

// Local form type for conditions: value stored as a string so the field can be empty
type ConditionFormItem = {
  metric: "price" | "rsi" | "macd_hist" | "signal" | "pct_change";
  operator: "gt" | "lt" | "crosses_above" | "eq";
  value: string;
};

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
  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [symbolName, setSymbolName] = useState("");
  const [combinator, setCombinator] = useState<"all" | "any">("all");
  const [conditions, setConditions] = useState<ConditionFormItem[]>([
    { metric: "price", operator: "gt", value: "" },
  ]);
  const [period, setPeriod] = useState("1h");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  // Fetch current price when a symbol is selected
  useEffect(() => {
    if (!selectedSymbol) {
      setCurrentPrice(null); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    let cancelled = false;
    getStockInfo(selectedSymbol)
      .then(info => { if (!cancelled) setCurrentPrice(info.price || null); })
      .catch(() => { if (!cancelled) setCurrentPrice(null); });
    return () => { cancelled = true; };
  }, [selectedSymbol]);

  const updateCondition = (idx: number, field: string, value: string) => {
    setConditions(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const addCondition = () => {
    setConditions(prev => [...prev, { metric: "price", operator: "gt", value: "" }]);
  };

  const removeCondition = (idx: number) => {
    setConditions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) { setError("Symbol is required"); return; }

    // Validate conditions: value must be a non-empty, parseable number
    for (const c of conditions) {
      if (c.value.trim() === "" || isNaN(Number(c.value))) {
        setError("Enter a valid value for all conditions");
        return;
      }
    }
    if (conditions.length === 0) { setError("Add at least one condition"); return; }

    setLoading(true);
    setError("");
    try {
      const alert = await createAlert({
        symbol: symbol.trim().toUpperCase(),
        symbol_name: symbolName || undefined,
        period,
        combinator,
        conditions: conditions.map(c => ({ ...c, value: Number(c.value) })),
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Price Alert</DialogTitle>
          <DialogDescription>
            Set up multi-condition price alerts for any stock symbol
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="symbol">Symbol</Label>
              <SymbolSearch
                value={selectedSymbol}
                onSearch={(sym) => {
                  setSelectedSymbol(sym);
                  setSymbol(sym);
                }}
                onSelect={(result) => setSymbolName(result.name)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Combinator</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={combinator === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCombinator("all")}
                >
                  AND (all conditions)
                </Button>
                <Button
                  type="button"
                  variant={combinator === "any" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCombinator("any")}
                >
                  OR (any condition)
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label>Conditions</Label>
                <Button type="button" variant="outline" size="sm" onClick={addCondition}>
                  <Plus className="size-3.5 mr-1" /> Add
                </Button>
              </div>
              {conditions.map((c, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  <div className="flex-1">
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={c.metric}
                      onChange={e => updateCondition(idx, "metric", e.target.value)}
                    >
                      {METRIC_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28">
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={c.operator}
                      onChange={e => updateCondition(idx, "operator", e.target.value)}
                    >
                      {OPERATOR_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="Value"
                      value={c.value}
                      onChange={e => updateCondition(idx, "value", e.target.value)}
                    />
                  </div>
                  {conditions.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeCondition(idx)} className="text-muted-foreground hover:text-destructive shrink-0">
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
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

            {currentPrice != null && (
              <p className="text-xs text-muted-foreground">
                Current price: ${currentPrice.toFixed(2)}
              </p>
            )}

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
  const [emailEnabled, setEmailEnabled] = useState(settings.email_enabled);
  const [emailAddress, setEmailAddress] = useState(settings.email_address || "");
  const [emailSubject, setEmailSubject] = useState(settings.email_subject || "");
  const [emailBody, setEmailBody] = useState(settings.email_body || "");
  // SMTP fields
  const [smtpHost, setSmtpHost] = useState(settings.smtp_host || "");
  const [smtpPort, setSmtpPort] = useState(settings.smtp_port?.toString() ?? "587");
  const [smtpUseTls, setSmtpUseTls] = useState(settings.smtp_use_tls ?? true);
  const [smtpUsername, setSmtpUsername] = useState(settings.smtp_username || "");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpFromAddress, setSmtpFromAddress] = useState(settings.smtp_from_address || "");
  const [smtpReplyTo, setSmtpReplyTo] = useState(settings.smtp_reply_to || "");
  const smtpPasswordSet = settings.smtp_password_set ?? false;
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [testingDiscord, setTestingDiscord] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        discord_webhook_url: discordWebhook || null,
        discord_enabled: discordEnabled,
        email_enabled: emailEnabled,
        email_address: emailAddress || null,
        email_subject: emailSubject || null,
        email_body: emailBody || null,
        smtp_host: smtpHost || null,
        smtp_port: smtpPort ? Number(smtpPort) : null,
        smtp_use_tls: smtpUseTls,
        smtp_username: smtpUsername || null,
        smtp_from_address: smtpFromAddress || null,
        smtp_reply_to: smtpReplyTo || null,
      };
      if (smtpPassword) {
        payload.smtp_password = smtpPassword;
      }
      const updated = await updateNotificationSettings(payload);
      onUpdate(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const handleTestDiscord = async () => {
    setTestingDiscord(true);
    try {
      await testDiscordWebhook(discordWebhook);
      toast.success("Test message sent — check your Discord channel");
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Test failed");
    } finally {
      setTestingDiscord(false);
    }
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    try {
      const result = await testSmtpSettings(emailAddress);
      if (result.success) {
        toast.success(result.message || "Test email sent successfully");
      } else {
        toast.error(result.message || "Test email failed");
      }
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Test failed");
    } finally {
      setTestingSmtp(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>Configure how you receive alert notifications</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">

        {/* Discord section */}
        <div className="flex items-center gap-3">
          <Switch
            id="discord-toggle"
            checked={discordEnabled}
            onCheckedChange={setDiscordEnabled}
          />
          <Label htmlFor="discord-toggle">Enable Discord Notifications</Label>
        </div>
        {discordEnabled && (
          <>
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
            <Button
              variant="outline"
              disabled={!discordWebhook || testingDiscord}
              onClick={handleTestDiscord}
            >
              {testingDiscord ? "Sending…" : "Send test"}
            </Button>
          </>
        )}

        {/* Email section */}
        <div className="flex items-center gap-3">
          <Switch
            id="email-toggle"
            checked={emailEnabled}
            onCheckedChange={setEmailEnabled}
          />
          <Label htmlFor="email-toggle">Enable Email Notifications</Label>
        </div>

        {emailEnabled && (
          <>
            {/* SMTP subsection */}
            <div className="grid gap-3 rounded-lg border border-border p-4">
              <p className="text-sm font-medium">SMTP Configuration</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label htmlFor="smtp-host">Host</Label>
                  <Input
                    id="smtp-host"
                    placeholder="smtp.example.com"
                    value={smtpHost}
                    onChange={e => setSmtpHost(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="smtp-port">Port</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    placeholder="587"
                    value={smtpPort}
                    onChange={e => setSmtpPort(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="smtp-tls"
                    checked={smtpUseTls}
                    onCheckedChange={setSmtpUseTls}
                  />
                  <Label htmlFor="smtp-tls" className="text-sm font-normal">Use TLS</Label>
                </div>
                <div />
                <div>
                  <Label htmlFor="smtp-username">Username</Label>
                  <Input
                    id="smtp-username"
                    placeholder="user@example.com"
                    value={smtpUsername}
                    onChange={e => setSmtpUsername(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="smtp-password">Password</Label>
                  <Input
                    id="smtp-password"
                    type="password"
                    placeholder={smtpPasswordSet ? "Password is set" : ""}
                    value={smtpPassword}
                    onChange={e => setSmtpPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="smtp-from">From address</Label>
                  <Input
                    id="smtp-from"
                    placeholder="alerts@example.com"
                    value={smtpFromAddress}
                    onChange={e => setSmtpFromAddress(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="smtp-reply-to">Reply-To <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="smtp-reply-to"
                    placeholder="reply@example.com"
                    value={smtpReplyTo}
                    onChange={e => setSmtpReplyTo(e.target.value)}
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!smtpHost || testingSmtp}
                onClick={handleTestSmtp}
              >
                {testingSmtp ? "Sending…" : "Send test email"}
              </Button>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email-address">Email Address</Label>
              <Input
                id="email-address"
                type="email"
                placeholder="you@example.com"
                value={emailAddress}
                onChange={e => setEmailAddress(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email-subject">Email Subject Template</Label>
              <Input
                id="email-subject"
                placeholder="Alert: {symbol} hit {price}"
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Available tokens: {"{"}symbol{"}"}, {"{"}price{"}"}, {"{"}condition{"}"}, {"{"}threshold{"}"}, {"{"}triggered_at{"}"}. Leave blank for default.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email-body">Email Body Template</Label>
              <textarea
                id="email-body"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder={`{symbol} alert triggered!\n\nCondition: {condition}\nPrice: ${"{"}price{"}"} (threshold: ${"{"}threshold{"}"})\nTriggered at: ${"{"}triggered_at{"}"}`}
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Available tokens: {"{"}symbol{"}"}, {"{"}price{"}"}, {"{"}condition{"}"}, {"{"}threshold{"}"}, {"{"}triggered_at{"}"}. Leave blank for default.
              </p>
            </div>
          </>
        )}

        <Button onClick={handleSave} disabled={loading} className="w-fit">
          {loading ? "Saving…" : saved ? "Saved" : "Save settings"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
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
                    <CardContent className="py-4">
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-base min-w-[60px]">{alert.symbol}</span>
                        <span className="text-sm text-muted-foreground truncate flex-1">
                          {alert.symbol_name ? `${alert.symbol_name} · ` : ""}
                          {alert.conditions?.length > 0
                            ? `${alert.combinator === "any" ? "ANY" : "ALL"} (${alert.conditions.length} conditions)`
                            : conditionLabel(alert.condition_type)
                          }
                        </span>
                        <span className="font-semibold text-sm">
                          {alert.conditions?.length > 0
                            ? ""
                            : alert.condition_type.startsWith("pct") ? `${alert.threshold}%` : `$${fmt(alert.threshold)}`
                          }
                        </span>
                        <span className="text-xs text-muted-foreground uppercase">{alert.period}</span>
                        <Switch
                          aria-label={`${alert.enabled ? "Disable" : "Enable"} ${alert.symbol} alert`}
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
                      </div>
                      {alert.conditions?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {alert.conditions.map((c, i) => (
                            <Badge key={c.id || i} variant="secondary" className="text-xs">
                              {metricLabel(c.metric)} {operatorLabel(c.operator)} {c.value}
                            </Badge>
                          ))}
                        </div>
                      )}
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
                    role={alert.read ? undefined : "button"}
                    tabIndex={alert.read ? -1 : 0}
                    aria-label={alert.read ? undefined : `Mark ${alert.symbol} alert as read`}
                    className={`transition-colors ${alert.read ? "opacity-70" : "cursor-pointer border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"}`}
                    onClick={() => !alert.read && handleMarkRead(alert.id)}
                    onKeyDown={(e) => {
                      if (!alert.read && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        handleMarkRead(alert.id);
                      }
                    }}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold">{alert.symbol}</span>
                        {alert.symbol_name && (
                          <span className="text-sm text-muted-foreground truncate">{alert.symbol_name}</span>
                        )}
                        <span className="text-sm text-muted-foreground">{conditionLabel(alert.condition_type)}</span>
                        {!alert.read && (
                          <span className="ml-auto flex items-center">
                            <span className="inline-block size-2 rounded-full bg-primary" aria-hidden="true" />
                            <span className="sr-only">Unread</span>
                          </span>
                        )}
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
