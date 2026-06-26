"""add_email_and_token_to_invite_codes

Revision ID: d4e5f6a1b2c3
Revises: c3d4e5f6a1b2
Create Date: 2026-06-26 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "3c4d5e6f7a8b"
down_revision: Union[str, None] = "2b3c4d5e6f7a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("invite_codes", sa.Column("email", sa.String(), nullable=True))
    op.add_column("invite_codes", sa.Column("token", sa.String(), nullable=True))
    op.create_index(op.f("ix_invite_codes_token"), "invite_codes", ["token"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_invite_codes_token"), table_name="invite_codes")
    op.drop_column("invite_codes", "token")
    op.drop_column("invite_codes", "email")
