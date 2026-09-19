from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from uuid import UUID

from app.db.database import get_db
from app.db.models import Vehicle, Profile
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleResponse
from app.api.dependencies import get_current_profile

router = APIRouter()

@router.post("/", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle(
    vehicle_in: VehicleCreate,
    db: Session = Depends(get_db),
    profile: Profile = Depends(get_current_profile)
):
    if profile.role != 'ADMIN' and not profile.operator_id:
        raise HTTPException(status_code=403, detail="Operator profile requires an assigned operator_id")
    
    operator_id = profile.operator_id
    if not operator_id:
        raise HTTPException(status_code=400, detail="Cannot create vehicle without an operator_id")

    vehicle = Vehicle(
        operator_id=operator_id,
        scenario=vehicle_in.scenario,
        reference_number=vehicle_in.reference_number,
        vehicle_type=vehicle_in.vehicle_type,
        capacity_kg=vehicle_in.capacity_kg,
        status=vehicle_in.status,
        depot_id=vehicle_in.depot_id
    )
    
    try:
        db.add(vehicle)
        db.commit()
        db.refresh(vehicle)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Vehicle with this reference number already exists")
        
    return vehicle

@router.get("/", response_model=List[VehicleResponse])
def list_vehicles(
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    profile: Profile = Depends(get_current_profile)
):
    query = db.query(Vehicle)
    if profile.role != 'ADMIN':
        if not profile.operator_id:
            return []
        query = query.filter(Vehicle.operator_id == profile.operator_id)
        
    if status:
        query = query.filter(Vehicle.status == status)
        
    vehicles = query.limit(page_size).offset((page - 1) * page_size).all()
    return vehicles

@router.get("/{vehicle_id}", response_model=VehicleResponse)
def get_vehicle(
    vehicle_id: UUID,
    db: Session = Depends(get_db),
    profile: Profile = Depends(get_current_profile)
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
        
    if profile.role != 'ADMIN' and vehicle.operator_id != profile.operator_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this vehicle")
        
    return vehicle

@router.patch("/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle(
    vehicle_id: UUID,
    vehicle_in: VehicleUpdate,
    db: Session = Depends(get_db),
    profile: Profile = Depends(get_current_profile)
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
        
    if profile.role != 'ADMIN' and vehicle.operator_id != profile.operator_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this vehicle")
        
    update_data = vehicle_in.model_dump(exclude_unset=True)
        
    for field, value in update_data.items():
        setattr(vehicle, field, value)
        
    try:
        db.commit()
        db.refresh(vehicle)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Integrity error, perhaps duplicate reference number")
        
    return vehicle

@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(
    vehicle_id: UUID,
    db: Session = Depends(get_db),
    profile: Profile = Depends(get_current_profile)
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
        
    if profile.role != 'ADMIN' and vehicle.operator_id != profile.operator_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this vehicle")
        
    try:
        db.delete(vehicle)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=409, detail="Cannot delete vehicle due to dependent records")
