from fastapi import APIRouter
from app.api.v1 import health, depots, vehicles, orders, routing, optimization, analytics, return_loads, auth

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(health.router, prefix="", tags=["health"])
api_router.include_router(depots.router, prefix="/depots", tags=["depots"])
api_router.include_router(vehicles.router, prefix="/vehicles", tags=["vehicles"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(routing.router, prefix="/routing", tags=["routing"])
api_router.include_router(optimization.router, prefix="/optimization", tags=["optimization"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(return_loads.router, prefix="/return-loads", tags=["return_loads"])
