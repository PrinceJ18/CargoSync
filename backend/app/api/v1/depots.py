from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.db.database import get_db
from app.db.models import Depot, Profile
from app.schemas.depot import DepotCreate, DepotUpdate, DepotResponse
from app.api.dependencies import get_current_profile
from geoalchemy2.shape import to_shape

router = APIRouter()

def convert_depot(depot: Depot) -> DepotResponse:
    pt = to_shape(depot.location)
    return DepotResponse(
        id=depot.id,
        operator_id=depot.operator_id,
        name=depot.name,
        address=depot.address,
        latitude=pt.y,
        longitude=pt.x,
        is_active=depot.is_active,
        scenario=depot.scenario,
        created_at=depot.created_at,
        updated_at=depot.updated_at
    )

@router.post("/", response_model=DepotResponse, status_code=status.HTTP_201_CREATED)
def create_depot(
    depot_in: DepotCreate,
    db: Session = Depends(get_db),
    profile: Profile = Depends(get_current_profile)
):
    if profile.role != 'ADMIN' and not profile.operator_id:
        raise HTTPException(status_code=403, detail="Operator profile requires an assigned operator_id")
    
    operator_id = profile.operator_id
    if not operator_id:
        raise HTTPException(status_code=400, detail="Cannot create depot without an operator_id")

    depot = Depot(
        operator_id=operator_id,
        scenario=depot_in.scenario,
        name=depot_in.name,
        address=depot_in.address,
        location=f"SRID=4326;POINT({depot_in.longitude} {depot_in.latitude})",
        is_active=depot_in.is_active
    )
    db.add(depot)
    db.commit()
    db.refresh(depot)
    return convert_depot(depot)

@router.get("/", response_model=List[DepotResponse])
def list_depots(
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    profile: Profile = Depends(get_current_profile)
):
    query = db.query(Depot)
    if profile.role != 'ADMIN':
        if not profile.operator_id:
            return []
        query = query.filter(Depot.operator_id == profile.operator_id)
        
    depots = query.limit(page_size).offset((page - 1) * page_size).all()
    return [convert_depot(d) for d in depots]

@router.get("/{depot_id}", response_model=DepotResponse)
def get_depot(
    depot_id: UUID,
    db: Session = Depends(get_db),
    profile: Profile = Depends(get_current_profile)
):
    depot = db.query(Depot).filter(Depot.id == depot_id).first()
    if not depot:
        raise HTTPException(status_code=404, detail="Depot not found")
        
    if profile.role != 'ADMIN' and depot.operator_id != profile.operator_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this depot")
        
    return convert_depot(depot)

@router.patch("/{depot_id}", response_model=DepotResponse)
def update_depot(
    depot_id: UUID,
    depot_in: DepotUpdate,
    db: Session = Depends(get_db),
    profile: Profile = Depends(get_current_profile)
):
    depot = db.query(Depot).filter(Depot.id == depot_id).first()
    if not depot:
        raise HTTPException(status_code=404, detail="Depot not found")
        
    if profile.role != 'ADMIN' and depot.operator_id != profile.operator_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this depot")
        
    update_data = depot_in.model_dump(exclude_unset=True)
    
    if "latitude" in update_data or "longitude" in update_data:
        pt = to_shape(depot.location)
        lat = update_data.pop("latitude", pt.y)
        lon = update_data.pop("longitude", pt.x)
        depot.location = f"SRID=4326;POINT({lon} {lat})"
        
    for field, value in update_data.items():
        setattr(depot, field, value)
        
    db.commit()
    db.refresh(depot)
    return convert_depot(depot)

@router.delete("/{depot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_depot(
    depot_id: UUID,
    db: Session = Depends(get_db),
    profile: Profile = Depends(get_current_profile)
):
    depot = db.query(Depot).filter(Depot.id == depot_id).first()
    if not depot:
        raise HTTPException(status_code=404, detail="Depot not found")
        
    if profile.role != 'ADMIN' and depot.operator_id != profile.operator_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this depot")
        
    try:
        db.delete(depot)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=409, detail="Cannot delete depot due to dependent records")
