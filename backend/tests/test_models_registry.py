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
