from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID

class RoutingDepot(BaseModel):
    id: UUID
    operator_id: UUID
    name: str
    latitude: float
    longitude: float

class RoutingVehicle(BaseModel):
    id: UUID
    operator_id: UUID
    reference_number: str
    vehicle_type: str
    capacity_kg: float
    status: str
    depot_id: Optional[UUID] = None

class RoutingOrder(BaseModel):
    id: UUID
    reference_number: str
    operator_id: UUID
    scenario: str
    origin_depot_id: Optional[UUID] = None
    destination_latitude: float
    destination_longitude: float
    weight_kg: float
    status: str
    pickup_window_start: Optional[datetime] = None
    pickup_window_end: Optional[datetime] = None
    delivery_window_start: Optional[datetime] = None
    delivery_window_end: Optional[datetime] = None

class DatasetValidationIssue(BaseModel):
    record_type: str
    record_id: UUID
    reference_number: Optional[str] = None
    reason: str
    severity: str

class RoutingDataset(BaseModel):
    scenario: str
    operator_id: Optional[UUID] = None
    depots: List[RoutingDepot]
    vehicles: List[RoutingVehicle]
    orders: List[RoutingOrder]
    issues: List[DatasetValidationIssue] = Field(default_factory=list)
