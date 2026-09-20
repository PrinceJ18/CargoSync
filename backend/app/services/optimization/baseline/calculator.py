from typing import List, Dict
from uuid import UUID

from app.services.optimization.baseline.schemas import BaselineInput, BaselineResult
from app.services.routing.routing_service import RoutingService
from app.services.routing.schemas import RoutingRequest, Coordinate
from app.services.routing.exceptions import RoutingBaseException
from app.services.optimization.exceptions import EmptyWorkloadError

class BaselineCalculator:
    def __init__(self, routing_service: RoutingService):
        self.routing_service = routing_service
        
    async def calculate_baseline(self, baseline_input: BaselineInput) -> BaselineResult:
        if not baseline_input.orders:
            raise EmptyWorkloadError("No valid orders provided for baseline calculation.")
            
        total_distance = 0.0
        total_duration = 0.0
        successful = 0
        failed = 0
        diagnostics = []
        
        import asyncio
        semaphore = asyncio.Semaphore(10)
        
        async def fetch_route(req):
            async with semaphore:
                return await self.routing_service.get_route(req)
                
        tasks = []
        for order in baseline_input.orders:
            depot_coord = Coordinate(
                latitude=order.origin_depot_latitude,
                longitude=order.origin_depot_longitude
            )
            order_coord = Coordinate(
                latitude=order.destination_latitude,
                longitude=order.destination_longitude
            )
            
            # Independent Operator Round-Trip: Depot -> Order -> Depot
            req = RoutingRequest(
                origin=depot_coord,
                waypoints=[order_coord],
                destination=depot_coord
            )
            tasks.append(fetch_route(req))
            
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for i, res in enumerate(results):
            order = baseline_input.orders[i]
            if isinstance(res, Exception):
                raise RoutingBaseException(f"Failed to calculate complete baseline. Order {order.order_id} failed: {str(res)}")
            elif not res.success:
                raise RoutingBaseException(f"Order {order.order_id} failed baseline route: {res.status_info}")
            else:
                total_distance += res.distance_meters
                total_duration += res.duration_seconds
                successful += 1
                
        if successful == 0:
            raise EmptyWorkloadError("All baseline routing requests failed. Cannot generate valid reference metrics.")
            
        return BaselineResult(
            distance_reference_m=total_distance,
            duration_reference_s=total_duration,
            order_count=len(baseline_input.orders),
            successfully_routed_order_count=successful,
            failed_order_count=failed,
            diagnostics=diagnostics
        )
