from typing import List, Dict
from app.services.optimization.solver.schemas import OptimizationResultRoute
from app.services.optimization.return_loads.schemas import (
    ReturnLoadOpportunity,
    ReturnLoadCandidate,
    ReturnLoadCandidateStatus
)
from app.services.routing.osrm_client import OSRMClient
from app.services.routing.schemas import Coordinate
import asyncio

async def evaluate_return_load_candidates(
    route: OptimizationResultRoute,
    opportunities: List[ReturnLoadOpportunity],
    final_delivery_coord: Coordinate,
    depot_coord: Coordinate,
    osrm_client: OSRMClient
) -> List[ReturnLoadCandidate]:
    """
    Generates return load candidates for a single route.
    1. Filters on capacity (initial).
    2. Uses OSRM to calculate road-aware pickup proximity (<= 5km) and incremental detour (<= 25km).
    """
    candidates = []
    
    # Pre-filter opportunities by capacity
    valid_opportunities = []
    for rl in opportunities:
        if rl.weight_kg > route.capacity_kg:
            candidates.append(ReturnLoadCandidate(
                return_load_id=rl.return_load_id,
                route_id=route.route_id,
                vehicle_id=route.vehicle_id,
                operator_id=rl.operator_id,
                remaining_capacity_kg=route.capacity_kg,
                return_load_weight_kg=rl.weight_kg,
                pickup_latitude=rl.pickup_latitude,
                pickup_longitude=rl.pickup_longitude,
                delivery_latitude=rl.delivery_latitude,
                delivery_longitude=rl.delivery_longitude,
                eligibility_status=ReturnLoadCandidateStatus.REJECTED_CAPACITY,
                rejection_reason=f"Return load weight ({rl.weight_kg}kg) exceeds vehicle capacity ({route.capacity_kg}kg)"
            ))
        else:
            valid_opportunities.append(rl)
            
    if not valid_opportunities:
        return candidates
        
    coords = [final_delivery_coord, depot_coord]
    for rl in valid_opportunities:
        coords.append(Coordinate(latitude=rl.pickup_latitude, longitude=rl.pickup_longitude))
        coords.append(Coordinate(latitude=rl.delivery_latitude, longitude=rl.delivery_longitude))
        
    try:
        table = await osrm_client.get_table(coords)
        dists = table.get("distances", [])
        durs = table.get("durations", [])
        
        dist_orig = dists[0][1]
        dur_orig = durs[0][1]
        
        for i, rl in enumerate(valid_opportunities):
            pickup_idx = 2 + 2 * i
            delivery_idx = pickup_idx + 1
            
            # Original: 0 -> 1 (Final -> Depot)
            # New: 0 -> pickup -> delivery -> 1
            dist_new = dists[0][pickup_idx] + dists[pickup_idx][delivery_idx] + dists[delivery_idx][1]
            dur_new = durs[0][pickup_idx] + durs[pickup_idx][delivery_idx] + durs[delivery_idx][1]
            
            detour_meters = dist_new - dist_orig
            detour_seconds = dur_new - dur_orig
            pickup_proximity_meters = dists[0][pickup_idx]
            
            status = ReturnLoadCandidateStatus.ELIGIBLE
            reason = None
            
            if pickup_proximity_meters > 5000:
                status = ReturnLoadCandidateStatus.REJECTED_PROXIMITY
                reason = f"Pickup proximity {pickup_proximity_meters}m > 5000m limit"
            elif detour_meters > 25000:
                status = ReturnLoadCandidateStatus.REJECTED_DETOUR
                reason = f"Incremental detour {detour_meters}m > 25000m limit"
                
            candidates.append(ReturnLoadCandidate(
                return_load_id=rl.return_load_id,
                route_id=route.route_id,
                vehicle_id=route.vehicle_id,
                operator_id=rl.operator_id,
                remaining_capacity_kg=route.capacity_kg,
                return_load_weight_kg=rl.weight_kg,
                pickup_latitude=rl.pickup_latitude,
                pickup_longitude=rl.pickup_longitude,
                delivery_latitude=rl.delivery_latitude,
                delivery_longitude=rl.delivery_longitude,
                pickup_proximity_meters=pickup_proximity_meters,
                incremental_detour_meters=detour_meters,
                incremental_duration_seconds=detour_seconds,
                eligibility_status=status,
                rejection_reason=reason
            ))
            
    except Exception as e:
        for rl in valid_opportunities:
             candidates.append(ReturnLoadCandidate(
                return_load_id=rl.return_load_id,
                route_id=route.route_id,
                vehicle_id=route.vehicle_id,
                operator_id=rl.operator_id,
                remaining_capacity_kg=route.capacity_kg,
                return_load_weight_kg=rl.weight_kg,
                pickup_latitude=rl.pickup_latitude,
                pickup_longitude=rl.pickup_longitude,
                delivery_latitude=rl.delivery_latitude,
                delivery_longitude=rl.delivery_longitude,
                eligibility_status=ReturnLoadCandidateStatus.REJECTED_INVALID_DATA,
                rejection_reason=f"Routing calculation failed: {str(e)}"
            ))
             
    return candidates
