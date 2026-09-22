from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import TypeVar, Generic, List

class OperatorSummary(BaseModel):
    id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)

class DepotSummary(BaseModel):
    id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int
