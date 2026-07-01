import { useTranslation } from "react-i18next";
import { APP_VERSION, RELEASE_URL } from "@/lib/version";

export default function Footer() {
  const { t } = useTranslation();
  const sha = (import.meta.env.VITE_GIT_SHA as string) || "local";
  const buildTime = (import.meta.env.VITE_BUILD_TIME as string) || "";
  return (
    <footer className="mx-auto flex w-full max-w-[1440px] items-center gap-3 px-4 sm:px-6 py-4 text-xs text-muted-foreground">
      <a href={RELEASE_URL} target="_blank" rel="noopener noreferrer" className="hover:underline">{APP_VERSION}</a>
      {sha && <span className="font-mono">@{sha}</span>}
      {buildTime && <span>{t("common.footer.built", { time: buildTime })}</span>}
    </footer>
  );
}
