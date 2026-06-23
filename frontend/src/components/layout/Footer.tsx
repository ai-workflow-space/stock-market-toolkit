const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? "1.0.0";

export default function Footer() {
  const sha = (import.meta.env.VITE_GIT_SHA as string) || "local";
  const buildTime = (import.meta.env.VITE_BUILD_TIME as string) || "";
  return (
    <footer className="mx-auto flex w-full max-w-[1440px] items-center gap-3 px-4 sm:px-6 py-4 text-xs text-muted-foreground">
      <span>v{APP_VERSION}</span>
      {sha && <span className="font-mono">@{sha}</span>}
      {buildTime && <span>built {buildTime}</span>}
    </footer>
  );
}
