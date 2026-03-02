"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-03-01
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enums
    interval_item_type = postgresql.ENUM("regular", "ad_hoc", name="intervalitemtype", create_type=False)
    interval_item_type.create(op.get_bind(), checkfirst=True)

    record_type = postgresql.ENUM("service_record", "oil_change", "observation", name="recordtype", create_type=False)
    record_type.create(op.get_bind(), checkfirst=True)

    # vehicles
    op.create_table(
        "vehicles",
        sa.Column("id", sa.Uuid(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("make", sa.String(100), nullable=False),
        sa.Column("model", sa.String(100), nullable=False),
        sa.Column("trim", sa.String(200), nullable=True),
        sa.Column("color", sa.String(50), nullable=True),
        sa.Column("vin", sa.String(17), nullable=True),
        sa.Column("current_mileage", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )

    # oil_changes
    op.create_table(
        "oil_changes",
        sa.Column("id", sa.Uuid(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("vehicle_id", sa.Uuid(), nullable=False),
        sa.Column("service_date", sa.Date(), nullable=False),
        sa.Column("facility", sa.String(200), nullable=True),
        sa.Column("odometer", sa.Integer(), nullable=False),
        sa.Column("interval_miles", sa.Integer(), nullable=True),
        sa.Column("interval_months", sa.Numeric(5, 1), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_oil_changes_vehicle_date", "oil_changes", ["vehicle_id", "service_date"])

    # service_records
    op.create_table(
        "service_records",
        sa.Column("id", sa.Uuid(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("vehicle_id", sa.Uuid(), nullable=False),
        sa.Column("service_date", sa.Date(), nullable=False),
        sa.Column("facility", sa.String(200), nullable=True),
        sa.Column("odometer", sa.Integer(), nullable=True),
        sa.Column("services_performed", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_service_records_vehicle_date", "service_records", ["vehicle_id", "service_date"])

    # interval_items
    op.create_table(
        "interval_items",
        sa.Column("id", sa.Uuid(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("vehicle_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("type", interval_item_type, nullable=False, server_default="regular"),
        sa.Column("last_service_date", sa.Date(), nullable=True),
        sa.Column("last_service_miles", sa.Integer(), nullable=True),
        sa.Column("recommended_interval_miles", sa.Integer(), nullable=True),
        sa.Column("next_service_miles", sa.Integer(), nullable=True),
        sa.Column("due_soon_threshold_miles", sa.Integer(), nullable=False, server_default="500"),
        sa.Column("estimated_cost", sa.Numeric(10, 2), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("target_date", sa.Date(), nullable=True),
        sa.Column("target_miles", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_interval_items_vehicle", "interval_items", ["vehicle_id"])

    # observations
    op.create_table(
        "observations",
        sa.Column("id", sa.Uuid(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("vehicle_id", sa.Uuid(), nullable=False),
        sa.Column("observation_date", sa.Date(), nullable=False),
        sa.Column("odometer", sa.Integer(), nullable=True),
        sa.Column("observation", sa.Text(), nullable=False),
        sa.Column("resolved", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("resolved_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_observations_vehicle", "observations", ["vehicle_id"])

    # attachments
    op.create_table(
        "attachments",
        sa.Column("id", sa.Uuid(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("vehicle_id", sa.Uuid(), nullable=False),
        sa.Column("record_type", record_type, nullable=False),
        sa.Column("record_id", sa.Uuid(), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("stored_path", sa.Text(), nullable=False),
        sa.Column("mime_type", sa.String(100), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_attachments_record", "attachments", ["record_type", "record_id"])

    # push_subscriptions
    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.Uuid(), nullable=False, default=sa.text("gen_random_uuid()")),
        sa.Column("vehicle_id", sa.Uuid(), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=False),
        sa.Column("p256dh", sa.Text(), nullable=False),
        sa.Column("auth", sa.Text(), nullable=False),
        sa.Column("device_label", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # app_settings
    op.create_table(
        "app_settings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("shop_fee", sa.Numeric(10, 2), nullable=False, server_default="40.00"),
        sa.Column("tax_rate", sa.Numeric(5, 4), nullable=False, server_default="0.07"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("app_settings")
    op.drop_table("push_subscriptions")
    op.drop_table("attachments")
    op.drop_table("observations")
    op.drop_table("interval_items")
    op.drop_table("service_records")
    op.drop_table("oil_changes")
    op.drop_table("vehicles")

    op.execute("DROP TYPE IF EXISTS recordtype")
    op.execute("DROP TYPE IF EXISTS intervalitemtype")
