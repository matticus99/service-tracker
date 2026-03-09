"""Add record_type column to interval_items

Revision ID: 003
Revises: 002
Create Date: 2026-03-07
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("interval_items", sa.Column("record_type", sa.String(50), nullable=True))

    # Backfill: items with "oil" in the name get record_type = "oil_change"
    op.execute(
        "UPDATE interval_items SET record_type = 'oil_change' WHERE LOWER(name) LIKE '%oil%'"
    )


def downgrade() -> None:
    op.drop_column("interval_items", "record_type")
