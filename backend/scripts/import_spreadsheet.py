"""
One-time data import script from Tacoma_Service_20251125.xlsx.

Usage:
    python scripts/import_spreadsheet.py path/to/Tacoma_Service_20251125.xlsx

Idempotent — safe to run multiple times (uses upsert logic via checking existing records).
"""
import sys
import uuid
import logging
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

import openpyxl
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

# Add parent dir to path so we can import app modules
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import Base
from app.models import Vehicle, OilChange, ServiceRecord, IntervalItem, Observation, AppSettings
from app.models.interval_item import IntervalItemType
from app.config import settings

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)


def get_sync_engine():
    return create_engine(settings.DATABASE_URL_SYNC)


def safe_int(value) -> int | None:
    """Convert a value to int, handling 'Unknown', None, and float values."""
    if value is None:
        return None
    if isinstance(value, str):
        cleaned = value.strip().replace(",", "")
        if cleaned.lower() in ("unknown", "n/a", ""):
            return None
        try:
            return int(float(cleaned))
        except ValueError:
            return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def safe_date(value) -> date | None:
    """Convert a value to date."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%m/%d/%y"):
            try:
                return datetime.strptime(value.strip(), fmt).date()
            except ValueError:
                continue
    return None


def safe_float(value) -> float | None:
    """Convert a value to float."""
    if value is None:
        return None
    if isinstance(value, str):
        cleaned = value.strip().replace("$", "").replace(",", "")
        if cleaned == "":
            return None
        try:
            return float(cleaned)
        except ValueError:
            return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def import_vehicles(ws, session: Session) -> dict[str, uuid.UUID]:
    """Import from 'Truck Details' sheet. Returns {identifier: vehicle_id}."""
    log.info("Importing vehicles...")
    vehicle_map = {}

    rows = list(ws.iter_rows(min_row=2, values_only=True))
    for row in rows:
        if not row or not row[0]:
            continue

        year = safe_int(row[0])
        make = str(row[1]).strip() if row[1] else ""
        model = str(row[2]).strip() if row[2] else ""
        trim = str(row[3]).strip() if len(row) > 3 and row[3] else None
        color = str(row[4]).strip() if len(row) > 4 and row[4] else None
        vin = str(row[5]).strip() if len(row) > 5 and row[5] else None
        mileage = safe_int(row[6]) if len(row) > 6 else 0

        if not year or not make:
            continue

        # Check if vehicle already exists by VIN or year+make+model
        existing = None
        if vin:
            existing = session.execute(select(Vehicle).where(Vehicle.vin == vin)).scalar_one_or_none()
        if not existing:
            existing = session.execute(
                select(Vehicle).where(Vehicle.year == year, Vehicle.make == make, Vehicle.model == model)
            ).scalar_one_or_none()

        if existing:
            log.info(f"  Vehicle already exists: {year} {make} {model}")
            vehicle_map[f"{year} {make} {model}"] = existing.id
            if mileage and mileage > existing.current_mileage:
                existing.current_mileage = mileage
        else:
            vehicle = Vehicle(
                year=year, make=make, model=model, trim=trim,
                color=color, vin=vin, current_mileage=mileage or 0,
            )
            session.add(vehicle)
            session.flush()
            vehicle_map[f"{year} {make} {model}"] = vehicle.id
            log.info(f"  Imported: {year} {make} {model}")

    return vehicle_map


def import_oil_changes(ws, session: Session, vehicle_id: uuid.UUID):
    """Import from 'Oil Changes' sheet."""
    log.info("Importing oil changes...")
    imported, skipped = 0, 0

    rows = list(ws.iter_rows(min_row=2, values_only=True))
    for row in rows:
        if not row or not row[0]:
            continue

        service_date = safe_date(row[0])
        if not service_date:
            skipped += 1
            continue

        facility = str(row[1]).strip() if row[1] else None
        odometer = safe_int(row[2])
        if odometer is None:
            skipped += 1
            log.warning(f"  Skipping oil change on {service_date}: no odometer")
            continue

        interval_miles = safe_int(row[3]) if len(row) > 3 else None
        interval_months = safe_float(row[4]) if len(row) > 4 else None
        notes = str(row[5]).strip() if len(row) > 5 and row[5] else None

        # Check for duplicate
        existing = session.execute(
            select(OilChange).where(
                OilChange.vehicle_id == vehicle_id,
                OilChange.service_date == service_date,
                OilChange.odometer == odometer,
            )
        ).scalar_one_or_none()

        if existing:
            skipped += 1
            continue

        oc = OilChange(
            vehicle_id=vehicle_id, service_date=service_date, facility=facility,
            odometer=odometer, interval_miles=interval_miles,
            interval_months=interval_months, notes=notes,
        )
        session.add(oc)
        imported += 1

    log.info(f"  Oil changes: {imported} imported, {skipped} skipped")


def import_service_records(ws, session: Session, vehicle_id: uuid.UUID):
    """Import from 'Other Services' sheet."""
    log.info("Importing service records...")
    imported, skipped = 0, 0

    rows = list(ws.iter_rows(min_row=2, values_only=True))
    for row in rows:
        if not row or not row[0]:
            continue

        service_date = safe_date(row[0])
        if not service_date:
            skipped += 1
            continue

        facility = str(row[1]).strip() if row[1] else None
        odometer = safe_int(row[2])

        # Services performed — may be in one cell (newline-separated) or multiple columns
        services = []
        if len(row) > 3 and row[3]:
            raw = str(row[3])
            services = [s.strip() for s in raw.split("\n") if s.strip()]

        notes = str(row[4]).strip() if len(row) > 4 and row[4] else None

        # Check for duplicate
        existing = session.execute(
            select(ServiceRecord).where(
                ServiceRecord.vehicle_id == vehicle_id,
                ServiceRecord.service_date == service_date,
                ServiceRecord.facility == facility,
            )
        ).scalar_one_or_none()

        if existing:
            skipped += 1
            continue

        record = ServiceRecord(
            vehicle_id=vehicle_id, service_date=service_date, facility=facility,
            odometer=odometer, services_performed=services or None, notes=notes,
        )
        session.add(record)
        imported += 1

    log.info(f"  Service records: {imported} imported, {skipped} skipped")


def import_interval_items(ws, session: Session, vehicle_id: uuid.UUID):
    """Import from 'Interval Tracking' sheet."""
    log.info("Importing interval items...")
    imported, skipped = 0, 0

    rows = list(ws.iter_rows(min_row=2, values_only=True))
    for row in rows:
        if not row or not row[0]:
            continue

        name = str(row[0]).strip()
        if not name:
            continue

        item_type_str = str(row[1]).strip().lower() if len(row) > 1 and row[1] else "regular"
        item_type = IntervalItemType.AD_HOC if "ad" in item_type_str else IntervalItemType.REGULAR

        last_date = safe_date(row[2]) if len(row) > 2 else None
        last_miles = safe_int(row[3]) if len(row) > 3 else None
        interval_miles = safe_int(row[4]) if len(row) > 4 else None
        next_miles = safe_int(row[5]) if len(row) > 5 else None
        threshold = safe_int(row[6]) if len(row) > 6 else 500
        cost = safe_float(row[7]) if len(row) > 7 else None
        notes = str(row[8]).strip() if len(row) > 8 and row[8] else None

        # Check for duplicate
        existing = session.execute(
            select(IntervalItem).where(
                IntervalItem.vehicle_id == vehicle_id,
                IntervalItem.name == name,
            )
        ).scalar_one_or_none()

        if existing:
            skipped += 1
            continue

        item = IntervalItem(
            vehicle_id=vehicle_id, name=name, type=item_type,
            last_service_date=last_date, last_service_miles=last_miles,
            recommended_interval_miles=interval_miles, next_service_miles=next_miles,
            due_soon_threshold_miles=threshold or 500, estimated_cost=cost,
            notes=notes,
        )
        session.add(item)
        imported += 1

    log.info(f"  Interval items: {imported} imported, {skipped} skipped")


def import_observations(ws, session: Session, vehicle_id: uuid.UUID):
    """Import from 'Misc - Observations' sheet."""
    log.info("Importing observations...")
    imported, skipped = 0, 0

    rows = list(ws.iter_rows(min_row=2, values_only=True))
    for row in rows:
        if not row or not row[0]:
            continue

        obs_date = safe_date(row[0])
        if not obs_date:
            skipped += 1
            continue

        odometer = safe_int(row[1]) if len(row) > 1 else None
        observation = str(row[2]).strip() if len(row) > 2 and row[2] else None
        if not observation:
            skipped += 1
            continue

        resolved = False
        if len(row) > 3 and row[3]:
            resolved = str(row[3]).strip().lower() in ("yes", "true", "resolved", "1")

        resolved_date = safe_date(row[4]) if len(row) > 4 else None

        # Check for duplicate
        existing = session.execute(
            select(Observation).where(
                Observation.vehicle_id == vehicle_id,
                Observation.observation_date == obs_date,
                Observation.observation == observation,
            )
        ).scalar_one_or_none()

        if existing:
            skipped += 1
            continue

        obs = Observation(
            vehicle_id=vehicle_id, observation_date=obs_date, odometer=odometer,
            observation=observation, resolved=resolved, resolved_date=resolved_date,
        )
        session.add(obs)
        imported += 1

    log.info(f"  Observations: {imported} imported, {skipped} skipped")


# Mapping of expected sheet names to import functions
SHEET_MAP = {
    "Oil Changes": import_oil_changes,
    "Other Services": import_service_records,
    "Interval Tracking": import_interval_items,
    "Misc - Observations": import_observations,
}


def main(xlsx_path: str):
    log.info(f"Opening {xlsx_path}")
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    log.info(f"Sheets found: {wb.sheetnames}")

    engine = get_sync_engine()

    with Session(engine) as session:
        # Import vehicles first
        vehicle_sheet = None
        for name in ("Truck Details", "Vehicle Details", "Vehicle"):
            if name in wb.sheetnames:
                vehicle_sheet = wb[name]
                break

        if not vehicle_sheet:
            log.error("No vehicle details sheet found. Expected 'Truck Details'.")
            sys.exit(1)

        vehicle_map = import_vehicles(vehicle_sheet, session)
        if not vehicle_map:
            log.error("No vehicles imported.")
            sys.exit(1)

        # Use the first (and likely only) vehicle
        vehicle_id = list(vehicle_map.values())[0]
        log.info(f"Using vehicle ID: {vehicle_id}")

        # Import each data sheet
        for sheet_name, import_fn in SHEET_MAP.items():
            if sheet_name in wb.sheetnames:
                import_fn(wb[sheet_name], session, vehicle_id)
            else:
                log.warning(f"Sheet '{sheet_name}' not found, skipping")

        session.commit()
        log.info("Import complete.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/import_spreadsheet.py <path-to-xlsx>")
        sys.exit(1)
    main(sys.argv[1])
