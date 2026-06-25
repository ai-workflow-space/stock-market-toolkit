import axios from "axios";

const API = import.meta.env.VITE_API_URL || "";

function getToken(): string | null {
  return localStorage.getItem("access_token");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface AuditLogEntry {
  id: number;
  actor_id: number;
  action: string;
  target: string;
  meta: Record<string, unknown>;
  ip: string;
  created_at: string;
}

export interface AuditLogsResponse {
  logs: AuditLogEntry[];
  total: number;
}

export interface FetchAuditLogsParams {
  action?: string;
  search?: string;
  limit?: number;
}

export async function fetchAuditLogs(params: FetchAuditLogsParams = {}): Promise<AuditLogsResponse> {
  const res = await axios.get(`${API}/api/admin/audit-logs`, {
    params,
    headers: authHeaders(),
  });
  return res.data;
}
