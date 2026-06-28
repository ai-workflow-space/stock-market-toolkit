import axios from "axios";

const API = import.meta.env.VITE_API_URL || "";

function authHeaders() {
  const token = localStorage.getItem("access_token");
  if (!token) return {};
  // Strip any pre-existing "Bearer " prefix to avoid "Authorization: Bearer Bearer <token>"
  const value = token.startsWith("Bearer ") ? token.slice(7) : token;
  return { Authorization: `Bearer ${value}` };
}

export interface SmtpSettings {
  host: string;
  port: number;
  use_tls: boolean;
  username: string | null;
  password_set: boolean;   // true = a password exists on server
  from_address: string;
  reply_to: string | null;
  updated_at: string | null;
}

export async function getSmtpSettings(): Promise<SmtpSettings> {
  const res = await axios.get(`${API}/api/admin/smtp`, { headers: authHeaders() });
  return res.data;
}

export async function updateSmtpSettings(data: {
  host?: string; port?: number; use_tls?: boolean;
  username?: string | null; password?: string | null;
  from_address?: string; reply_to?: string | null;
}): Promise<SmtpSettings> {
  const res = await axios.put(`${API}/api/admin/smtp`, data, { headers: authHeaders() });
  return res.data;
}

export async function testSmtpSettings(toEmail: string): Promise<{ success: boolean; message: string }> {
  const res = await axios.post(
    `${API}/api/admin/smtp/test`,
    { to_email: toEmail },
    { headers: authHeaders() }
  );
  return res.data;
}