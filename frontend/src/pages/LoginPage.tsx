import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import axios from "axios";
import { APP_VERSION, RELEASE_URL } from "@/lib/version";

function BrandMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="#0f172a" />
      <polyline points="4,22 10,14 16,18 22,8 28,12" stroke="#3b82f6" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="28" cy="12" r="2" fill="#22c55e" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usersExist, setUsersExist] = useState<boolean | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL || ""}/api/auth/users/count`)
      .then(res => setUsersExist(res.data.count > 0))
      .catch(() => setUsersExist(true));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || t("login.loginFailed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="flex items-center gap-2 font-semibold">
            <BrandMark /> Stock Toolkit
          </div>
          <CardTitle className="text-xl">{t("login.welcome")}</CardTitle>
          <CardDescription>{t("login.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {usersExist === false && (
            <div className="rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">{t("login.newHere.badge")}</strong> {t("login.newHere.text")}{" "}
              <Link to="/bootstrap" className="text-primary underline-offset-4 hover:underline">{t("login.newHere.setupLink")}</Link>{" "}
              {t("login.newHere.suffix")}
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t("login.emailLabel")}</Label>
              <Input id="email" type="text" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{t("login.passwordLabel")}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("login.signingIn") : t("login.signIn")}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {t("login.noAccount")}{" "}
            <Link to={usersExist === false ? "/bootstrap" : "/register"} className="text-primary underline-offset-4 hover:underline">
              {usersExist === false ? t("login.setupSystem") : t("login.requestAccess")}
            </Link>
          </p>

          <p className="text-center text-xs text-muted-foreground">
            <a
              href={RELEASE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              v{APP_VERSION}
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
