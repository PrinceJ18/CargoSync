from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

class OrderBase(BaseModel):
    reference_number: str = Field(..., min_length=1)
    origin_depot_id: Optional[UUID] = None
    destination_latitude: float = Field(..., ge=-90, le=90)
    destination_longitude: float = Field(..., ge=-180, le=180)
    weight_kg: float = Field(..., gt=0)
    status: str = "PENDING"
    pickup_window_start: Optional[datetime] = None
    pickup_window_end: Optional[datetime] = None
    delivery_window_start: Optional[datetime] = None
    delivery_window_end: Optional[datetime] = None
    scenario: str = "DEMO"

class OrderCreate(OrderBase):
    pass

class OrderUpdate(BaseModel):
    reference_number: Optional[str] = Field(None, min_length=1)
    origin_depot_id: Optional[UUID] = None
    destination_latitude: Optional[float] = Field(None, ge=-90, le=90)
    destination_longitude: Optional[float] = Field(None, ge=-180, le=180)
    weight_kg: Optional[float] = Field(None, gt=0)
    status: Optional[str] = None
    pickup_window_start: Optional[datetime] = None
    pickup_window_end: Optional[datetime] = None
    delivery_window_start: Optional[datetime] = None
    delivery_window_end: Optional[datetime] = None

class OrderResponse(OrderBase):
    id: UUID
    operator_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
