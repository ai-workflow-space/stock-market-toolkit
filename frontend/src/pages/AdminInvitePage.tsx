import { useState, useEffect, useCallback } from "react";
import { Copy, Check, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

const API = import.meta.env.VITE_API_URL || "";

interface InviteCode {
  id: number;
  code: string;
  created_by: string;
  used_by: string | null;
  used_at: string | null;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

interface InviteCodeListResponse {
  codes: InviteCode[];
  total: number;
}

interface CreateInviteCodeRequest {
  expires_in_days: number;
}

/* ─── Create Invite Code Dialog ─── */
function CreateInviteCodeDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (code: string) => void;
}) {
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const days = parseInt(expiresInDays, 10);
    if (isNaN(days) || days < 1 || days > 365) {
      setError("Expiration must be between 1 and 365 days");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API + "/api/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("access_token") ?? ""}` },
        body: JSON.stringify({ expires_in_days: days } as CreateInviteCodeRequest),
      });
      if (!res.ok) {
        const data = await res.json() as { detail?: string };
        throw new Error(data.detail || "Failed to create invite code");
      }
      const data = await res.json() as InviteCode;
      onCreated(data.code);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to create invite code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Invitation Code</DialogTitle>
          <DialogDescription>
            Create a new invitation code for new user registration
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="expires">Expires in (days)</Label>
              <Input
                id="expires"
                type="number"
                min="1"
                max="365"
                value={expiresInDays}
                onChange={e => setExpiresInDays(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                The code will expire after this many days (1-365)
              </p>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Generating..." : "Generate Code"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Copy Button ─── */
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Button variant="ghost" size="icon" onClick={handleCopy} aria-label="Copy code">
      {copied ? <Check className="size-4 text-up" /> : <Copy className="size-4" />}
    </Button>
  );
}

/* ─── Main Admin Invite Page ─── */
export default function AdminInvitePage() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState<string | null>(null);

  const loadCodes = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(API + "/api/admin/invite-codes", {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token") ?? ""}` },
      });
      if (!res.ok) {
        const data = await res.json() as { detail?: string };
        throw new Error(data.detail || "Failed to load invite codes");
      }
      const data = await res.json() as InviteCodeListResponse;
      setCodes(data.codes);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load invite codes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCodes();
  }, [loadCodes]);

  const handleDeactivate = async (codeId: number) => {
    if (!confirm("Deactivate this invitation code?")) return;
    try {
      const res = await fetch(API + "/api/admin/invite-codes/" + codeId, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token") ?? ""}` },
      });
      if (!res.ok) {
        const data = await res.json() as { detail?: string };
        throw new Error(data.detail || "Failed to deactivate code");
      }
      setCodes(prev => prev.map(c => c.id === codeId ? { ...c, is_active: false } : c));
    } catch (err: unknown) {
      alert((err as Error).message || "Failed to deactivate code");
    }
  };

  const handleCodeCreated = (code: string) => {
    setNewCode(code);
    void loadCodes();
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        <Skeleton className="h-9 w-60" />
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
        <div>
          <h1 className="text-2xl font-semibold">Invitation Codes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generate and manage invitation codes for new user registration
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="size-4 mr-1.5" />
          Generate Code
        </Button>
      </div>

      {error && (
        <Card className="mb-4 border-destructive/40 bg-destructive/10">
          <CardContent className="py-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {newCode && (
        <Card className="mb-4 border-up/40 bg-up/10">
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <Check className="size-4 text-up" />
              <span className="text-sm font-medium">New invitation code:</span>
              <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">{newCode}</code>
            </div>
            <CopyButton value={newCode} />
          </CardContent>
        </Card>
      )}

      {codes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-muted-foreground">No invitation codes yet</p>
            <Button onClick={() => setShowCreate(true)}>Generate your first code</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {codes.map(code => (
            <Card
              key={code.id}
              className={!code.is_active || isExpired(code.expires_at) ? "opacity-60" : ""}
            >
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-muted px-2 py-0.5 text-sm font-mono break-all">
                      {code.code}
                    </code>
                    <CopyButton value={code.code} />
                    {code.used_by && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                        Used
                      </span>
                    )}
                    {!code.is_active && (
                      <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-xs text-destructive">
                        Deactivated
                      </span>
                    )}
                    {isExpired(code.expires_at) && (
                      <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-xs text-destructive">
                        Expired
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>
                      Created {new Date(code.created_at).toLocaleDateString()}
                    </span>
                    <span>
                      Expires {new Date(code.expires_at).toLocaleDateString()}
                    </span>
                    {code.used_by && (
                      <span>Used by {code.used_by}</span>
                    )}
                  </div>
                </div>
                {code.is_active && !isExpired(code.expires_at) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeactivate(code.id)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    aria-label="Deactivate code"
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateInviteCodeDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCodeCreated}
      />
    </div>
  );
}
