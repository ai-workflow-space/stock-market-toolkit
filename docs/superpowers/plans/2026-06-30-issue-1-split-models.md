# Issue #1 — Split `models.py` into a `models/` Package — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the flat `backend/app/models.py` (283 lines, 15 ORM models) into a `models/` package of domain submodules, preserving every class definition byte-for-byte and keeping `from app.models import X` working unchanged.

**Architecture:** Pure mechanical move. Each model class is cut verbatim into a domain submodule that imports `Base` from `app.database` (unchanged). A new `models/__init__.py` re-exports all classes (and `Base`) so every existing import site keeps resolving. The old flat `models.py` is deleted in the same change so Python never sees both a `models.py` module and a `models/` package. No schema change → no migration → the database on disk is untouched.

**Tech Stack:** SQLAlchemy 2.0 `DeclarativeBase` with legacy `Column(...)` mappings (existing style — do **not** convert to `mapped_column`), Pytest, FastAPI.

## Global Constraints

- Python 3.12+.
- **Preserve every class definition byte-for-byte** — cut and paste, do not retype or "modernize". Keep `Column(...)`, not `mapped_column`.
- Keep `from app.database import Base` in every submodule. Do **not** create a new `Base`/`DeclarativeBase`.
- No API contract changes; no schema changes; no Alembic migration generated.
- All 15 model class names preserved exactly — note `NotificationSettings` (plural), `SymbolScore`, `MonthlyRevenue`.
- The full existing suite must stay green: `pytest backend/tests/ -q`.
- This plan is the **first** of six sequenced issues. Issue #2 is **not** opened until this one is validated, merged, and closed.

---

## File Structure

| File | Responsibility |
|---|---|
| `backend/tests/test_models_registry.py` | NEW. Characterization/regression guard: asserts all 15 models import from `app.models` and all 15 tables are registered in `Base.metadata`. Must be green before and after the move. |
| `backend/app/models/__init__.py` | NEW. Re-exports `Base` + all 15 model classes with explicit `__all__`. The single import that populates the registry. |
| `backend/app/models/user.py` | NEW. `User`. |
| `backend/app/models/watchlist.py` | NEW. `Watchlist`. |
| `backend/app/models/alert.py` | NEW. `Alert`, `AlertCondition`, `NotificationSettings`, `TriggeredAlert`, `NotificationDelivery`. |
| `backend/app/models/fundamentals.py` | NEW. `FinancialStatement`, `Dividend`, `SymbolScore`, `MonthlyRevenue`. |
| `backend/app/models/admin.py` | NEW. `InviteCode`, `JobRun`, `SmtpSettings`, `AuditLog`. |
| `backend/app/models.py` | DELETE (replaced by the package). |

**Why these boundaries:** classes that share back-populated relationships live together (all alert/notification tables in `alert.py`; user-owned auth in `user.py`). Relationship targets are string-based (`relationship("User", ...)`) and resolve via the shared registry at mapper-configure time — cross-file references are safe **as long as `__init__.py` imports every submodule**, which it does.

---

## Task 0: Open GitHub Issue #1 (tracking)

**Files:** none (GitHub only)

- [ ] **Step 1: Confirm labels exist**

Run: `gh label list | grep -E "refactor|backend|foundation"`
If any are missing, create them, e.g.: `gh label create foundation --color BFD4F2 --description "Independent foundational refactor"`

- [ ] **Step 2: Create the issue**

