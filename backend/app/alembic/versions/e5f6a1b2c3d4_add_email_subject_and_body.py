"""add_email_subject_and_body

Revision ID: e5f6a1b2c3d4
Revises: d4e5f6a1b2c3
Create Date: 2026-06-28 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e5f6a1b2c3d4"
down_revision: Union[str, None] = "d4e5f6a1b2c3"
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
    op.drop_column("notification_settings", "email_subject")
    op.drop_column("notification_settings", "email_body")
