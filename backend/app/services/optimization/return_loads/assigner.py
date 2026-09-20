from typing import List, Dict, Set
from uuid import UUID
from app.services.optimization.return_loads.schemas import (
    ReturnLoadCandidate,
    ReturnLoadCandidateStatus,
    ReturnLoadAssignment,
    ReturnLoadAssignmentStatus
)

def assign_return_loads(
    candidates: List[ReturnLoadCandidate]
) -> List[ReturnLoadAssignment]:
    """
    Stage 2: Deterministic Assignment
    Assigns eligible candidates to routes based on deterministic tie-breakers.
    Cumulatively tracks vehicle capacity.
    Ensures exclusive assignment of each return load.
    """
    
    # Filter only ELIGIBLE candidates
    eligible_candidates = [c for c in candidates if c.eligibility_status == ReturnLoadCandidateStatus.ELIGIBLE]
    
    # Sort deterministically
    # 1. minimum incremental_detour_meters (ascending)
    # 2. minimum incremental_duration_seconds (ascending)
    # 3. maximum remaining_capacity_kg (descending)
    # 4. deterministic route/vehicle identifier (lexicographical string fallback)
    # 5. return load id
    
    def sort_key(c: ReturnLoadCandidate):
        return (
            c.incremental_detour_meters,
            c.incremental_duration_seconds,
            -c.remaining_capacity_kg,
            str(c.route_id),
            str(c.return_load_id)
        )
        
    sorted_candidates = sorted(eligible_candidates, key=sort_key)
    
    assigned_return_load_ids: Set[UUID] = set()
    # Track current remaining capacity per route
    route_capacity_remaining: Dict[str, float] = {}
    
    # Initialize capacities
    for c in sorted_candidates:
        if c.route_id not in route_capacity_remaining:
            route_capacity_remaining[c.route_id] = c.remaining_capacity_kg
            
    assignments: List[ReturnLoadAssignment] = []
    
    for candidate in sorted_candidates:
        if candidate.return_load_id in assigned_return_load_ids:
            # Already assigned to another route
            continue
            
        current_capacity = route_capacity_remaining[candidate.route_id]
        
        if candidate.return_load_weight_kg <= current_capacity:
            # Assign
            remaining = current_capacity - candidate.return_load_weight_kg
            route_capacity_remaining[candidate.route_id] = remaining
            assigned_return_load_ids.add(candidate.return_load_id)
            
            assignments.append(ReturnLoadAssignment(
                return_load_id=candidate.return_load_id,
                route_id=candidate.route_id,
                vehicle_id=candidate.vehicle_id,
                assignment_status=ReturnLoadAssignmentStatus.ASSIGNED,
                incremental_detour_meters=candidate.incremental_detour_meters,
                incremental_duration_seconds=candidate.incremental_duration_seconds,
                remaining_capacity_after_kg=remaining
            ))
            
    return assignments
