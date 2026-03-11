from fastapi import APIRouter

from app.api import vehicles, oil_changes, service_records, interval_items, observations, attachments, settings, dashboard, export, push, categories, shops

api_router = APIRouter()

api_router.include_router(vehicles.router, prefix="/vehicles", tags=["vehicles"])
api_router.include_router(dashboard.router, prefix="/vehicles", tags=["dashboard"])
api_router.include_router(oil_changes.router, prefix="/vehicles", tags=["oil-changes"])
api_router.include_router(service_records.router, prefix="/vehicles", tags=["service-records"])
api_router.include_router(interval_items.router, prefix="/vehicles", tags=["interval-items"])
api_router.include_router(observations.router, prefix="/vehicles", tags=["observations"])
api_router.include_router(push.subscription_router, prefix="/vehicles", tags=["push-subscriptions"])
api_router.include_router(categories.router, tags=["categories"])
api_router.include_router(shops.router, prefix="/vehicles", tags=["shops"])
api_router.include_router(attachments.router, prefix="/attachments", tags=["attachments"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(push.router, prefix="/push", tags=["push"])
api_router.include_router(export.router, prefix="/export", tags=["export"])
