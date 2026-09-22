from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID

class ProfileResponse(BaseModel):
    id: UUID
    role: str
    operator_id: Optional[UUID] = None
    operator_name: Optional[str] = None
    email: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
