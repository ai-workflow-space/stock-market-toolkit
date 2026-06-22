# Stock Toolkit v0.2.0 Release Plan

> Maintained by: Hermes Agent (Kyle's assistant)
> Last updated: 2026-06-22
> Status: **IN PROGRESS**

## Background
Kyle wants the Stock Toolkit to feel like a real product, not a demo. Several improvements are planned for v0.2.0.

---

## Features (in priority order)

### 1. 🔖 Docker Tag with Release Version
**Problem:** Docker Hub images only get `:latest` tag — no versioned releases.
**Solution:** When release-please cuts a new version (e.g. `v0.1.0`), the Docker build workflow should also tag the image as `v0.1.0` and push alongside `:latest`.

**Files to change:**
- `.github/workflows/docker.yml`

**Verification:**
- [ ] After next release, Docker Hub shows both `:latest` and `:v0.x.x` tags
- [ ] `docker pull kyleckw/stock-market-toolkit-frontend:v0.x.x` works

---

### 2. 🎨 Productize Frontend Branding
**Problem:** Site title/logo says "frontend" or generic "Stock Toolkit" — doesn't feel like a polished product.
**Solution:**
- Branded product name (e.g., "StockFlow" or keep "Stock Toolkit" with better presentation)
- Custom favicon
- Branded login/register page with product screenshot/hero art
- Professional navbar with logo + version badge
- Footer with version, links, status

**Files to change:**
- `frontend/index.html` (title, meta, favicon)
- `frontend/src/App.tsx` (navbar logo/branding)
- `frontend/src/components/Footer.tsx` (or add if missing)
- `frontend/src/pages/LoginPage.tsx` (hero/brand art)
- `frontend/src/pages/RegisterPage.tsx` (hero/brand art)

**Verification:**
- [ ] Browser tab shows branded title
- [ ] Login page has professional branding
- [ ] Navbar shows product name + version badge

---

### 3. 🖱️ Draggable Dashboard Panels
**Problem:** Dashboard panels are in fixed positions — users can't rearrange.
**Solution:**
- Make chart panels (price, RSI, MACD) draggable within the grid
- Use a library like `react-grid-layout` or `@dnd-kit`
- Persist layout to localStorage

**Files to change:**
- `frontend/src/pages/DashboardPage.tsx`
- Add `react-grid-layout` or similar

**Verification:**
- [ ] Panels can be dragged and reordered
- [ ] Layout persists across page refresh

---

### 4. ⚙️ Settings Page
**Problem:** No user-configurable settings.
**Solution:**
- New `/settings` route
- Theme toggle (dark/light — dark is default)
- Timezone selection
- YFinance health check (test connectivity button)
- API base URL display

**Files to change:**
- `frontend/src/App.tsx` (add `/settings` route)
- `frontend/src/pages/SettingsPage.tsx` (new file)
- `frontend/src/context/ThemeContext.tsx` (new file)
- `frontend/src/hooks/useTheme.ts` (new file)

**Verification:**
- [ ] `/settings` route accessible
- [ ] Theme toggle works
- [ ] YF health check returns status

---

### 5. 📊 Rich Compare Page
**Problem:** Compare page is basic — just shows price lines.
**Solution:**
- Performance summary cards (best/worst performer, % change)
- Add moving average lines (SMA20, SMA200) toggle
- Correlation coefficient display
- Price ratio chart (normalize to 100 at start)
- Custom date range picker
- Export to CSV

**Files to change:**
- `frontend/src/pages/ComparePage.tsx`

**Verification:**
- [ ] Performance cards show best/worst
- [ ] SMA toggle works on compare chart
- [ ] CSV export works

---

### 6. 🗂️ Issue Tracking Discipline
**Problem:** Findings get lost between sessions.
**Solution:**
- Every bug/feature = a GitHub issue
- Each PR closes ≥1 issue
- This release plan document tracks which issues are in which release
- Before requesting Kyle's review: verify all linked issues are fixed

**Tracking:**
- See GitHub Issues: https://github.com/ai-workflow-space/stock-market-toolkit/issues

---

### 7. 📖 OpenAPI Page + MCP Endpoint
**Problem:** No API documentation page for developers.
**Solution:**
- Serve Swagger UI at `/docs` (FastAPI already supports this)
- Add `/api/mcp` endpoint — Model Context Protocol endpoint for AI agents to query the toolkit
- MCP endpoint: `GET /api/mcp?action=stock&symbol=AAPL&period=1mo` (structured JSON for LLM consumption)

**Files to change:**
- `backend/app/main.py` (register MCP router at `/api/mcp`)
- `backend/app/routes/mcp.py` (new file)

**Verification:**
- [ ] `GET /docs` shows Swagger UI
- [ ] `GET /api/mcp?action=ping` returns `{"status": "ok", "version": "0.2.0"}`
- [ ] MCP endpoint returns structured data for LLM parsing

---

### 8. 📈 Best Four Point Technical Analysis
**Problem:** Users want investment recommendations, not just raw data.
**Solution:**
Implement `ta.best_four_point` style analysis from twstock:
- **Dai4dian (dg4)** — 第四點：判斷是否為買點/賣點
  1. **乖離度 (BIAS)** — 價格偏離均線程度
  2. **MACD 柱狀圖方向** — MACD histogram momentum
  3. **KDJ (KD指標)** — 隨機指標金叉/死叉
  4. **成交量變化** — Volume surge confirmation
- Display as a "Signal Card" on dashboard: BUY / NEUTRAL / SELL with confidence score
- One-click alerts when signal changes

**Files to change:**
- `backend/app/routes/analysis.py` (new file — `GET /api/analysis/{symbol}`)
- `frontend/src/components/SignalCard.tsx` (new file)
- `frontend/src/pages/DashboardPage.tsx` (add signal card)
- Add to `frontend/src/App.tsx` if new route needed

**Signal logic (inspired by twstock):**
```
BUY = BIAS < -3 AND MACD_histogram > 0 AND K > D AND volume > avg_volume * 1.2
SELL = BIAS > +3 AND MACD_histogram < 0 AND K < D AND volume > avg_volume * 1.2
NEUTRAL = otherwise
```

**Verification:**
- [ ] Signal card appears on dashboard
- [ ] Shows BUY/NEUTRAL/SELL with reasoning
- [ ] Updates when period changes

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