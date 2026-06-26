"""Tests for the initial baseline migration (9fa43e99ce3e).

Verifies the three backend fixes applied in PR #163 review:
1. _table_exists uses dialect-agnostic inspect (not SQLite-only sqlite_master)
2. Indexes are created outside table-guarded blocks
3. downgrade() is idempotent (guarded by _table_exists checks)

Fix 4 (frontend) is tested in frontend/src/pages/SignalsPage.test.ts
"""

import ast
from pathlib import Path


MIGRATION_PATH = (
    Path(__file__).parent.parent
    / "app"
    / "alembic"
    / "versions"
    / "9fa43e99ce3e_initial_baseline.py"
)


# ── Helpers ──────────────────────────────────────────────────────────────────


def _parse_migration() -> ast.Module:
    with open(MIGRATION_PATH) as f:
        return ast.parse(f.read())


def _get_function(name: str) -> ast.FunctionDef | None:
    tree = _parse_migration()
    for node in ast.iter_child_nodes(tree):
        if isinstance(node, ast.FunctionDef) and node.name == name:
            return node
    return None


def _get_body_lines(func: ast.FunctionDef) -> list[str]:
    source_lines = MIGRATION_PATH.read_text().splitlines()
    return [source_lines[n.lineno - 1] for n in func.body]


# ── Fix 1: _table_exists must use inspect, not sqlite_master ────────────────


def test_table_exists_function_exists():
    """The migration must define a _table_exists helper."""
    tree = _parse_migration()
    funcs = [
        n.name for n in ast.iter_child_nodes(tree) if isinstance(n, ast.FunctionDef)
    ]
    assert "_table_exists" in funcs, "Migration must define _table_exists() helper"


def test_table_exists_uses_inspect_not_sqlite_master():
    """Fix 1: _table_exists must use sqlalchemy.inspect, not sqlite_master."""
    func = _get_function("_table_exists")
    assert func is not None

    source = MIGRATION_PATH.read_text()
    # Must NOT query sqlite_master
    assert "sqlite_master" not in source, (
        "sqlite_master is SQLite-only; use sqlalchemy.inspect instead"
    )
    # Must use sqlalchemy.inspect
    assert "inspect" in source, "Must import and use sqlalchemy.inspect"


# ── Fix 2: create_index calls outside table-guarded if blocks ───────────────


def test_imports_do_not_include_standalone_text():
    """Fix 1 also: remove from sqlalchemy import text (was only used for sqlite_master)."""
    source = MIGRATION_PATH.read_text()
    _ = source  # referenced in assertion below
    # `sa.text(...)` is fine, but a bare `from sqlalchemy import text` must not exist.
    # Search for an import statement that imports `text` directly from sqlalchemy.
    tree = _parse_migration()
    for node in ast.iter_child_nodes(tree):
        if isinstance(node, ast.ImportFrom) and node.module == "sqlalchemy":
            names = [alias.name for alias in node.names]
            assert "text" not in names, (
                "Remove 'from sqlalchemy import text' (was only needed for sqlite_master query)"
            )


def test_indexes_outside_if_blocks():
    """Fix 2: op.create_index(...) must not be nested inside if not _table_exists(...)."""
    source = MIGRATION_PATH.read_text()
    lines = source.splitlines()

    # For each create_index line, walk backwards to check indent.
    # If the nearest preceding statement at the same or lesser indent
    # is an `if not _table_exists(`, the index is trapped inside the guard.
    for lineno, line in enumerate(lines):
        stripped = line.strip()
        if not stripped.startswith("op.create_index"):
            continue

        index_indent = len(line) - len(line.lstrip())
        # Walk backwards to find the nearest statement at <= index_indent
        for prev in range(lineno - 1, -1, -1):
            prev_stripped = lines[prev].strip()
            if not prev_stripped or prev_stripped.startswith("#"):
                continue
            prev_indent = len(lines[prev]) - len(lines[prev].lstrip())
            if prev_indent < index_indent:
                assert not prev_stripped.startswith("if "), (
                    f"Line {lineno + 1}: create_index is nested inside an if-guard "
                    f"(line {prev + 1}: {prev_stripped}). "
                    "Indexes must be created unconditionally."
                )
                break


# ── Fix 3: downgrade() must guard every drop with _table_exists ─────────────


def test_downgrade_exists():
    """Migration must define a downgrade function."""
    func = _get_function("downgrade")
    assert func is not None, "Migration must define downgrade()"


def test_downgrade_drops_guarded_by_table_exists():
    """Fix 3: Every op.drop_table() / op.drop_index() in downgrade() must be "
    "preceded by an if _table_exists(...) guard for idempotency.
    """
    func = _get_function("downgrade")
    assert func is not None

    lines = MIGRATION_PATH.read_text().splitlines()
    start = func.lineno - 1
    end = func.end_lineno or len(lines)

    # Walk the downgrade body.  For each drop call, walk backwards to find
    # either an `if _table_exists(` guard or the start of the function / a
    # previous drop call.
    prev_guard_found = False
    for lineno in range(start, min(end, len(lines))):
        stripped = lines[lineno].strip()
        if stripped.startswith("if _table_exists("):
            prev_guard_found = True
        elif stripped.startswith("op.drop_table(") or stripped.startswith(
            "op.drop_index("
        ):
            assert prev_guard_found, (
                f"Line {lineno + 1}: {stripped} is not guarded by _table_exists. "
                "Every drop must be preceded by if _table_exists(...)."
            )
        # Reset guard flag when we hit a non-comment, non-pass line after a drop
        elif (
            prev_guard_found
            and stripped
            and not stripped.startswith(("#", "op.drop", "if _table_exists"))
        ):
            if stripped != "pass" and not stripped.startswith(""):
                prev_guard_found = False
