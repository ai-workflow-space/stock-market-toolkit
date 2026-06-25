import axios from "axios";

const API = import.meta.env.VITE_API_URL || "";

function getToken(): string | null {
  return localStorage.getItem("access_token");
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface LogEntry {
  timestamp: string;
  level: string;
  logger: string;
  message: string;
  request_id?: string;
  exception?: string;
  [key: string]: unknown;
}

export interface LogsResponse {
  logs: LogEntry[];
  total: number;
}

export interface FetchLogsParams {
  level?: string;
  since?: string;
  limit?: number;
  search?: string;
}

export async function fetchLogs(params: FetchLogsParams = {}): Promise<LogsResponse> {
  const res = await axios.get(`${API}/api/admin/logs`, {
    params,
    headers: authHeaders(),
  });
  return res.data;
}
