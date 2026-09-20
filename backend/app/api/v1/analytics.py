from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.database import get_db
from app.db.models import Profile, OptimizationRun, ReturnLoadAssignment
from app.api.dependencies import get_current_profile

router = APIRouter()

@router.get("/metrics")
def get_metrics(
    scenario: str = Query(default="DEMO"),
    db: Session = Depends(get_db),
    profile: Profile = Depends(get_current_profile)
):
    """
    Returns analytics metrics aggregated from the most recent completed optimization run for the scenario.
    """
    # Find latest COMPLETED run for the scenario (and operator if not admin)
    query = db.query(OptimizationRun).filter(
        OptimizationRun.scenario == scenario,
        OptimizationRun.status == "COMPLETED"
    )
    
    if profile.role != 'ADMIN':
        if not profile.operator_id:
            raise HTTPException(status_code=403, detail="Operator requires operator_id")
        query = query.filter(OptimizationRun.operator_id == profile.operator_id)
        
    latest_run = query.order_by(OptimizationRun.created_at.desc()).first()
    
    if not latest_run:
        # Default empty metrics if no runs
        return {
            "total_distance": 0,
            "total_cost": 0,
            "utilization_pct": 0,
            "empty_returns_reduced": 0,
            "return_loads_matched": 0,
            "co2_reduced": 0
        }
    
    # Calculate utilization
    utilization_pct = 0
    if latest_run.baseline_vehicles_used and latest_run.baseline_vehicles_used > 0:
        if latest_run.optimized_vehicles_used is not None:
            utilization_pct = round((latest_run.optimized_vehicles_used / latest_run.baseline_vehicles_used) * 100)
    
    # We use distance saved as "empty returns reduced" in km for now
    empty_returns_reduced = 0
    if latest_run.baseline_distance_meters and latest_run.optimized_distance_meters:
        empty_returns_reduced = round((latest_run.baseline_distance_meters - latest_run.optimized_distance_meters) / 1000, 1)

    # Count real return-load assignments for this run
    return_loads_matched = db.query(ReturnLoadAssignment).filter(
        ReturnLoadAssignment.run_id == latest_run.id,
        ReturnLoadAssignment.assignment_status == "ASSIGNED"
    ).count()

    return {
        "total_distance": float(latest_run.optimized_distance_meters) if latest_run.optimized_distance_meters else 0,
        "total_cost": float(latest_run.cost_saved_inr) if latest_run.cost_saved_inr else 0,
        "utilization_pct": utilization_pct,
        "empty_returns_reduced": empty_returns_reduced,
        "return_loads_matched": return_loads_matched,
        "co2_reduced": float(latest_run.co2_saved_kg) if latest_run.co2_saved_kg else 0,
    }
