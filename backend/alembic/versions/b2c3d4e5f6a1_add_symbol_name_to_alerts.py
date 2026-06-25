"""add_symbol_name_to_alerts

Revision ID: b2c3d4e5f6a1
Revises: 9fa43e99ce3e
Create Date: 2026-06-25 23:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b2c3d4e5f6a1"
down_revision = "9fa43e99ce3e"
branch_labels = None
depends_on = None


def upgrade(operations: Union["Operations", "Migration"]) -> None:
    op.add_column("alerts", sa.Column("symbol_name", sa.String(), nullable=True))


def downgrade(operations: Union["Operations", "Migration"]) -> None:
    op.drop_column("alerts", "symbol_name")