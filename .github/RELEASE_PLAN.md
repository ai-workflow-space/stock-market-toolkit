# Stock Toolkit v0.2.0 Release Plan

> Maintained by: Hermes Agent (Kyle's assistant)
> Last updated: 2026-06-22
> Status: **IN PROGRESS**

---

## Features

### 1. 🔖 Docker Tag with Release Version
**Status: DONE** — `.github/workflows/docker.yml` modified to extract git tag and push both `:latest` and `:vX.Y.Z`

---

### 2. 🎨 Productize Frontend Branding
**Status: DONE** — `frontend/index.html`, `frontend/src/App.tsx`, `frontend/src/pages/LoginPage.tsx`, `frontend/src/pages/RegisterPage.tsx` all updated
- Title → "Stock Toolkit — AI-Powered Stock Analysis"
- SVG favicon, navbar chart icon + version badge, branded hero on auth pages

---

### 3. 🖱️ Draggable Dashboard Panels
**Status: DONE** — react-grid-layout installed, App.tsx modified with GridLayout + CSS imports
- `npm install react-grid-layout @types/react-grid-layout` ✅
- `npm run build` ✅

---

### 4. ⚙️ Settings Page
**Status: DONE** — `frontend/src/context/ThemeContext.tsx`, `frontend/src/hooks/useTheme.ts`, `frontend/src/pages/SettingsPage.tsx`, `frontend/src/App.tsx` all created/modified
- `/settings` route added
- Theme toggle (dark/light) + timezone selector + YF health check

---

### 5. 📊 Rich Compare Page
**Status: DONE** — `frontend/src/App.tsx` (ComparePage function) enhanced
- Performance summary cards (best/worst/average)
- SMA toggle on compare chart
- Price ratio (normalized to 100) chart
- Export CSV button

---

### 6. 🗂️ Issue Tracking Discipline
**Status: DONE** — 7 issues created (#13-#19)
- Every feature = a GitHub issue
- Release plan tracks which issues are in which release

---

### 7. 📖 OpenAPI Page + MCP Endpoint
**Status: DONE** — `backend/app/routes/mcp.py` created, `backend/app/main.py` registered
- `GET /api/mcp/health` → `{"status": "ok", ...}`
- `GET /api/mcp/status`
- Swagger UI at `/docs` (FastAPI default)

---

### 8. 📈 Best Four Point Technical Analysis
**Status: IN PROGRESS** — backend + frontend subagents running
- Backend: `GET /api/analysis/{symbol}?period=1mo` → BUY/SELL/NEUTRAL signal + indicators
- Frontend: `SignalCard` component on dashboard
- Signal logic: BIAS, MACD histogram, KDJ crossover, volume ratio

---

## GitHub Issues

| # | Title |
|---|-------|
| #13 | feat: tag Docker images with release version |
| #14 | feat: productize frontend branding |
| #15 | feat: make dashboard panels draggable |
| #16 | feat: add /settings page |
| #17 | feat: rich compare page |
| #18 | feat: add OpenAPI /docs page and MCP endpoint |
| #19 | feat: best four point technical analysis signal |

---

## Done (v0.1.0)

- Nginx double /api prefix fix
- Docker push on PR builds
- MACD data fix (DataFrame extraction)
- SMA200 conditional render (toggle works)
- MACD/RSI pane toggle
- VITE_API_URL fix
- 0050.TW search fix
- Release workflow
- Port 3030→3800
- Branch protection + PR workflow

---

## Notes

- **Kyle's workflow:** always use OpenCode for file edits, PLAN FIRST, self-verify before requesting review
- **Branch protection:** Kyle must manually approve/merge on GitHub UI
- **Docker Hub:** `kyleckw/stock-market-toolkit-{frontend,backend}:latest`
- **Test account:** `testlogin@test.com` / `Test12345!`
- **Release PAT:** `ghp_kf...4ku5` (manually added to repo secrets by Kyle)
- **Frontend port:** 3800 (project docker-compose)
- **Backend:** http://172.26.155.191:8001
- **Frontend:** http://172.26.155.191:3800