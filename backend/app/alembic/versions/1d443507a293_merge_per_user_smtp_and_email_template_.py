"""merge per-user-smtp and email-template heads

The migration graph forked at 2b3c4d5e6f7a (add_smtp_settings): the per-user
SMTP migration (3abc4d5e6f7a) branched off it in parallel with the
email-template line (…-> f6a1b2c3d4e5), leaving two heads. Two heads make
`alembic upgrade head` ambiguous and leave a DB stamped at both revisions,
which fails to boot on any branch that lacks one of them. This no-op merge
reunites the two heads into a single linear head; it adds no schema changes.

Revision ID: 1d443507a293
Revises: f6a1b2c3d4e5, 3abc4d5e6f7a
Create Date: 2026-07-01 20:36:22.288161

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1d443507a293'
down_revision: Union[str, None] = ('f6a1b2c3d4e5', '3abc4d5e6f7a')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
