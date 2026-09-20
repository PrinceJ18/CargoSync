from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID

class UnserviceableOrder(BaseModel):
    order_id: UUID
    reference_number: Optional[str] = None
    required_weight_kg: float
    maximum_usable_capacity_kg: Optional[float] = None
    reason_code: str

class WorkloadUnit(BaseModel):
    workload_unit_id: str
    parent_cluster_id: str
    order_ids: List[UUID]
    order_count: int
    total_weight_kg: float
    capacity_limit_kg: float
    utilization_ratio: float
    centroid_latitude: float
    centroid_longitude: float
    status: str
    split_reason: Optional[str] = None

class CapacityPreparationResult(BaseModel):
    ready_workload_units: List[WorkloadUnit]
    unserviceable_orders: List[UnserviceableOrder]
    noise_order_ids: List[UUID]
    unclustered_order_ids: List[UUID]
    clustering_status: str