Run (body taken from `docs/superpowers/specs/2026-06-30-refactor-issues-draft.md`, Issue #1):

```bash
gh issue create \
  --title "refactor(backend): split models.py into a models/ package" \
  --label "refactor,backend,foundation" \
  --body-file docs/superpowers/specs/issue-1-body.md
```

(Extract Issue #1's section into `issue-1-body.md` first, or paste inline with `--body`.)
Expected: prints the new issue URL, e.g. `.../issues/<N>`. Record `<N>` for the commit/PR.

---

## Task 1: Add the model-registry characterization test (safety net)

**Files:**
- Test: `backend/tests/test_models_registry.py`

**Interfaces:**
- Consumes: `app.models` (current flat module), `app.database.Base`.
- Produces: a regression guard reused as the pass/fail gate for Task 2.

> **Refactor note:** this is a *characterization* test — it passes against the current flat `models.py` and must keep passing after the move. It does not "fail first"; its job is to fail loudly if the move drops, renames, or fails to register any model.

- [ ] **Step 1: Write the test**

```python
# backend/tests/test_models_registry.py
"""Regression guard for the models package split (Issue #1).

Locks in the full set of ORM models and their table registration so the
models.py -> models/ package move cannot silently drop or rename a model.
"""

from app.database import Base
from app import models

EXPECTED_MODELS = [
    "User",
    "Watchlist",
    "Alert",
    "AlertCondition",
    "NotificationSettings",
    "TriggeredAlert",
    "NotificationDelivery",
    "InviteCode",
    "FinancialStatement",
    "Dividend",
    "SymbolScore",
    "MonthlyRevenue",
    "JobRun",
    "SmtpSettings",
    "AuditLog",
]

EXPECTED_TABLES = [
    "users",
    "watchlists",
    "alerts",
    "alert_conditions",
    "notification_settings",
    "triggered_alerts",
    "notification_deliveries",
    "invite_codes",
    "financial_statements",
    "dividends",
    "symbol_scores",
    "monthly_revenue",
    "job_runs",
    "smtp_settings",
    "audit_logs",
]


def test_all_models_importable_from_app_models():
    for name in EXPECTED_MODELS:
        assert hasattr(models, name), f"app.models is missing {name}"


def test_model_count_is_exactly_fifteen():
    # Guards against an accidental add/drop during the move.
    assert len(EXPECTED_MODELS) == 15
    for name in EXPECTED_MODELS:
        assert getattr(models, name).__name__ == name


def test_all_tables_registered_in_metadata():
    registered = set(Base.metadata.tables.keys())
    for table in EXPECTED_TABLES:
        assert table in registered, f"{table} missing from Base.metadata"


def test_no_unexpected_tables():
    registered = set(Base.metadata.tables.keys())
    assert registered == set(EXPECTED_TABLES), (
        f"metadata drift: {registered.symmetric_difference(set(EXPECTED_TABLES))}"
    )
```

- [ ] **Step 2: Run it against the current flat module**

Run: `pytest backend/tests/test_models_registry.py -v`
Expected: **4 passed** (it characterizes the existing `models.py`).

> If `test_no_unexpected_tables` fails here, the real table set differs from the expected list — stop and reconcile the list with reality before touching `models.py`.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_models_registry.py
git commit -m "test: lock model registry before models package split (#<N>)"
```

---

## Task 2: Move models into the `models/` package

**Files:**
- Create: `backend/app/models/__init__.py`, `user.py`, `watchlist.py`, `alert.py`, `fundamentals.py`, `admin.py`
- Delete: `backend/app/models.py`

**Interfaces:**
- Consumes: `app.database.Base`; the Task 1 registry test as the gate.
- Produces: `app.models` package exporting the same 15 classes + `Base`. Downstream imports (`from app.models import User`, etc.) unchanged.

> Each step below is a verbatim copy of the corresponding class block from the
> current `backend/app/models.py`. Copy the class bodies exactly; only the
> import headers shown here are new.

- [ ] **Step 1: Create `backend/app/models/user.py`**

```python
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")
    notification_settings = relationship(
        "NotificationSettings",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    triggered_alerts = relationship(
        "TriggeredAlert", back_populates="user", cascade="all, delete-orphan"
    )
```

- [ ] **Step 2: Create `backend/app/models/watchlist.py`**

```python
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    symbol = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

- [ ] **Step 3: Create `backend/app/models/alert.py`** (copy `Alert`, `AlertCondition`, `NotificationSettings`, `TriggeredAlert`, `NotificationDelivery` verbatim from `models.py:52-150`)

```python
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


# --- paste Alert (models.py:52-78) ---
# --- paste AlertCondition (models.py:81-92) ---
# --- paste NotificationSettings (models.py:95-109) ---
# --- paste TriggeredAlert (models.py:112-132) ---
# --- paste NotificationDelivery (models.py:135-150) ---
```

> The five class bodies are copied unchanged. They reference each other and
> `User` by string name, so no additional imports are needed.

- [ ] **Step 4: Create `backend/app/models/fundamentals.py`** (copy `FinancialStatement`, `Dividend`, `SymbolScore`, `MonthlyRevenue` verbatim from `models.py:174-239`)

```python
from sqlalchemy import Column, String, Integer, Float, DateTime, JSON, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base


# --- paste FinancialStatement (models.py:174-189) ---
# --- paste Dividend (models.py:192-203) ---
# --- paste SymbolScore (models.py:206-222) ---
# --- paste MonthlyRevenue (models.py:225-239) ---
```

- [ ] **Step 5: Create `backend/app/models/admin.py`** (copy `InviteCode` from `models.py:153-168`, then `JobRun`, `SmtpSettings`, `AuditLog` from `models.py:242-283`)

```python
from sqlalchemy import Column, String, Integer, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


# --- paste InviteCode (models.py:153-168) ---
# --- paste JobRun (models.py:242-253) ---
# --- paste SmtpSettings (models.py:256-269) ---
# --- paste AuditLog (models.py:272-283) ---
```

- [ ] **Step 6: Create `backend/app/models/__init__.py`**

```python
from app.database import Base
from .user import User
from .watchlist import Watchlist
from .alert import (
    Alert,
    AlertCondition,
    NotificationSettings,
    TriggeredAlert,
    NotificationDelivery,
)
from .fundamentals import (
    FinancialStatement,
    Dividend,
    SymbolScore,
    MonthlyRevenue,
)
from .admin import InviteCode, JobRun, SmtpSettings, AuditLog

__all__ = [
    "Base",
    "User",
    "Watchlist",
    "Alert",
    "AlertCondition",
    "NotificationSettings",
    "TriggeredAlert",
    "NotificationDelivery",
    "InviteCode",
    "FinancialStatement",
    "Dividend",
    "SymbolScore",
    "MonthlyRevenue",
    "JobRun",
    "SmtpSettings",
    "AuditLog",
]
```

- [ ] **Step 7: Delete the flat module**

Run: `git rm backend/app/models.py`
(Removing it now prevents the `models.py` file and `models/` package from coexisting, which is ambiguous on import.)

- [ ] **Step 8: Run the registry guard**

Run: `pytest backend/tests/test_models_registry.py -v`
Expected: **4 passed** — same as Task 1 Step 2, now satisfied by the package.

- [ ] **Step 9: Run the full backend suite**

Run: `pytest backend/tests/ -q`
Expected: all pass (no collection/import errors). The suite imports models across `test_stocks.py`, `test_alerts_discord.py`, `test_ingestion.py`, `test_scoring.py`, etc.; any dropped/renamed class surfaces here.

- [ ] **Step 10: Lint**

Run: `ruff check backend/app/models/`
Expected: clean (watch for unused imports — trim per-submodule imports to only what each file uses).

- [ ] **Step 11: Commit**

```bash
git add backend/app/models/
git commit -m "refactor(backend): split models.py into models/ package (#<N>)"
```

---

## Validation Gate (must pass before opening Issue #2)

- [ ] `pytest backend/tests/ -q` — all green.
- [ ] `ruff check backend/app/` — clean.
- [ ] App boots: `cd backend && python -c "import app.main"` exits 0 (imports the FastAPI app, which imports routers → models).
- [ ] Manual smoke (optional): start the app; `GET /health` returns `{"status":"ok",...}`; one authenticated `GET /api/stock/AAPL` round-trips (exercises a model-touching path).
- [ ] Open a PR referencing `#<N>`, merge, then **close Issue #1**.

Only after this gate is green do we proceed to write/open **Issue #2 (split `schemas.py`)**.

---

## Rollback

Single-commit, code-only change with no schema impact:

```bash
git revert <commit-sha>        # restores flat models.py, deletes package
# or, pre-merge:
git checkout main -- backend/app/models.py && git rm -r backend/app/models/
```

The database is never touched, so rollback is purely a code revert.
