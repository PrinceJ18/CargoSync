from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class Coordinate(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude between -90 and 90")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude between -180 and 180")

class RoutingRequest(BaseModel):
    origin: Coordinate
    destination: Coordinate
    waypoints: List[Coordinate] = Field(default_factory=list, description="Ordered intermediate stops")

class RoutingResponse(BaseModel):
    distance_meters: float
    duration_seconds: float
    geometry: Dict[str, Any] = Field(description="GeoJSON LineString geometry of the route")
    provider: str = Field(description="The routing provider used, e.g. 'osrm'")
    success: bool
    status_info: Optional[str] = None
