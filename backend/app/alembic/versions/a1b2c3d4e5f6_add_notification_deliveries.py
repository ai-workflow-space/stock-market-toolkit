"""add_notification_deliveries

Revision ID: a1b2c3d4e5f6
Revises: 9fa43e99ce3e
Create Date: 2026-06-25 22:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "9fa43e99ce3e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notification_deliveries",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("triggered_alert_id", sa.Integer(), nullable=True),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("channel", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("http_status", sa.Integer(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["triggered_alert_id"], ["triggered_alerts.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )


def downgrade() -> None:
    op.drop_table("notification_deliveries")
