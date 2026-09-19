from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID
from app.services.routing.dataset_schemas import DatasetValidationIssue

class OptimizationOrder(BaseModel):
    id: UUID
    reference_number: str
    operator_id: UUID
    scenario: str
    destination_latitude: float
    destination_longitude: float
    weight_kg: float
    status: str
    pickup_window_start: Optional[datetime] = None
    pickup_window_end: Optional[datetime] = None
    delivery_window_start: Optional[datetime] = None
    delivery_window_end: Optional[datetime] = None

class OptimizationVehicle(BaseModel):
    id: UUID
    operator_id: UUID
    reference_number: str
    vehicle_type: str
    capacity_kg: float
    status: str
    depot_id: Optional[UUID] = None

class OptimizationDepot(BaseModel):
    id: UUID
    operator_id: UUID
    name: str
    latitude: float
    longitude: float

class OptimizationInput(BaseModel):
    scenario: str
    operator_id: Optional[UUID] = None
    depot: OptimizationDepot
    vehicles: List[OptimizationVehicle]
    orders: List[OptimizationOrder]
    source_issues: List[DatasetValidationIssue] = Field(default_factory=list)
