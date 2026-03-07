"""Add notification settings and notification log

Revision ID: 002
Revises: 001
Create Date: 2026-03-07
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Extend app_settings with notification preferences and VAPID keys
    op.add_column("app_settings", sa.Column("weekly_digest_enabled", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("app_settings", sa.Column("weekly_digest_day", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("app_settings", sa.Column("vapid_private_key", sa.Text(), nullable=True))
    op.add_column("app_settings", sa.Column("vapid_public_key", sa.Text(), nullable=True))

    # Notification log for deduplication
    op.create_table(
        "notification_log",
        sa.Column("id", sa.Uuid(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("vehicle_id", sa.Uuid(), nullable=False),
        sa.Column("subscription_id", sa.Uuid(), nullable=False),
        sa.Column("interval_item_id", sa.Uuid(), nullable=True),
        sa.Column("notification_type", sa.String(50), nullable=False),
        sa.Column("status_snapshot", sa.String(50), nullable=False),
        sa.Column("sent_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subscription_id"], ["push_subscriptions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["interval_item_id"], ["interval_items.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_notification_log_dedup",
        "notification_log",
        ["vehicle_id", "interval_item_id", "notification_type"],
    )


def downgrade() -> None:
    op.drop_table("notification_log")
    op.drop_column("app_settings", "vapid_public_key")
    op.drop_column("app_settings", "vapid_private_key")
    op.drop_column("app_settings", "weekly_digest_day")
    op.drop_column("app_settings", "weekly_digest_enabled")
