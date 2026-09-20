from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.database import get_db
from app.db.models import Profile, OptimizationRun, OptimizedRoute, OptimizedRouteStop, ReturnLoadAssignment as DBReturnLoadAssignment
from app.api.dependencies import get_current_profile
from app.schemas.optimization import OptimizationRunRequest, OptimizationRunResponse
from app.services.optimization.orchestrator import OptimizationOrchestrator
from geoalchemy2.shape import to_shape
import json

router = APIRouter()

@router.post("/runs", response_model=OptimizationRunResponse, status_code=status.HTTP_201_CREATED)
async def run_optimization(
    request: OptimizationRunRequest,
    db: Session = Depends(get_db),
    profile: Profile = Depends(get_current_profile)
):
    """
    Triggers an optimization run based on the provided scenario.
    """
    # 1. Scope Validation
    if profile.role != 'ADMIN':
        if not profile.operator_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="Operator profile requires an assigned operator_id to run optimization."
            )
        
        # Prevent operator from overriding the operator scope
        if request.operator_ids is not None:
            if request.operator_ids != [profile.operator_id]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN, 
                    detail="Operators can only optimize their own workload."
                )
        else:
            request.operator_ids = [profile.operator_id]
            
    # 2. Application Service Invocation (Execution Model A3)
    orchestrator = OptimizationOrchestrator(db)
    
    # Run orchestration
    result = await orchestrator.run_optimization(request)
    
    # 3. HTTP Mapping
    if result.status == "FAILED":
        # We could map specific diagnostics back to 400 vs 500, but returning the structured FAILED payload 
        # is often sufficient for 201 created or we can raise HTTPException.
        # Given it's a domain failure (like no orders), a 422 or 400 is appropriate.
        # But for now, returning the standard OptimizationRunResponse with FAILED status is valid domain behavior.
        # Let's inspect the diagnostics to return a 400 for empty workload if needed.
        if any("empty" in d.message.lower() for d in result.diagnostics):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=result.model_dump(mode='json'))
            
        # Return 201 with FAILED status for others, or 500 if unexpected internal error.
        if any("unexpected" in d.message.lower() for d in result.diagnostics):
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=result.model_dump(mode='json'))

    return result

@router.get("/latest", response_model=OptimizationRunResponse)
def get_latest_optimization(
    scenario: str = Query(default="DEMO"),
    db: Session = Depends(get_db),
    profile: Profile = Depends(get_current_profile)
):
    query = db.query(OptimizationRun).filter(OptimizationRun.scenario == scenario)
    if profile.role != 'ADMIN':
        if not profile.operator_id:
            raise HTTPException(status_code=403, detail="Operator requires operator_id")
        query = query.filter(OptimizationRun.operator_id == profile.operator_id)
        
    latest_run = query.order_by(OptimizationRun.created_at.desc()).first()
    if not latest_run:
        raise HTTPException(status_code=404, detail="No runs found")
        
    # Reconstruct OptimizationRunResponse
    routes = []
    db_routes = db.query(OptimizedRoute).filter(OptimizedRoute.run_id == latest_run.id).all()
    
    # Build route-to-return-load map from real ReturnLoadAssignment records
    # Used for analytics; route-level return_load uses the persisted column directly
    db_assignments = db.query(DBReturnLoadAssignment).filter(
        DBReturnLoadAssignment.run_id == latest_run.id,
        DBReturnLoadAssignment.assignment_status == "ASSIGNED"
    ).all()
    
    for db_r in db_routes:
        geom = to_shape(db_r.geometry)
        coords = list(geom.coords)
        
        stops = []
        db_stops = db.query(OptimizedRouteStop).filter(OptimizedRouteStop.route_id == db_r.id).order_by(OptimizedRouteStop.sequence_index).all()
        for db_s in db_stops:
            s_geom = to_shape(db_s.location)
            stops.append({
                "order_id": str(db_s.order_id) if db_s.order_id else None,
                "return_load_id": str(db_s.return_load_id) if db_s.return_load_id else None,
                "stop_type": db_s.stop_type,
                "sequence_index": db_s.sequence_index,
                "location": [s_geom.y, s_geom.x]
            })
            
        routes.append({
            "vehicle_id": str(db_r.vehicle_id),
            "total_distance_meters": db_r.total_distance_meters,
            "total_duration_seconds": db_r.total_duration_seconds,
            "geometry": {
                "type": "LineString",
                "coordinates": coords
            },
            "stops": stops,
            "return_load": str(db_r.return_load_id) if db_r.return_load_id else None
        })
        
    metrics = {
        "baseline": {
            "distance_meters": latest_run.baseline_distance_meters or 0,
            "duration_seconds": latest_run.baseline_duration_seconds or 0,
            "vehicles_used": latest_run.baseline_vehicles_used or 0
        },
        "optimized": {
            "distance_meters": latest_run.optimized_distance_meters or 0,
            "duration_seconds": latest_run.optimized_duration_seconds or 0,
            "vehicles_used": latest_run.optimized_vehicles_used or 0
        },
        "savings": {
            "comparable_workload_count": latest_run.comparable_workload_count or 0,
            "distance_saved_meters": (latest_run.baseline_distance_meters or 0) - (latest_run.optimized_distance_meters or 0),
            "cost_saved_inr": latest_run.cost_saved_inr or 0,
            "co2_saved_kg": latest_run.co2_saved_kg or 0
        }
    }
    
    return OptimizationRunResponse(
        run_id=str(latest_run.id),
        status=latest_run.status,
        scenario=latest_run.scenario,
        solver_status=latest_run.solver_status,
        diagnostics=latest_run.diagnostics,
        metrics=metrics,
        routes=routes
    )
