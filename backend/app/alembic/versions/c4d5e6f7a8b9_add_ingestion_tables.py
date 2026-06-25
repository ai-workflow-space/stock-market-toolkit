"""add_ingestion_tables

Revision ID: c4d5e6f7a8b9
Revises: b2c3d4e5f6a1
Create Date: 2026-06-26 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, None] = "b2c3d4e5f6a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "financial_statements",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("symbol", sa.String(), nullable=False, index=True),
        sa.Column("period", sa.String(), nullable=False),
        sa.Column("fiscal_year", sa.Integer(), nullable=True),
        sa.Column("fiscal_quarter", sa.Integer(), nullable=True),
        sa.Column("data", sa.JSON(), nullable=False),
        sa.Column(
            "fetched_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.UniqueConstraint(
            "symbol", "period", name="uq_financial_statements_symbol_period"
        ),
    )

    op.create_table(
        "dividends",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("symbol", sa.String(), nullable=False, index=True),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("ex_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "fetched_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.UniqueConstraint("symbol", "ex_date", name="uq_dividends_symbol_ex_date"),
    )

    op.create_table(
        "symbol_scores",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("symbol", sa.String(), nullable=False, index=True),
        sa.Column("score_type", sa.String(), nullable=False),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column(
            "calculated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.UniqueConstraint(
            "symbol", "score_type", name="uq_symbol_scores_symbol_score_type"
        ),
    )

    op.create_table(
        "monthly_revenue",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("symbol", sa.String(), nullable=False, index=True),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("month", sa.Integer(), nullable=False),
        sa.Column("revenue", sa.Float(), nullable=True),
        sa.Column(
            "fetched_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.UniqueConstraint(
            "symbol", "year", "month", name="uq_monthly_revenue_symbol_year_month"
        ),
    )

    op.create_table(
        "job_runs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("job_type", sa.String(), nullable=False, index=True),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("symbols_processed", sa.Integer(), default=0),
        sa.Column("total_symbols", sa.Integer(), default=0),
        sa.Column("errors", sa.Integer(), default=0),
        sa.Column("error_details", sa.Text(), nullable=True),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("job_runs")
    op.drop_table("monthly_revenue")
    op.drop_table("symbol_scores")
    op.drop_table("dividends")
    op.drop_table("financial_statements")
