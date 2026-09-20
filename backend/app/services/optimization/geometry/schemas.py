from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from uuid import UUID
from app.services.routing.schemas import Coordinate

class ExtractedRouteGeometry(BaseModel):
    route_id: str = Field(description="The ID of the route from OptimizationResultRoute")
    vehicle_id: UUID = Field(description="The ID of the vehicle assigned to this route")
    ordered_coordinates: List[Coordinate] = Field(description="The sequence of coordinates starting at origin, through waypoints, to destination")
    distance_meters: float = Field(description="The exact road distance computed by the routing provider")
    duration_seconds: float = Field(description="The exact road duration computed by the routing provider")
    geometry: Optional[Dict[str, Any]] = Field(default=None, description="GeoJSON LineString geometry of the route")
    provider: str = Field(description="The routing provider used, e.g. 'osrm'")
    status: str = Field(description="'SUCCESS' or 'FAILED'")
    error_message: Optional[str] = None

class GeometryExtractionResult(BaseModel):
    routes: List[ExtractedRouteGeometry] = Field(default_factory=list)
    status: str = Field(description="'SUCCESS', 'PARTIAL', or 'FAILED'")
    message: Optional[str] = None
