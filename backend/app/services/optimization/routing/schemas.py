from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID

class RoutingNode(BaseModel):
    node_id: str
    node_type: str = Field(description="'DEPOT', 'ORDER', or 'VEHICLE'")
    latitude: float
    longitude: float
    order_id: Optional[UUID] = None
    workload_unit_id: Optional[str] = None
    parent_cluster_id: Optional[str] = None
    depot_id: Optional[UUID] = None

class RoadCostEntry(BaseModel):
    origin_node_id: str
    destination_node_id: str
    distance_meters: Optional[float] = None
    duration_seconds: Optional[float] = None
    status: str = Field(description="'AVAILABLE' or 'UNAVAILABLE'")
    failure_reason: Optional[str] = None

class RoadCostMatrix(BaseModel):
    nodes: List[RoutingNode]
    # Matrix index mapping: node_id -> integer index
    node_index: dict[str, int]
    # 1D list of entries for simplicity, or 2D array. Let's provide a structured 1D list of entries.
    entries: List[RoadCostEntry]
    
    status: str = Field(description="'SUCCESS', 'PARTIAL', 'FAILED'")
    failure_reason: Optional[str] = None
