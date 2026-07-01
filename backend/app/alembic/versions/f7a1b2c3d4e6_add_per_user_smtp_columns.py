"""add_per_user_smtp_columns_to_notification_settings

Revision ID: f7a1b2c3d4e6
Revises: f6a1b2c3d4e5
Create Date: 2026-07-01 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f7a1b2c3d4e6"
down_revision: Union[str, None] = "f6a1b2c3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "notification_settings",
        sa.Column("smtp_host", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "notification_settings",
        sa.Column("smtp_port", sa.Integer(), nullable=True, server_default="587"),
    )
    op.add_column(
        "notification_settings",
        sa.Column("smtp_use_tls", sa.Boolean(), nullable=True, server_default="true"),
    )
    op.add_column(
        "notification_settings",
        sa.Column("smtp_username", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "notification_settings",
        sa.Column("smtp_password_encrypted", sa.Text(), nullable=True),
    )
    op.add_column(
        "notification_settings",
        sa.Column("smtp_from_address", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "notification_settings",
        sa.Column("smtp_reply_to", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("notification_settings", "smtp_reply_to")
    op.drop_column("notification_settings", "smtp_from_address")
    op.drop_column("notification_settings", "smtp_password_encrypted")
    op.drop_column("notification_settings", "smtp_username")
    op.drop_column("notification_settings", "smtp_use_tls")
    op.drop_column("notification_settings", "smtp_port")
    op.drop_column("notification_settings", "smtp_host")