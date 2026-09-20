from typing import List
from app.services.routing.schemas import RoutingRequest, RoutingResponse, Coordinate, MatrixRequest, MatrixResponse
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

    async def get_matrix(self, request: MatrixRequest, max_coords: int = 100) -> MatrixResponse:
        # Validate all coordinates
        for coord in request.locations:
            self._validate_coordinate(coord)
            
        num_locs = len(request.locations)
        try:
            if num_locs <= max_coords:
                table_data = await self.client.get_table(request.locations)
                return MatrixResponse(
                    distances=table_data["distances"],
                    durations=table_data["durations"],
                    provider="osrm",
                    success=True,
                    status_info="OK"
                )
                
            # Need to chunk
            chunk_size = max_coords // 2
            indices = list(range(num_locs))
            chunks = [indices[i:i+chunk_size] for i in range(0, num_locs, chunk_size)]
            
            distances = [[0.0 for _ in range(num_locs)] for _ in range(num_locs)]
            durations = [[0.0 for _ in range(num_locs)] for _ in range(num_locs)]
            
            import asyncio
            
            async def _fetch_chunk(src_chunk, dest_chunk):
                subset_coords = [request.locations[i] for i in src_chunk] + [request.locations[i] for i in dest_chunk]
                subset_sources = list(range(len(src_chunk)))
                subset_destinations = list(range(len(src_chunk), len(src_chunk) + len(dest_chunk)))
                
                table_data = await self.client.get_table(subset_coords, sources=subset_sources, destinations=subset_destinations)
                return src_chunk, dest_chunk, table_data
                
            results = []
            for src_chunk in chunks:
                for dest_chunk in chunks:
                    res = await _fetch_chunk(src_chunk, dest_chunk)
                    results.append(res)
            
            for src_chunk, dest_chunk, table_data in results:
                dist_chunk = table_data["distances"]
                dur_chunk = table_data["durations"]
                
                for i, src_idx in enumerate(src_chunk):
                    for j, dest_idx in enumerate(dest_chunk):
                        distances[src_idx][dest_idx] = dist_chunk[i][j]
                        durations[src_idx][dest_idx] = dur_chunk[i][j]
            
            return MatrixResponse(
                distances=distances,
                durations=durations,
                provider="osrm",
                success=True,
                status_info="OK"
            )
        except RoutingBaseException as e:
            raise e
