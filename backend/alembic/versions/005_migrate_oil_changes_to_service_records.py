"""Migrate oil_change records into service_records with service_record_items

Revision ID: 005
Revises: 004
Create Date: 2026-03-09
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Find the "Oil & Filter Change" service_definition id
    oil_def = conn.execute(
        sa.text("SELECT id FROM service_definitions WHERE name = 'Oil & Filter Change' LIMIT 1")
    ).fetchone()
    oil_def_id = oil_def[0] if oil_def else None

    # Get all oil_changes
    oil_changes = conn.execute(
        sa.text("SELECT id, vehicle_id, service_date, facility, odometer, notes, created_at FROM oil_changes ORDER BY service_date")
    ).fetchall()

    for oc in oil_changes:
        oc_id, vehicle_id, service_date, facility, odometer, notes, created_at = oc

        # Create service_record
        new_sr_id = conn.execute(
            sa.text("""
                INSERT INTO service_records (id, vehicle_id, service_date, facility, odometer, services_performed, notes, created_at)
                VALUES (gen_random_uuid(), :vehicle_id, :service_date, :facility, :odometer, :services_performed, :notes, :created_at)
                RETURNING id
            """),
            {
                "vehicle_id": vehicle_id,
                "service_date": service_date,
                "facility": facility,
                "odometer": odometer,
                "services_performed": ["Oil & Filter Change"],
                "notes": notes,
                "created_at": created_at,
            }
        ).scalar()

        # Create service_record_item linking to Oil & Filter Change definition
        conn.execute(
            sa.text("""
                INSERT INTO service_record_items (id, service_record_id, service_definition_id, display_order)
                VALUES (gen_random_uuid(), :sr_id, :def_id, 0)
            """),
            {"sr_id": new_sr_id, "def_id": oil_def_id}
        )

        # Update any attachments pointing to this oil_change
        conn.execute(
            sa.text("""
                UPDATE attachments
                SET record_type = 'service_record', record_id = :new_sr_id
                WHERE record_type = 'oil_change' AND record_id = :oc_id
            """),
            {"new_sr_id": new_sr_id, "oc_id": oc_id}
        )

    # Do NOT drop oil_changes table — keep as safety net


def downgrade() -> None:
    # Delete migrated service_record_items and service_records
    # This is a best-effort reversal; attachment references are not restored
    conn = op.get_bind()

    # Find service records that were created from oil changes
    # (they have services_performed = ['Oil & Filter Change'] and matching dates)
    conn.execute(
        sa.text("""
            DELETE FROM service_record_items
            WHERE service_record_id IN (
                SELECT sr.id FROM service_records sr
                INNER JOIN oil_changes oc
                ON sr.vehicle_id = oc.vehicle_id
                AND sr.service_date = oc.service_date
                AND sr.odometer = oc.odometer
            )
        """)
    )
    conn.execute(
        sa.text("""
            DELETE FROM service_records
            WHERE id IN (
                SELECT sr.id FROM service_records sr
                INNER JOIN oil_changes oc
                ON sr.vehicle_id = oc.vehicle_id
                AND sr.service_date = oc.service_date
                AND sr.odometer = oc.odometer
            )
        """)
    )
