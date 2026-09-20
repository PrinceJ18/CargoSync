from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Profile, ReturnLoad
from app.api.dependencies import get_current_profile
from geoalchemy2.shape import to_shape

router = APIRouter()

@router.get("/")
def get_return_loads(
    scenario: str = Query(default="DEMO"),
    db: Session = Depends(get_db),
    profile: Profile = Depends(get_current_profile)
):
    """
    Returns return loads from the database for the given scenario.
    """
    query = db.query(ReturnLoad).filter(ReturnLoad.scenario == scenario)
    
    records = query.all()
    results = []
    for rl in records:
        p_shp = to_shape(rl.pickup_location)
        d_shp = to_shape(rl.delivery_location)
        results.append({
            "id": str(rl.id),
            "reference_number": rl.reference_number,
            "scenario": rl.scenario,
            "weight_kg": float(rl.weight_kg),
            "status": rl.status,
            "pickup_location": [p_shp.y, p_shp.x],
            "delivery_location": [d_shp.y, d_shp.x],
        })
    return results
