"""add_per_user_smtp_to_notification_settings

Revision ID: 3abc4d5e6f7a
Revises: 2b3c4d5e6f7a
Create Date: 2026-07-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "3abc4d5e6f7a"
down_revision: Union[str, None] = "2b3c4d5e6f7a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "notification_settings",
        sa.Column("smtp_host", sa.String(255), nullable=True),
    )
    op.add_column(
        "notification_settings",
        sa.Column("smtp_port", sa.Integer(), nullable=True, server_default="587"),
    )
    op.add_column(
        "notification_settings",
        sa.Column("smtp_use_tls", sa.Boolean(), nullable=True, server_default="1"),
    )
    op.add_column(
        "notification_settings",
        sa.Column("smtp_username", sa.String(255), nullable=True),
    )
    op.add_column(
        "notification_settings",
        sa.Column("smtp_password_encrypted", sa.Text(), nullable=True),
    )
    op.add_column(
        "notification_settings",
        sa.Column("smtp_from_address", sa.String(255), nullable=True),
    )
    op.add_column(
        "notification_settings",
        sa.Column("smtp_reply_to", sa.String(255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("notification_settings", "smtp_reply_to")
    op.drop_column("notification_settings", "smtp_from_address")
    op.drop_column("notification_settings", "smtp_password_encrypted")
    op.drop_column("notification_settings", "smtp_username")
    op.drop_column("notification_settings", "smtp_use_tls")
    op.drop_column("notification_settings", "smtp_port")
    op.drop_column("notification_settings", "smtp_host")