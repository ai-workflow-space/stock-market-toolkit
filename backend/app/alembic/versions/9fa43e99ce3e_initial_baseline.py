"""initial_baseline

Revision ID: 9fa43e99ce3e
Revises:
Create Date: 2026-06-25 21:18:57.716575

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = "9fa43e99ce3e"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table_name: str) -> bool:
    """Check if a table already exists in the database."""
    conn = op.get_bind()
    result = conn.execute(
        text("SELECT name FROM sqlite_master WHERE type='table' AND name=:name"),
        {"name": table_name},
    )
    return result.fetchone() is not None


def upgrade() -> None:
    if not _table_exists("users"):
        op.create_table(
            "users",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("email", sa.String(), nullable=False),
            sa.Column("username", sa.String(), nullable=False),
            sa.Column("hashed_password", sa.String(), nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default="1", nullable=True),
            sa.Column("is_admin", sa.Boolean(), server_default="0", nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=True,
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_users_email", "users", ["email"], unique=True)
        op.create_index("ix_users_username", "users", ["username"], unique=True)

    if not _table_exists("watchlists"):
        op.create_table(
            "watchlists",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.String(), nullable=False),
            sa.Column("symbol", sa.String(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        )

    if not _table_exists("alerts"):
        op.create_table(
            "alerts",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.String(), nullable=False),
            sa.Column("symbol", sa.String(), nullable=False),
            sa.Column("condition_type", sa.String(), nullable=False),
            sa.Column("threshold", sa.Float(), nullable=False),
            sa.Column("period", sa.String(), server_default="1h", nullable=False),
            sa.Column("enabled", sa.Boolean(), server_default="1", nullable=True),
            sa.Column("cooldown_until", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        )

    if not _table_exists("notification_settings"):
        op.create_table(
            "notification_settings",
            sa.Column("user_id", sa.String(), primary_key=True),
            sa.Column("discord_webhook_url", sa.Text(), nullable=True),
            sa.Column("email_address", sa.String(), nullable=True),
            sa.Column("email_enabled", sa.Boolean(), server_default="0", nullable=True),
            sa.Column("discord_enabled", sa.Boolean(), server_default="1", nullable=True),
            sa.Column("default_period", sa.String(), server_default="1h", nullable=True),
            sa.Column("timezone", sa.String(), server_default="UTC", nullable=True),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        )

    if not _table_exists("triggered_alerts"):
        op.create_table(
            "triggered_alerts",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("alert_id", sa.Integer(), nullable=True),
            sa.Column("user_id", sa.String(), nullable=False),
            sa.Column("symbol", sa.String(), nullable=False),
            sa.Column("condition_type", sa.String(), nullable=False),
            sa.Column("trigger_price", sa.Float(), nullable=False),
            sa.Column("threshold_value", sa.Float(), nullable=False),
            sa.Column(
                "triggered_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=True,
            ),
            sa.Column("notified", sa.Boolean(), server_default="0", nullable=True),
            sa.Column("read", sa.Boolean(), server_default="0", nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["alert_id"], ["alerts.id"]),
        )

    if not _table_exists("invite_codes"):
        op.create_table(
            "invite_codes",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("code", sa.String(), nullable=False),
            sa.Column("created_by", sa.String(), nullable=False),
            sa.Column("used_by", sa.String(), nullable=True),
            sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default="1", nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("CURRENT_TIMESTAMP"),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        )
        op.create_index("ix_invite_codes_code", "invite_codes", ["code"], unique=True)


def downgrade() -> None:
    op.drop_table("invite_codes")
    op.drop_table("triggered_alerts")
    op.drop_table("notification_settings")
    op.drop_table("alerts")
    op.drop_table("watchlists")
    op.drop_index("ix_users_username", "users")
    op.drop_index("ix_users_email", "users")
    op.drop_table("users")
