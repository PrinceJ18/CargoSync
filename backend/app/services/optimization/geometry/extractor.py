from typing import List, Dict, Any, Optional
from app.services.optimization.schemas import OptimizationInput
from app.services.optimization.solver.schemas import OptimizationResult, OptimizationResultRoute
from app.services.routing.routing_service import RoutingService
from app.services.routing.schemas import RoutingRequest, Coordinate
from app.services.routing.exceptions import RoutingBaseException
from app.services.optimization.geometry.schemas import ExtractedRouteGeometry, GeometryExtractionResult

class RouteGeometryExtractor:
    def __init__(self, routing_service: RoutingService):
        self.routing_service = routing_service

    async def extract_geometry(
        self, 
        optimization_result: OptimizationResult, 
        optimization_input: OptimizationInput
    ) -> GeometryExtractionResult:
        
        # Build node_id to Coordinate map
        node_coords: Dict[str, Coordinate] = {}
        
        for depot in optimization_input.depots:
            depot_node_id = f"DEPOT-{depot.id}"
            node_coords[depot_node_id] = Coordinate(
                latitude=depot.latitude,
                longitude=depot.longitude
            )
        
        for order in optimization_input.orders:
            order_node_id = f"ORDER-{order.id}"
            node_coords[order_node_id] = Coordinate(
                latitude=order.destination_latitude,
                longitude=order.destination_longitude
            )

        extracted_routes: List[ExtractedRouteGeometry] = []
        overall_status = "SUCCESS"
        overall_message = "All route geometries extracted successfully."

        for route in optimization_result.routes:
            if len(route.ordered_node_ids) < 2:
                # Should not happen in a valid OR-Tools route, but protect against it
                extracted_routes.append(
                    ExtractedRouteGeometry(
                        route_id=route.route_id,
                        vehicle_id=route.vehicle_id,
                        ordered_coordinates=[],
                        distance_meters=0.0,
                        duration_seconds=0.0,
                        provider="none",
                        status="FAILED",
                        error_message="Route has fewer than 2 nodes, cannot extract geometry."
                    )
                )
                overall_status = "PARTIAL"
                continue
                
            # Map node IDs to coordinates
            try:
                route_coords = [node_coords[node_id] for node_id in route.ordered_node_ids]
            except KeyError as e:
                extracted_routes.append(
                    ExtractedRouteGeometry(
                        route_id=route.route_id,
                        vehicle_id=route.vehicle_id,
                        ordered_coordinates=[],
                        distance_meters=0.0,
                        duration_seconds=0.0,
                        provider="none",
                        status="FAILED",
                        error_message=f"Missing coordinate for node {str(e)}"
                    )
                )
                overall_status = "PARTIAL"
                continue

            origin = route_coords[0]
            destination = route_coords[-1]
            waypoints = route_coords[1:-1]
            
            request = RoutingRequest(
                origin=origin,
                destination=destination,
                waypoints=waypoints
            )
            
            try:
                response = await self.routing_service.get_route(request)
                extracted_routes.append(
                    ExtractedRouteGeometry(
                        route_id=route.route_id,
                        vehicle_id=route.vehicle_id,
                        ordered_coordinates=route_coords,
                        distance_meters=response.distance_meters,
                        duration_seconds=response.duration_seconds,
                        geometry=response.geometry,
                        provider=response.provider,
                        status="SUCCESS"
                    )
                )
            except RoutingBaseException as e:
                extracted_routes.append(
                    ExtractedRouteGeometry(
                        route_id=route.route_id,
                        vehicle_id=route.vehicle_id,
                        ordered_coordinates=route_coords,
                        distance_meters=0.0,
                        duration_seconds=0.0,
                        provider="osrm_or_unknown",
                        status="FAILED",
                        error_message=str(e)
                    )
                )
                overall_status = "PARTIAL"

        # If all failed
        if overall_status == "PARTIAL" and all(r.status == "FAILED" for r in extracted_routes) and extracted_routes:
            overall_status = "FAILED"
            overall_message = "All route geometries failed to extract."
        elif overall_status == "PARTIAL":
            overall_message = "Some route geometries failed to extract."

        return GeometryExtractionResult(
            routes=extracted_routes,
            status=overall_status,
            message=overall_message
        )
