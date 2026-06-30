"""add_email_subject_and_body

Revision ID: f6a1b2c3d4e5
Revises: c4d5e6f7a8b9
Create Date: 2026-07-01 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f6a1b2c3d4e5"
down_revision: Union[str, None] = "c4d5e6f7a8b9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "notification_settings",
        sa.Column("email_subject", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "notification_settings",
        sa.Column("email_body", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("notification_settings", "email_body")
    op.drop_column("notification_settings", "email_subject")
