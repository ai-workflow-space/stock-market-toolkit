import { useState, useEffect } from "react";

/** Drill into any FastAPI error shape and return a human-readable message.
 *  Handles: string detail, Pydantic validation detail array, {detail:string} */
async function extractError(res: Response, fallback: string): Promise<string> {
  try {
    const d = await res.json();
    // Pydantic 422: detail is ValidationError[]
    if (Array.isArray(d.detail)) {
      return d.detail[0]?.msg || fallback;
    }
    // Plain string detail: HTTPException raised by app code
    if (typeof d.detail === "string") return d.detail;
    // Fallback for unexpected shapes
    return d.detail || fallback;
  } catch {
    return fallback;
  }
}
import { useTheme } from "../hooks/useTheme";
import { COMMON_TIMEZONES } from "../context/timezones";
import { useAuth } from "../hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog";
import { Loader2, Key, Pencil } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { APP_VERSION } from "@/lib/version";

export default function SettingsPage() {
  const { theme, toggleTheme, timezone, setTimezone } = useTheme();
  const { user } = useAuth();
  const [yfStatus, setYfStatus] = useState<"loading" | "ok" | "error">("loading");
  const [yfMessage, setYfMessage] = useState("");
  const [users, setUsers] = useState<Array<{
    id: string;
    email: string;
    username: string;
    is_admin: boolean;
    is_active: boolean;
    created_at: string;
  }>>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addUsername, setAddUsername] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; username: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [resetTarget, setResetTarget] = useState<{ id: string; username: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [resetError, setResetError] = useState("");
  const [editEmailOpen, setEditEmailOpen] = useState(false);
  const [editEmailTarget, setEditEmailTarget] = useState<{ id: string; email: string } | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editEmailLoading, setEditEmailLoading] = useState(false);
  const [editEmailError, setEditEmailError] = useState("");

  const isAdmin = user?.is_admin === true;

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    fetch(`${import.meta.env.VITE_API_URL || ""}/api/mcp/yf-health`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json() as Promise<{ status?: string; message?: string }>)
      .then(data => {
        if (data.status === "ok") {
          setYfStatus("ok");
          setYfMessage(data.message ?? "yfinance is working");
        } else {
          setYfStatus("error");
          setYfMessage(data.message ?? "yfinance check failed");
        }
      })
      .catch(() => {
        setYfStatus("error");
        setYfMessage("Could not reach the health endpoint");
      });
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const token = localStorage.getItem("access_token");
    let ignore = false;
    fetch(`${import.meta.env.VITE_API_URL || ""}/api/auth/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => { if (!ignore) setUsers(data.users ?? []); })
      .catch(() => { if (!ignore) setUsers([]); })
      .finally(() => { if (!ignore) setUsersLoading(false); });
    return () => { ignore = true; };
  }, [isAdmin]);

  const toggleUserAdmin = async (userId: string, currentValue: boolean) => {
    const token = localStorage.getItem("access_token");
    await fetch(`${import.meta.env.VITE_API_URL || ""}/api/auth/users/${userId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ is_admin: !currentValue }),
    });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: !currentValue } : u));
  };

  const toggleUserActive = async (userId: string, currentValue: boolean) => {
    const token = localStorage.getItem("access_token");
    await fetch(`${import.meta.env.VITE_API_URL || ""}/api/auth/users/${userId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !currentValue }),
    });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentValue } : u));
  };

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddError("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/auth/register`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail, username: addUsername, password: addPassword }),
      });
      if (!res.ok) {
        throw new Error(await extractError(res, "Failed to add user"));
      }
      const newUser = await res.json();
      setUsers(prev => [...prev, newUser]);
      setAddOpen(false);
      setAddEmail("");
      setAddUsername("");
      setAddPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add user";
      setAddError(msg);
    } finally {
      setAddLoading(false);
    }
  };

  const resetUserPassword = async () => {
    if (!resetTarget) return;
    setResetLoading(true);
    setResetError("");
    setResetResult(null);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/auth/users/${resetTarget.id}/reset-password`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(typeof d.detail === "string" ? d.detail : d.detail?.[0]?.msg || "Reset failed");
      }
      const data = await res.json();
      setResetResult(data.password);
    } catch (err: unknown) {
      setResetError((err as Error).message);
    } finally {
      setResetLoading(false);
    }
  };

  const openEditEmail = (user: { id: string; email: string }) => {
    setEditEmailTarget(user);
    setEditEmail(user.email);
    setEditEmailError("");
    setEditEmailOpen(true);
  };

  const editUserEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEmailTarget) return;
    setEditEmailLoading(true);
    setEditEmailError("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/auth/users/${editEmailTarget.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email: editEmail }),
      });
      if (!res.ok) {
        throw new Error(await extractError(res, "Failed to update email"));
      }
      setUsers(prev => prev.map(u => u.id === editEmailTarget.id ? { ...u, email: editEmail } : u));
      toast("Email updated", { description: "User email has been updated successfully." });
      setEditEmailOpen(false);
      setEditEmailTarget(null);
    } catch (err: unknown) {
      setEditEmailError((err as Error).message);
    } finally {
      setEditEmailLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/auth/users/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(await extractError(res, "Delete failed"));
      }
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: unknown) {
      setActionError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

    return (
    <>
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <h1 className="text-2xl font-semibold">Settings</h1>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize your viewing experience</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label>Theme</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {theme === "dark" ? "Dark mode is active" : "Light mode is active"}
                </p>
              </div>
              <Button variant="outline" onClick={toggleTheme}>
                {theme === "dark" ? "Switch to Light" : "Switch to Dark"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timezone</CardTitle>
            <CardDescription>Set your preferred timezone for alerts and timestamps</CardDescription>
          </CardHeader>
          <CardContent>
            <Label htmlFor="timezone">Current: {timezone}</Label>
            <select
              id="timezone"
              aria-label="Timezone"
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="mt-2 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {COMMON_TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Source Health</CardTitle>
            <CardDescription>Status of connected data providers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-1">
              {yfStatus === "loading" && (
                <span className="text-sm">Checking Yahoo Finance...</span>
              )}
              {yfStatus === "ok" && (
                <>
                  <span className="inline-block size-2 rounded-full bg-up" />
                  <span className="text-sm font-medium text-up">Yahoo Finance operational</span>
                </>
              )}
              {yfStatus === "error" && (
                <>
                  <span className="inline-block size-2 rounded-full bg-down" />
                  <span className="text-sm font-medium text-down">Yahoo Finance error</span>
                </>
              )}
            </div>
            {yfMessage && (
              <p className="text-xs text-muted-foreground mt-1">{yfMessage}</p>
            )}
          </CardContent>
        </Card>

        {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user accounts and permissions</CardDescription>
              </div>
              <Button size="sm" onClick={() => setAddOpen(true)}>+ Add User</Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {usersLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users found.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium truncate">{u.username}</span>
                      <span className="text-xs text-muted-foreground truncate">{u.email}</span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-muted-foreground">Admin</span>
                        <Switch
                          checked={u.is_admin}
                          onCheckedChange={() => toggleUserAdmin(u.id, u.is_admin)}
                        />
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs text-muted-foreground">Active</span>
                        <Switch
                          checked={u.is_active}
                          onCheckedChange={() => toggleUserActive(u.id, u.is_active)}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditEmail({ id: u.id, email: u.email })}
                      >
                        <Pencil className="size-3 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setResetTarget({ id: u.id, username: u.username })}
                      >
                        <Key className="size-3 mr-1" /> Reset
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTarget({ id: u.id, username: u.username })}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>Stock Market Toolkit</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{APP_VERSION}</p>
            <p className="text-sm text-muted-foreground mt-2">
              A comprehensive stock analysis and monitoring tool.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete user &ldquo;{deleteTarget?.username}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {actionError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {actionError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={(open) => { if (!open) { setAddOpen(false); setAddError(""); setAddEmail(""); setAddUsername(""); setAddPassword(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new user account.</DialogDescription>
          </DialogHeader>
          <form onSubmit={addUser} className="flex flex-col gap-3">
            {addError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {addError}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                placeholder="user@example.com"
                value={addEmail}
                onChange={e => setAddEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="add-username">Username</Label>
              <Input
                id="add-username"
                placeholder="username"
                value={addUsername}
                onChange={e => setAddUsername(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="add-password">Password</Label>
              <Input
                id="add-password"
                type="password"
                placeholder="Password"
                value={addPassword}
                onChange={e => setAddPassword(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={addLoading}>Cancel</Button>
              <Button type="submit" disabled={addLoading}>
                {addLoading ? "Creating…" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetTarget} onOpenChange={(open) => { if (!open) { setResetTarget(null); setResetResult(null); setResetError(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for user &ldquo;{resetTarget?.username}&rdquo;? A new random password will be generated.
            </DialogDescription>
          </DialogHeader>
          {resetResult ? (
            <div className="rounded-md border border-green-500/40 bg-green-500/10 px-3 py-3 text-sm">
              <p className="font-medium text-green-600 dark:text-green-400 mb-1">New Password:</p>
              <code className="text-base font-mono font-bold break-all">{resetResult}</code>
              <p className="text-xs text-muted-foreground mt-2">Copy this password — it cannot be recovered.</p>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); resetUserPassword(); }} className="flex flex-col gap-3">
              {resetError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {resetError}
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setResetTarget(null)} disabled={resetLoading}>Cancel</Button>
                <Button type="submit" disabled={resetLoading}>
                  {resetLoading ? "Resetting…" : "Reset Password"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editEmailOpen} onOpenChange={(open) => { if (!open) { setEditEmailOpen(false); setEditEmailTarget(null); setEditEmailError(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Email</DialogTitle>
            <DialogDescription>
              Update the email address for this user.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={editUserEmail} className="flex flex-col gap-3">
            {editEmailError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {editEmailError}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="user@example.com"
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditEmailOpen(false)} disabled={editEmailLoading}>Cancel</Button>
              <Button type="submit" disabled={editEmailLoading}>
                {editEmailLoading ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
