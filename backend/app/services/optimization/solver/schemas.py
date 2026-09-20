from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from app.services.optimization.metrics.schemas import OptimizationSavings

class OptimizationResultRoute(BaseModel):
    route_id: str
    vehicle_id: UUID
    depot_id: Optional[UUID] = None
    ordered_node_ids: List[str]
    ordered_order_ids: List[UUID]
    
    total_distance_meters: float
    total_duration_seconds: float
    total_weight_kg: float
    capacity_kg: float
    utilization_ratio: float
    
    workload_unit_ids: List[str]
    parent_cluster_ids: List[str]
    route_status: str = "FEASIBLE"

class OptimizationResult(BaseModel):
    status: str = Field(description="'OPTIMAL', 'FEASIBLE', 'INFEASIBLE', 'NO_SOLUTION', 'INVALID_INPUT'")
    message: Optional[str] = None
    
    routes: List[OptimizationResultRoute] = Field(default_factory=list)
    
    total_vehicles_eligible: int = 0
    total_vehicles_used: int = 0
    vehicle_activation_ratio: float = 0.0
    unused_vehicles: List[UUID] = Field(default_factory=list)
    
    unserviceable_order_ids: List[UUID] = Field(default_factory=list)
    unassigned_order_ids: List[UUID] = Field(default_factory=list)
    
    total_distance_meters: float = 0.0
    total_duration_seconds: float = 0.0
    
    savings: Optional[OptimizationSavings] = None
