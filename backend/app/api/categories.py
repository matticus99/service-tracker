from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import ServiceCategory
from app.schemas.service_category import CategoryOut

router = APIRouter()


@router.get("/categories", response_model=list[CategoryOut])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ServiceCategory)
        .options(selectinload(ServiceCategory.services))
        .order_by(ServiceCategory.display_order, ServiceCategory.name)
    )
    return result.scalars().all()
