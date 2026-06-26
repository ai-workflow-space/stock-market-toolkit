import axios from "axios";

const API = import.meta.env.VITE_API_URL || "";

function getToken(): string | null {
  return localStorage.getItem("access_token");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface AccessLogEntry {
  type: string;
  ip: string;
  method: string;
  path: string;
  status: number;
  ms: number;
  request_id: string;
  user_id: number | null;
  timestamp: string;
}

export interface AccessLogsResponse {
  logs: AccessLogEntry[];
  total: number;
}

export interface FetchAccessLogsParams {
  method?: string;
  status_min?: number;
  status_max?: number;
  search?: string;
  limit?: number;
}

export async function fetchAccessLogs(params: FetchAccessLogsParams = {}): Promise<AccessLogsResponse> {
  const res = await axios.get(`${API}/api/admin/access-logs`, {
    params,
    headers: authHeaders(),
  });
  return res.data;
}
