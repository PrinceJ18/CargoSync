from pydantic import BaseModel
from typing import List
from uuid import UUID

class BaselineOrder(BaseModel):
    order_id: UUID
    operator_id: UUID
    origin_depot_id: UUID
    destination_latitude: float
    destination_longitude: float
    origin_depot_latitude: float
    origin_depot_longitude: float

class BaselineInput(BaseModel):
    orders: List[BaselineOrder]

class BaselineResult(BaseModel):
    distance_reference_m: float
    duration_reference_s: float
    order_count: int
    successfully_routed_order_count: int
    failed_order_count: int
    diagnostics: List[str]
