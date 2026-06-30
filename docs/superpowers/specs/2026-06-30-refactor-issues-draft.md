# Architecture Refactor — GitHub Issue Draft Set

> **Status:** DRAFT for review. Nothing has been filed on GitHub yet.
> **Repo:** `ai-workflow-space/stock-market-toolkit`
> **Source:** Reviewed and corrected from `docs/superpowers/plans/2026-06-30-architecture-refactor.md` (OpenCode-generated).
> **Date:** 2026-06-30

---

## 0. Accuracy verdict on the OpenCode plan

| Claim in plan | Reality | Verdict |
|---|---|---|
| `models.py` 283, `schemas.py` 485, `stocks.py` 415, `alert_checker.py` 513 | Correct | ✅ |
| `main.py` 150 lines | Actually **240** | ❌ |
| 16 ORM tables | Actually **15** | ❌ |
| `_clean` duplicated in 2 files | Duplicated in **3** (`routes/stocks.py:37`, `routes/analysis.py:25`, `services/alert_checker.py:72`) | ⚠️ understated |
| 2 cron endpoints in `main.py` | **3** (`/cron/check-alerts`, `/cron/ingest`, `/cron/ingest/status`) | ⚠️ understated |
| Cache TTLs scattered | TTLs are co-located in provider files (reasonable); only 2 *dead duplicate* `CACHE_TTL=300` constants | ⚠️ overstated |
| Model code (Task 1 snippets) | **Fabricated.** Real models use SQLAlchemy 1.x `Column(...)` + `Base` from `app.database`; plan rewrites in 2.0 `Mapped`/`mapped_column` + new `DeclarativeBase`, invents/drops fields, changes `User.id` `String`→`int`, has syntax errors (`revenue YoY:`, `Mapped \| None = None`) | ❌ **unsafe — discard** |
| Schema code (Task 2 snippets) | **Fabricated.** Real schemas are Pydantic v2 with names `UserRegister`/`RefreshRequest`/`StockDataResponse`/`IndicatorsResponse`…; plan invents `LoginRequest`/`OHLCVResponse`/`SignalResponse` and imports nonexistent `PaginationParams` from pydantic; re-export refs `NotificationSetting` (real: `NotificationSettings`) → ImportError | ❌ **unsafe — discard** |
| Cron `cron.py` snippet | Calls `check_all_alerts`/`nightly_ingestion`; real fns are `check_alerts`/`run_nightly_ingest`/`get_latest_job_run` | ❌ wrong names |

**Conclusion:** The *diagnoses* (oversized flat files, duplication, cron in entrypoint) are real and worth fixing. The *embedded code* is hallucinated and must not be executed. Every issue below is reframed as a **mechanical move that preserves existing definitions verbatim** — no rewriting field definitions, no SQLAlchemy/Pydantic style changes.

