"""Add service_categories, service_definitions, shops, service_record_items, note_service_links tables

Revision ID: 004
Revises: 003
Create Date: 2026-03-09
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "004"
down_revision: Union[str, None] = "003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- New tables ---

    op.create_table(
        "service_categories",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False, unique=True),
        sa.Column("display_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )

    op.create_table(
        "service_definitions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("category_id", UUID(as_uuid=True), sa.ForeignKey("service_categories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
        sa.UniqueConstraint("category_id", "name", name="uq_service_definitions_category_name"),
    )

    op.create_table(
        "shops",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("vehicle_id", UUID(as_uuid=True), sa.ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("address", sa.Text, nullable=True),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("website", sa.String(500), nullable=True),
        sa.Column("hours", sa.Text, nullable=True),
        sa.Column("google_place_id", sa.String(300), nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("ix_shops_vehicle_id", "shops", ["vehicle_id"])

    op.create_table(
        "service_record_items",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("service_record_id", UUID(as_uuid=True), sa.ForeignKey("service_records.id", ondelete="CASCADE"), nullable=False),
        sa.Column("service_definition_id", UUID(as_uuid=True), sa.ForeignKey("service_definitions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("custom_service_name", sa.String(200), nullable=True),
        sa.Column("cost", sa.Numeric(10, 2), nullable=True),
        sa.Column("display_order", sa.Integer, nullable=False, server_default="0"),
    )
    op.create_index("ix_service_record_items_service_record_id", "service_record_items", ["service_record_id"])

    op.create_table(
        "note_service_links",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("observation_id", UUID(as_uuid=True), sa.ForeignKey("observations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("service_record_id", UUID(as_uuid=True), sa.ForeignKey("service_records.id", ondelete="CASCADE"), nullable=False),
        sa.UniqueConstraint("observation_id", "service_record_id", name="uq_note_service_links_obs_rec"),
    )

    # --- Alter existing tables ---

    # service_records: add shop_id, total_cost, shop_fee, tax
    op.add_column("service_records", sa.Column("shop_id", UUID(as_uuid=True), sa.ForeignKey("shops.id", ondelete="SET NULL"), nullable=True))
    op.add_column("service_records", sa.Column("total_cost", sa.Numeric(10, 2), nullable=True))
    op.add_column("service_records", sa.Column("shop_fee", sa.Numeric(10, 2), nullable=True))
    op.add_column("service_records", sa.Column("tax", sa.Numeric(10, 2), nullable=True))

    # interval_items: add service_definition_id, category_id
    op.add_column("interval_items", sa.Column("service_definition_id", UUID(as_uuid=True), sa.ForeignKey("service_definitions.id", ondelete="SET NULL"), nullable=True))
    op.add_column("interval_items", sa.Column("category_id", UUID(as_uuid=True), sa.ForeignKey("service_categories.id", ondelete="SET NULL"), nullable=True))


def downgrade() -> None:
    # Drop altered columns
    op.drop_column("interval_items", "category_id")
    op.drop_column("interval_items", "service_definition_id")
    op.drop_column("service_records", "tax")
    op.drop_column("service_records", "shop_fee")
    op.drop_column("service_records", "total_cost")
    op.drop_column("service_records", "shop_id")

    # Drop new tables (reverse order)
    op.drop_table("note_service_links")
    op.drop_index("ix_service_record_items_service_record_id", table_name="service_record_items")
    op.drop_table("service_record_items")
    op.drop_index("ix_shops_vehicle_id", table_name="shops")
    op.drop_table("shops")
    op.drop_table("service_definitions")
    op.drop_table("service_categories")
