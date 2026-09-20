from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from enum import Enum
from datetime import datetime

class ReturnLoadCandidateStatus(str, Enum):
    ELIGIBLE = "ELIGIBLE"
    REJECTED_CAPACITY = "REJECTED_CAPACITY"
    REJECTED_PROXIMITY = "REJECTED_PROXIMITY"
    REJECTED_DETOUR = "REJECTED_DETOUR"
    REJECTED_INVALID_DATA = "REJECTED_INVALID_DATA"

class ReturnLoadAssignmentStatus(str, Enum):
    ASSIGNED = "ASSIGNED"
    UNASSIGNED_REOPTIMIZATION_FAILED = "UNASSIGNED_REOPTIMIZATION_FAILED"
    UNASSIGNED_NO_ELIGIBLE_ROUTE = "UNASSIGNED_NO_ELIGIBLE_ROUTE"

class ReturnLoadOpportunity(BaseModel):
    return_load_id: UUID
    operator_id: UUID
    pickup_latitude: float
    pickup_longitude: float
    delivery_latitude: float
    delivery_longitude: float
    weight_kg: float
    pickup_window_start: Optional[datetime] = None
    pickup_window_end: Optional[datetime] = None
    delivery_window_start: Optional[datetime] = None
    delivery_window_end: Optional[datetime] = None

class ReturnLoadCandidate(BaseModel):
    return_load_id: UUID
    route_id: str  # The workload route identifier
    vehicle_id: UUID
    operator_id: UUID
    remaining_capacity_kg: float
    return_load_weight_kg: float
    pickup_latitude: float
    pickup_longitude: float
    delivery_latitude: float
    delivery_longitude: float
    pickup_proximity_meters: Optional[float] = None
    incremental_detour_meters: Optional[float] = None
    incremental_duration_seconds: Optional[float] = None
    eligibility_status: ReturnLoadCandidateStatus
    rejection_reason: Optional[str] = None

class ReturnLoadAssignment(BaseModel):
    return_load_id: UUID
    route_id: str
    vehicle_id: UUID
    assignment_status: ReturnLoadAssignmentStatus
    incremental_detour_meters: float
    incremental_duration_seconds: float
    remaining_capacity_after_kg: float
    rejection_reason: Optional[str] = None

class ReturnLoadMatchingResult(BaseModel):
    evaluated_return_load_ids: List[UUID]
    candidates: List[ReturnLoadCandidate]
    assignments: List[ReturnLoadAssignment]
    unassigned_return_loads: List[UUID]
    rejected_candidates: List[ReturnLoadCandidate]
