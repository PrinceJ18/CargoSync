from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from app.db.database import get_db
from app.db.models import Profile, ReturnLoad
from app.schemas.common import OperatorSummary, PaginatedResponse
from app.api.dependencies import get_current_profile
import math
from geoalchemy2.shape import to_shape

router = APIRouter()

@router.get("/")
def get_return_loads(
    page: int = 1,
    page_size: int = 20,
    scenario: str = Query(default="DEMO"),
    db: Session = Depends(get_db),
    profile: Profile = Depends(get_current_profile)
):
    """
    Returns return loads from the database for the given scenario.
    """
    query = db.query(ReturnLoad).options(joinedload(ReturnLoad.operator)).filter(ReturnLoad.scenario == scenario)
    
    if profile.role != 'ADMIN':
        if not profile.operator_id:
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Operator requires operator_id")
        query = query.filter(ReturnLoad.operator_id == profile.operator_id)
        
    total = query.count()
    records = query.limit(page_size).offset((page - 1) * page_size).all()
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
            "operator_id": str(rl.operator_id),
            "operator": OperatorSummary.model_validate(rl.operator).model_dump(mode='json') if getattr(rl, 'operator', None) else None,
            "pickup_location": [p_shp.y, p_shp.x],
            "delivery_location": [d_shp.y, d_shp.x],
        })
    return {
        "items": results,
        "total": total,
        "page": page,
        "size": page_size,
        "pages": math.ceil(total / page_size) if page_size > 0 else 1
    }
