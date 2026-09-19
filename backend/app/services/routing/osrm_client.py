import httpx
from typing import List, Dict, Any
from app.services.routing.schemas import Coordinate
from app.services.routing.exceptions import (
    ProviderTimeoutError,
    ProviderHTTPError,
    NoRouteFoundError,
    MalformedResponseError
)
from app.core.config import settings

class OSRMClient:
    """Client for communicating with an OSRM-compatible routing backend"""
    
    def __init__(self, base_url: str = None):
        self.base_url = base_url or (settings.OSRM_BASE_URL.rstrip("/") if settings.OSRM_BASE_URL else None)
        if not self.base_url:
            raise RuntimeError("Routing provider is not configured. OSRM_BASE_URL must be set.")
        
    async def get_route(self, coords: List[Coordinate]) -> Dict[str, Any]:
        """
        Fetch a route from OSRM. 
        OSRM expects coordinates in lon,lat order separated by semicolons.
        """
        if len(coords) < 2:
            raise ValueError("At least two coordinates (origin, destination) are required.")
            
        coord_strings = [f"{c.longitude},{c.latitude}" for c in coords]
        coords_path = ";".join(coord_strings)
        
        # We request GeoJSON geometries so we don't have to decode polyline strings ourselves
        url = f"{self.base_url}/route/v1/driving/{coords_path}?overview=full&geometries=geojson"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, timeout=10.0)
            except httpx.TimeoutException as e:
                raise ProviderTimeoutError(f"OSRM provider timed out: {e}")
            except httpx.RequestError as e:
                raise ProviderHTTPError(f"OSRM provider network error: {e}")
                
        if response.status_code != 200:
            # OSRM returns 400 for NoRoute or NoSegment
            try:
                data = response.json()
                if data.get("code") == "NoRoute":
                    raise NoRouteFoundError("No valid route found between the provided coordinates.")
            except Exception:
                pass
            raise ProviderHTTPError(f"OSRM returned HTTP {response.status_code}: {response.text}")
            
        try:
            data = response.json()
        except ValueError:
            raise MalformedResponseError("OSRM response was not valid JSON.")
            
        if data.get("code") != "Ok":
            if data.get("code") == "NoRoute":
                raise NoRouteFoundError("No valid route found between the provided coordinates.")
            raise MalformedResponseError(f"OSRM returned non-Ok code: {data.get('code')}")
            
        routes = data.get("routes")
        if not routes or not isinstance(routes, list) or len(routes) == 0:
            raise NoRouteFoundError("OSRM returned OK but provided no routes.")
            
        route = routes[0]
        
        if "distance" not in route or "duration" not in route or "geometry" not in route:
            raise MalformedResponseError("OSRM route object missing required distance, duration, or geometry.")
            
        return route