Also note: OpenCode produced the **conservative Prompt-1** layout (split by technical layer). It did **not** implement the Prompt-2 vertical-domain slices (`portfolio`, `ai`, `backtesting`, `workflow` don't exist in the codebase). These issues track the conservative, low-risk split only.

---

## Cross-cutting constraints (apply to every issue)

- **Preserve all definitions byte-for-byte.** Cut and paste existing classes/functions; do not retype or "modernize" them.
- **No API contract changes.** Same routes, same response models, same status codes.
- **Keep `from app.database import Base`.** Do not introduce a second `Base`/`DeclarativeBase`.
- **Verify each step with the existing suite:** `pytest backend/tests/ -q` (suite already exists: `test_stocks.py`, `test_analysis.py`, `test_alerts_discord.py`, `test_ingestion.py`, `test_scoring.py`, `test_migration_baseline.py`, …).
- One PR per issue; each is independently revertable.

---

## Implementation order

```
#1 Split models  ─┐ (independent foundations)
#2 Split schemas ─┘
        ↓
#3 Dedupe _clean (3 copies)
        ↓
#4 Extract cron routes
        ↓
#5 Split routes/stocks.py   (consumes #3 shared _clean; #2 schema package optional)
        ↓
#6 Decompose alert_checker notifications  (most complex — last)
```

`#1` and `#2` are fully independent and can run in parallel. `#3` should land before `#5` so the route split imports the shared helper instead of re-copying it.

---

## Issue #1 — Split `models.py` into a `models/` package (mechanical move)

**Labels:** `refactor`, `backend`, `foundation`
**Depends on:** none

### Problem
`backend/app/models.py` (283 lines) holds all **15** ORM models in one flat module — SRP violation, navigation/merge-conflict friction.

### Approach (CRITICAL)
Convert the single module into a **package** and move each class **exactly as written** (`Column(...)` style preserved, `Base` still from `app.database`). The old `models.py` file is **deleted** and replaced by `models/__init__.py` that re-exports everything, so `from app.models import X` keeps working. Do **not** keep both a `models.py` file and a `models/` package — Python cannot have both.

### Steps
- [ ] Create `backend/app/models/` package.
- [ ] Move classes verbatim into submodules grouped by area:
  - `models/user.py` → `User`
  - `models/watchlist.py` → `Watchlist`
  - `models/alert.py` → `Alert`, `AlertCondition`, `NotificationSettings`, `TriggeredAlert`, `NotificationDelivery`
  - `models/fundamentals.py` → `FinancialStatement`, `Dividend`, `SymbolScore`, `MonthlyRevenue`
  - `models/admin.py` → `InviteCode`, `AuditLog`, `SmtpSettings`, `JobRun`
- [ ] Each submodule imports `from app.database import Base` (and any `sqlalchemy`/`func` symbols it uses).
- [ ] Cross-model relationships use **string** targets (`relationship("User", ...)`) — these resolve via the shared registry, so cross-file is fine **as long as every submodule is imported**.
- [ ] Create `models/__init__.py` re-exporting all 15 classes + `Base` with explicit `__all__` (use the **real** class names — note `NotificationSettings`, not `NotificationSetting`).
- [ ] Delete the old `backend/app/models.py`.
- [ ] **Verify Alembic still sees all tables:** confirm `backend/app/alembic/env.py` imports the models package so `Base.metadata` is fully populated. Run `alembic check` / autogenerate dry-run and confirm **no** spurious "drop table" diffs.
- [ ] `pytest backend/tests/test_migration_baseline.py backend/tests/ -q` — all green.

### Acceptance criteria
- `from app.models import <any of the 15>` works unchanged.
- Alembic autogenerate produces an empty diff (no model lost from metadata).
- Full test suite passes.

### Risks
- **Registry/relationship resolution:** if a submodule is never imported, its mapper isn't configured → `InvalidRequestError`. The `__init__.py` re-export prevents this.
- **Alembic metadata:** the #1 failure mode is `env.py` importing a now-missing symbol or missing a table. Explicitly verify.

---

## Issue #2 — Split `schemas.py` into a `schemas/` package (mechanical move)

**Labels:** `refactor`, `backend`, `foundation`
**Depends on:** none

### Problem
`backend/app/schemas.py` (485 lines) holds **~50** Pydantic v2 models in one module.

### Approach (CRITICAL)
Same pattern as #1: convert to a `schemas/` package, move each class **verbatim** (keep Pydantic v2 `class Config: from_attributes` / `field_validator` exactly), re-export from `__init__.py`. **Use the real class names** — do not invent `LoginRequest`/`OHLCVResponse`/etc. Do not import `PaginationParams` (it does not exist).

### Steps
- [ ] Create `backend/app/schemas/` package; delete flat `schemas.py` at the end.
- [ ] Move classes verbatim into submodules by area (real names):
  - `schemas/auth.py` → `UserRegister`, `UserLogin`, `TokenResponse`, `RefreshRequest`, `UserResponse`
  - `schemas/stock.py` → `StockDataResponse`, `IndicatorsResponse`, `StockInfoResponse`, `CompareRequest`, `CompareStockData`, `CompareResponse`
  - `schemas/fundamentals.py` → `ProfitabilityMetrics`, `DividendQualityDetails`, `FundamentalsResponse`, `YearlyDividend`, `DividendsResponse`, `FinancialStatementResponse`, `DividendResponse`, `SymbolScoreResponse`, `MonthlyRevenueResponse`
  - `schemas/news.py` → `NewsArticle`, `NewsResponse`
  - `schemas/alert.py` → `AlertConditionCreate`, `AlertConditionResponse`, `AlertCreate`, `AlertUpdate`, `AlertResponse`, `TriggeredAlertResponse`, `NotificationSettingsResponse`, `NotificationSettingsUpdate`, `NotificationDeliveryResponse`, `DiscordTestRequest`
  - `schemas/admin.py` → `InviteCodeCreate`, `InviteCodeResponse`, `InviteCodeListResponse`, `InviteSendRequest`, `InviteSendResponse`, `InviteRevokeRequest`, `AuditLogResponse`, `AuditLogListResponse`, `SmtpSettingsResponse`, `SmtpSettingsUpdate`, `SmtpTestRequest`, `SmtpTestResponse`
  - `schemas/watchlist.py` → `WatchlistCreate`, `WatchlistResponse`
  - `schemas/ingestion.py` → `JobRunResponse`, `IngestStatusResponse`
- [ ] `schemas/__init__.py` re-exports all classes with `__all__`.
- [ ] Grep every `from app.schemas import ...` site — all must still resolve.
- [ ] `pytest backend/tests/ -q`.

### Acceptance criteria
- Every existing `from app.schemas import X` still resolves.
- OpenAPI schema (`/openapi.json`) is byte-identical for response model names.
- Tests pass.

### Risks
- Easy to miss a class during the move (50 of them). Cross-check count: `grep -c "^class " ` before vs. sum of submodules.

---

## Issue #3 — Deduplicate `_clean` / `_clean_list` into a shared helper

**Labels:** `refactor`, `backend`, `tech-debt`
**Depends on:** none (do before #5)

### Problem
`_clean` is copy-pasted in **3** places:
- `backend/app/routes/stocks.py:37` (`_clean` + `_clean_list:43`)
- `backend/app/routes/analysis.py:25` (`_clean` + `_clean_list:31`)
- `backend/app/services/alert_checker.py:72` (`_clean`)

Plus two dead duplicate `CACHE_TTL = 300` module constants (`routes/stocks.py:34`, `routes/analysis.py:14`) that aren't the real cache (caching lives in providers).

### Approach
Add one shared helper module and import it everywhere. The real implementation uses `math.isnan/isinf` (**not numpy** — the plan's `np.isnan` is wrong). Before merging, diff the three `_clean` bodies and confirm they're semantically identical (alert_checker's may differ slightly).

### Steps
- [ ] Add `backend/app/utils/numeric.py` (package `app/utils/` already exists) with:
  - `_clean(v)` — the `math.isnan/isinf → None` version from `routes/stocks.py`.
  - `_clean_list(lst)`.
- [ ] Diff the 3 existing `_clean` bodies; if alert_checker's differs, reconcile deliberately and note it in the PR.
- [ ] Replace local defs in `routes/analysis.py` and `services/alert_checker.py` with `from app.utils.numeric import _clean, _clean_list`.
- [ ] (`routes/stocks.py` import is wired up in #5 after the split, to avoid churn here.)
- [ ] Remove the two dead `CACHE_TTL = 300` constants if confirmed unused.
- [ ] `pytest backend/tests/test_analysis.py backend/tests/test_alerts_discord.py -q`.

### Acceptance criteria
- Exactly one definition of `_clean`/`_clean_list` in the codebase.
- Analysis and alert tests pass.

### Risks
- Low. Only watch for a behavioral diff between the three copies.

---

## Issue #4 — Extract cron endpoints from `main.py` into `routes/cron.py`

**Labels:** `refactor`, `backend`
**Depends on:** none

### Problem
Three cron endpoints are defined inline in the app entrypoint `backend/app/main.py:172-240`: `/cron/check-alerts`, `/cron/ingest`, `/cron/ingest/status` — mixing scheduling concerns into bootstrap.

### Approach
Move all **three** handlers verbatim into a new `APIRouter`. Preserve exact behavior, including the `JobRun` "already running" guard in `/cron/ingest` and the full status payload in `/cron/ingest/status`. Use the **real** service functions: `check_alerts`, `run_nightly_ingest`, `get_latest_job_run` (the plan's `check_all_alerts`/`nightly_ingestion` are wrong).

### Steps
- [ ] Create `backend/app/routes/cron.py` with `router = APIRouter(tags=["cron"])` (keep full `/cron/...` paths to avoid changing the contract; do **not** add a prefix that would alter URLs).
- [ ] Move the three handler bodies exactly as-is (keep the in-function lazy imports they currently use).
- [ ] In `main.py`: remove the three handlers, add `from app.routes import cron` and `app.include_router(cron.router)`.
- [ ] Confirm route paths unchanged via `/openapi.json` diff.
- [ ] `pytest backend/tests/test_ingestion.py -q` + a manual `POST /cron/check-alerts` smoke check.

### Acceptance criteria
- The three `/cron/*` paths respond identically (same methods, same JSON shape).
- `main.py` no longer defines cron handlers.

### Risks
- Path drift if a prefix is added — explicitly keep absolute paths.

---

## Issue #5 — Split `routes/stocks.py` into focused route modules

**Labels:** `refactor`, `backend`
**Depends on:** #3 (shared `_clean`); #2 helpful but optional

### Problem
`backend/app/routes/stocks.py` (415 lines) serves **8** endpoints across distinct concerns (all under prefix `/api`):
- `GET /api/stock/{symbol}` (OHLCV), `GET /api/stock/{symbol}/indicators`, `POST /api/compare` — price/chart
- `GET /api/stock/{symbol}/info`, `GET /api/stock/{symbol}/fundamentals`, `GET /api/stock/{symbol}/dividends` — company/fundamentals
- `GET /api/search` — symbol search (note: real path is `/api/search`, **not** `/stock/search`)
- `GET /api/stock/{symbol}/news` — news

### Approach
Move endpoint groups into new modules, each with its own `APIRouter(prefix="/api", tags=[...])`. Register all in `main.py`. Keep handler bodies verbatim; switch the moved handlers to import `_clean`/`_clean_list` from `app.utils.numeric` (#3).

### Steps
- [ ] `routes/stocks.py` keeps OHLCV + indicators + `/compare` (price/chart).
- [ ] Create `routes/stock_info.py` → `info`, `fundamentals`, `dividends` handlers.
- [ ] Create `routes/search.py` → `/search` handler (no auth dependency currently — preserve that).
- [ ] Create `routes/news.py` → `/stock/{symbol}/news` handler.
- [ ] Each new module: own `APIRouter(prefix="/api", ...)`; move only the imports it needs.
- [ ] Wire shared helper import (`from app.utils.numeric import _clean, _clean_list`) and delete the local copies in `stocks.py`.
- [ ] `main.py`: `app.include_router(...)` for each new router.
- [ ] Confirm `/openapi.json` lists the same 8 operations with identical paths/models.
- [ ] `pytest backend/tests/test_stocks.py -q`.

### Acceptance criteria
- All 8 endpoints respond identically; no path/auth changes.
- `stocks.py` reduced to price/chart concern only.

### Risks
- Forgetting to register a new router → 404. The `/openapi.json` diff catches this.
- `/search` currently has no `get_current_user` dependency — must stay public.

---

## Issue #6 — Decompose `alert_checker.py` notification dispatch

**Labels:** `refactor`, `backend`, `alerts`
**Depends on:** #3 (shared `_clean`); do last

### Problem
`backend/app/services/alert_checker.py` (513 lines) mixes alert **evaluation** (`_evaluate_condition`, `_should_trigger`, `_check_multi_condition`, indicator fetching) with **notification delivery** (`_build_discord_embed`, `_send_discord_notification`, `_build_email_body`, email via `send_email`, and `NotificationDelivery` record writing inside `check_alerts`).

### Approach
Extract channel delivery into `services/notification/` while leaving evaluation + orchestration in `alert_checker.py`. Keep behavior identical: same Discord embed payload, same email body, same `NotificationDelivery` rows (channel/status/http_status/error).

### Steps
- [ ] Create `services/notification/discord.py` → move `_build_discord_embed` + `_send_discord_notification` (returns `(success, http_status, error)`).
- [ ] Create `services/notification/email.py` → move `_build_email_body` + the `send_email` invocation wrapper (reads `SmtpSettings` id=1 as today).
- [ ] (Optional) `services/notification/__init__.py` exposing the channel callables; defer a full `Channel` ABC unless it earns its keep (avoid over-abstraction).
- [ ] In `check_alerts`, replace inline dispatch with calls into the new modules; keep the `NotificationDelivery` persistence where it is.
- [ ] `alert_checker.py` retains evaluation/orchestration + its `_clean` now sourced from `app.utils.numeric`.
- [ ] `pytest backend/tests/test_alerts_discord.py -q` + send-test Discord path.

### Acceptance criteria
- Identical Discord/email payloads and identical `NotificationDelivery` records.
- `alert_checker.py` no longer contains channel-specific HTTP/SMTP code.

### Risks
- Highest-risk change (live notifications). The existing `test_alerts_discord.py` is the guardrail; consider adding an email-path test before refactoring.

---

## Optional follow-up (NOT an issue yet)

A Prompt-2 vertical-domain reorg (`domains/market-data/…`, `domains/alerts/…`) is a much larger, higher-churn change and several proposed domains (`portfolio`, `ai`, `backtesting`, `workflow`) don't exist yet. Recommend deferring until the conservative split lands and a concrete feature actually needs a new domain. Can be tracked as a single epic later if desired.
```