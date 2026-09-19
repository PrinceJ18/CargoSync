from typing import List
from app.services.routing.schemas import RoutingRequest, RoutingResponse, Coordinate
from app.services.routing.coordinate_validator import is_valid_global_coordinate
from app.services.routing.exceptions import CoordinateValidationError, RoutingBaseException
from app.services.routing.osrm_client import OSRMClient

class RoutingService:
    def __init__(self, client: OSRMClient = None):
        self.client = client or OSRMClient()
        
    def _validate_coordinate(self, coord: Coordinate):
        if not is_valid_global_coordinate(coord.latitude, coord.longitude):
            raise CoordinateValidationError(f"Invalid coordinate: lat={coord.latitude}, lon={coord.longitude}")
            
    async def get_route(self, request: RoutingRequest) -> RoutingResponse:
        # Validate all coordinates
        self._validate_coordinate(request.origin)
        for wp in request.waypoints:
            self._validate_coordinate(wp)
        self._validate_coordinate(request.destination)
        
        # Build ordered sequence
        coords = [request.origin] + request.waypoints + [request.destination]
        
        try:
            route_data = await self.client.get_route(coords)
            
            return RoutingResponse(
                distance_meters=route_data["distance"],
                duration_seconds=route_data["duration"],
                geometry=route_data["geometry"],
                provider="osrm",
                success=True,
                status_info="OK"
            )
        except RoutingBaseException as e:
            # We allow higher levels (like the API) to catch these or we can wrap them
            raise e
