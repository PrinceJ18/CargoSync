from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

class VehicleBase(BaseModel):
    reference_number: str = Field(..., min_length=1)
    vehicle_type: str = Field(..., min_length=1)
    capacity_kg: float = Field(..., gt=0)
    status: str = "AVAILABLE"
    depot_id: Optional[UUID] = None
    scenario: str = "DEMO"

class VehicleCreate(VehicleBase):
    pass

class VehicleUpdate(BaseModel):
    reference_number: Optional[str] = Field(None, min_length=1)
    vehicle_type: Optional[str] = Field(None, min_length=1)
    capacity_kg: Optional[float] = Field(None, gt=0)
    status: Optional[str] = None
    depot_id: Optional[UUID] = None

class VehicleResponse(VehicleBase):
    id: UUID
    operator_id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
