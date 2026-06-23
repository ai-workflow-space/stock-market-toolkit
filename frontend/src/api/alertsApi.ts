import axios from "axios";

const API = import.meta.env.VITE_API_URL || "";

function getToken(): string | null {
  return localStorage.getItem("access_token");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Alert Types ───
export interface Alert {
  id: number;
  user_id: string;
  symbol: string;
  condition_type: "above" | "below" | "pct_change_up" | "pct_change_down";
  threshold: number;
  period: string;
  enabled: boolean;
  cooldown_until: string | null;
  created_at: string;
}

export interface TriggeredAlert {
  id: number;
  alert_id: number | null;
  user_id: string;
  symbol: string;
  condition_type: string;
  trigger_price: number;
  threshold_value: number;
  triggered_at: string;
  notified: boolean;
  read: boolean;
}

export interface NotificationSettings {
  user_id: string;
  discord_webhook_url: string | null;
  email_address: string | null;
  email_enabled: boolean;
  discord_enabled: boolean;
  default_period: string;
  timezone: string;
  updated_at: string | null;
}

export interface AlertCreate {
  symbol: string;
  condition_type: "above" | "below" | "pct_change_up" | "pct_change_down";
  threshold: number;
  period?: string;
}

export interface AlertUpdate {
  symbol?: string;
  condition_type?: "above" | "below" | "pct_change_up" | "pct_change_down";
  threshold?: number;
  period?: string;
  enabled?: boolean;
}

// ─── Alert API Functions ───
export async function createAlert(data: AlertCreate): Promise<Alert> {
  const res = await axios.post(`${API}/api/alerts`, data, {
    headers: authHeaders(),
  });
  return res.data;
}

export async function getAlerts(): Promise<Alert[]> {
  const res = await axios.get(`${API}/api/alerts`, {
    headers: authHeaders(),
  });
  return res.data;
}

export async function updateAlert(alertId: number, data: AlertUpdate): Promise<Alert> {
  const res = await axios.patch(`${API}/api/alerts/${alertId}`, data, {
    headers: authHeaders(),
  });
  return res.data;
}

export async function deleteAlert(alertId: number): Promise<void> {
  await axios.delete(`${API}/api/alerts/${alertId}`, {
    headers: authHeaders(),
  });
}

export async function getTriggeredAlerts(unreadOnly = false): Promise<TriggeredAlert[]> {
  const res = await axios.get(`${API}/api/alerts/triggered`, {
    params: { unread_only: unreadOnly },
    headers: authHeaders(),
  });
  return res.data;
}

export async function markTriggeredAlertRead(alertId: number): Promise<TriggeredAlert> {
  const res = await axios.patch(`${API}/api/alerts/triggered/${alertId}/read`, {}, {
    headers: authHeaders(),
  });
  return res.data;
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const res = await axios.get(`${API}/api/alerts/settings`, {
    headers: authHeaders(),
  });
  return res.data;
}

export async function updateNotificationSettings(data: Partial<NotificationSettings>): Promise<NotificationSettings> {
  const res = await axios.put(`${API}/api/alerts/settings`, data, {
    headers: authHeaders(),
  });
  return res.data;
}