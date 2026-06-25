// Single source of truth for the displayed app version.
//
// At build time Vite injects VITE_APP_VERSION (set by the Docker build-arg in
// CI from the release tag — see frontend/Dockerfile + .github/workflows/docker.yml).
// The fallback below is used only when the env var is absent (e.g. local `vite
// dev`) and is bumped automatically by release-please (release-please-config.json
// extra-files) so it never drifts behind the released version.
export const APP_VERSION =
  (import.meta.env.VITE_APP_VERSION as string) || "0.3.0"; // x-release-please-version

// Centralized release page URL — used by Navbar and Footer
export const RELEASE_URL =
  `https://github.com/ai-workflow-space/stock-market-toolkit/releases/tag/v${APP_VERSION}`;
