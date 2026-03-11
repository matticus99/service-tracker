import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ServiceCategory, ServiceDefinition

# 15 categories with display_order, 51 services
SEED_DATA = [
    ("Brake System", [
        "Brake Fluid Exchange",
        "Brake Line Inspection & Repair",
        "Brake Pad Replacement",
        "Brake Rotor Resurfacing/Replacement",
    ]),
    ("Climate Control", [
        "A/C Recharge & Diagnostic",
    ]),
    ("Cooling System", [
        "Coolant Flush & Exchange",
        "Radiator Hose Replacement",
        "Thermostat Replacement",
        "Water Pump Replacement",
    ]),
    ("Drivetrain", [
        "Clutch Replacement (Manual)",
        "CV Axle/Joint Replacement",
        "Differential Fluid Service",
        "Transfer Case Fluid Service",
        "Transmission Fluid Service",
    ]),
    ("Electrical System", [
        "Alternator Replacement",
        "Battery Testing & Replacement",
        "Exterior Light Bulb Replacement",
        "Starter Motor Replacement",
    ]),
    ("Engine & Lubrication", [
        "Oil & Filter Change",
    ]),
    ("Engine & Mechanical", [
        "Drive Belt Tensioner Replacement",
        "Engine Mount Replacement",
        "Serpentine Belt Replacement",
        "Timing Belt/Chain Replacement",
        "Valve Cover Gasket Replacement",
    ]),
    ("Exhaust & Emissions", [
        "Catalytic Converter Replacement",
        "EVAP System Repair",
        "Exhaust Muffler Replacement",
        "Oxygen (O2) Sensor Replacement",
        "PCV Valve Replacement",
    ]),
    ("Filtration Systems", [
        "Cabin Air Filter Replacement",
        "Engine Air Filter Replacement",
    ]),
    ("Fuel System", [
        "Fuel Filter Replacement",
        "Fuel Injector Cleaning",
        "Fuel Pump Replacement",
    ]),
    ("General Maintenance", [
        "Multi-Point Safety Inspection",
    ]),
    ("Ignition System", [
        "Ignition Coil Replacement",
        "Spark Plug Replacement",
    ]),
    ("Steering & Suspension", [
        "Ball Joint Replacement",
        "Control Arm Replacement",
        "Power Steering Fluid Flush",
        "Shock & Strut Replacement",
        "Sway Bar Link Replacement",
        "Tie Rod End Replacement",
        "Wheel Alignment",
    ]),
    ("Tires & Wheels", [
        "Tire Pressure Monitoring (TPMS) Service",
        "Tire Rotation",
        "Wheel Balancing",
        "Wheel Bearing Replacement",
    ]),
    ("Visibility & Safety", [
        "Windshield Washer Pump Replacement",
        "Windshield Wiper Replacement",
    ]),
]


async def seed_categories_and_services(session: AsyncSession) -> None:
    """Idempotent seed: only inserts if service_categories table is empty."""
    result = await session.execute(select(func.count()).select_from(ServiceCategory))
    count = result.scalar()
    if count > 0:
        return

    for display_order, (category_name, services) in enumerate(SEED_DATA):
        category = ServiceCategory(
            id=uuid.uuid4(),
            name=category_name,
            display_order=display_order,
        )
        session.add(category)
        await session.flush()

        for service_name in services:
            service = ServiceDefinition(
                id=uuid.uuid4(),
                category_id=category.id,
                name=service_name,
            )
            session.add(service)

    await session.flush()
