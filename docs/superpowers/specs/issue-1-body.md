> **Follow the implementation plan:** [`docs/superpowers/plans/2026-06-30-issue-1-split-models.md`](../plans/2026-06-30-issue-1-split-models.md). The plan is the source of truth — execute it task-by-task (Task 1 regression guard → Task 2 the move → Validation Gate). The steps below are a summary; the plan has the full bite-sized steps, exact commands, and rollback.

## Problem

`backend/app/models.py` (283 lines) holds all **15** ORM models in one flat module — an SRP violation that makes navigation and merge conflicts worse as the model count grows.

## Approach

Convert the single module into a `models/` **package**, moving each class **verbatim** (`Column(...)` style preserved, `Base` still imported from `app.database`). The old `models.py` is **deleted** and replaced by `models/__init__.py`, which re-exports everything so `from app.models import X` keeps working.

- No SQLAlchemy style change (keep `Column`, do **not** convert to `mapped_column`).
- No schema change → no Alembic migration → database untouched.
- Class names preserved exactly (note `NotificationSettings`, `SymbolScore`, `MonthlyRevenue`).
- Cannot keep both a `models.py` file and a `models/` package — the flat file is removed in the same change.

## Scope

Group the 15 models by area:

| Submodule | Models |
|---|---|
| `models/user.py` | `User` |
| `models/watchlist.py` | `Watchlist` |
| `models/alert.py` | `Alert`, `AlertCondition`, `NotificationSettings`, `TriggeredAlert`, `NotificationDelivery` |
| `models/fundamentals.py` | `FinancialStatement`, `Dividend`, `SymbolScore`, `MonthlyRevenue` |
| `models/admin.py` | `InviteCode`, `JobRun`, `SmtpSettings`, `AuditLog` |
| `models/__init__.py` | re-exports all 15 + `Base` with explicit `__all__` |

## Implementation steps

### 1. Add a regression guard first (must be green before and after the move)

`backend/tests/test_models_registry.py` — characterizes the current model set so the move can't silently drop/rename/duplicate a model:

```python
"""Regression guard for the models package split (Issue #1)."""
from app.database import Base
from app import models

EXPECTED_MODELS = [
    "User", "Watchlist", "Alert", "AlertCondition", "NotificationSettings",
    "TriggeredAlert", "NotificationDelivery", "InviteCode", "FinancialStatement",
    "Dividend", "SymbolScore", "MonthlyRevenue", "JobRun", "SmtpSettings", "AuditLog",
]
EXPECTED_TABLES = [
    "users", "watchlists", "alerts", "alert_conditions", "notification_settings",
    "triggered_alerts", "notification_deliveries", "invite_codes",
    "financial_statements", "dividends", "symbol_scores", "monthly_revenue",
    "job_runs", "smtp_settings", "audit_logs",
]

def test_all_models_importable():
    for name in EXPECTED_MODELS:
        assert hasattr(models, name), f"app.models missing {name}"

def test_model_count_is_fifteen():
    assert len(EXPECTED_MODELS) == 15

def test_tables_registered_and_no_drift():
    assert set(Base.metadata.tables.keys()) == set(EXPECTED_TABLES)
```

Run `pytest backend/tests/test_models_registry.py -v` → should pass against the current flat `models.py`. Commit.

### 2. Create the submodules — move each class **verbatim**

Each submodule keeps the existing `Column(...)` bodies unchanged; only the import header is new. Pattern (e.g. `models/user.py`):

```python
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

# class User(Base):  ... paste verbatim from models.py:18-40
```

Source line ranges to copy (from current `models.py`):

- `user.py` → `User` (18-40)
- `watchlist.py` → `Watchlist` (43-49)
- `alert.py` → `Alert` (52-78), `AlertCondition` (81-92), `NotificationSettings` (95-109), `TriggeredAlert` (112-132), `NotificationDelivery` (135-150)
- `fundamentals.py` → `FinancialStatement` (174-189), `Dividend` (192-203), `SymbolScore` (206-222), `MonthlyRevenue` (225-239)
- `admin.py` → `InviteCode` (153-168), `JobRun` (242-253), `SmtpSettings` (256-269), `AuditLog` (272-283)

Relationships reference targets by string (`relationship("Alert", ...)`) so cross-file works **as long as every submodule is imported** — which `__init__.py` guarantees.

### 3. Add `models/__init__.py` re-exporting everything

```python
from app.database import Base
from .user import User
from .watchlist import Watchlist
from .alert import (
    Alert, AlertCondition, NotificationSettings,
    TriggeredAlert, NotificationDelivery,
)
from .fundamentals import FinancialStatement, Dividend, SymbolScore, MonthlyRevenue
from .admin import InviteCode, JobRun, SmtpSettings, AuditLog

__all__ = [
    "Base", "User", "Watchlist", "Alert", "AlertCondition", "NotificationSettings",
    "TriggeredAlert", "NotificationDelivery", "InviteCode", "FinancialStatement",
    "Dividend", "SymbolScore", "MonthlyRevenue", "JobRun", "SmtpSettings", "AuditLog",
]
```

### 4. Delete the flat module

```bash
git rm backend/app/models.py
```

(Prevents `models.py` and the `models/` package from coexisting — ambiguous on import.)

### 5. Verify

```bash
pytest backend/tests/test_models_registry.py -v   # guard still green via the package
pytest backend/tests/ -q                          # full suite
ruff check backend/app/models/                    # trim any unused per-file imports
python -c "import app.main"                        # app imports cleanly
```

## Acceptance criteria

- [ ] `from app.models import <any of the 15>` resolves unchanged.
- [ ] A new regression guard (`backend/tests/test_models_registry.py`) asserts all 15 models import and all 15 tables are present in `Base.metadata`.
- [ ] Full suite green: `pytest backend/tests/ -q`.
- [ ] `ruff check backend/app/models/` clean (no unused per-submodule imports).
- [ ] App imports: `python -c "import app.main"` exits 0.

## Risks

- **Registry/relationship resolution:** if a submodule is never imported, its mapper isn't configured → `InvalidRequestError`. The `__init__.py` re-export imports every submodule, preventing this.
- **Metadata completeness:** `env.py` imports `Base` from `app.database` but not the models, so `Base.metadata` is only populated when `app.models` is imported. The registry test is the guard against a model silently dropping out of metadata.

## Notes

This is issue **1 of 6** in a conservative architecture refactor (split oversized flat files; no behavior change). Foundation step — no dependencies. Implementation plan: `docs/superpowers/plans/2026-06-30-issue-1-split-models.md`.
