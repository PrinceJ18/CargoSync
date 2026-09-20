from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from uuid import UUID

from app.db.database import get_db
from app.db.models import Order, Profile
from app.schemas.order import OrderCreate, OrderUpdate, OrderResponse
from app.api.dependencies import get_current_profile
from geoalchemy2.shape import to_shape

router = APIRouter()

def convert_order(order: Order) -> OrderResponse:
    pt = to_shape(order.destination_location)
    return OrderResponse(
        id=order.id,
        operator_id=order.operator_id,
        scenario=order.scenario,
        reference_number=order.reference_number,
        origin_depot_id=order.origin_depot_id,
        destination_latitude=pt.y,
        destination_longitude=pt.x,
        weight_kg=order.weight_kg,
        status=order.status,
        pickup_window_start=order.pickup_window_start,
        pickup_window_end=order.pickup_window_end,
        delivery_window_start=order.delivery_window_start,
        delivery_window_end=order.delivery_window_end,
        created_at=order.created_at,
        updated_at=order.updated_at
    )

@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in: OrderCreate,
    db: Session = Depends(get_db),
    profile: Profile = Depends(get_current_profile)
):
    if profile.role != 'ADMIN' and not profile.operator_id:
        raise HTTPException(status_code=403, detail="Operator profile requires an assigned operator_id")
    
    operator_id = profile.operator_id
    if not operator_id:
        raise HTTPException(status_code=400, detail="Cannot create order without an operator_id")
        
    if order_in.scenario == "DEMO":
        raise HTTPException(status_code=403, detail="Cannot create data in the protected DEMO scenario")

    order = Order(
        operator_id=operator_id,
        scenario=order_in.scenario,
        reference_number=order_in.reference_number,
        origin_depot_id=order_in.origin_depot_id,
        destination_location=f"SRID=4326;POINT({order_in.destination_longitude} {order_in.destination_latitude})",
        weight_kg=order_in.weight_kg,
        status=order_in.status,
        pickup_window_start=order_in.pickup_window_start,
        pickup_window_end=order_in.pickup_window_end,
        delivery_window_start=order_in.delivery_window_start,
        delivery_window_end=order_in.delivery_window_end
    )
    
    try:
        db.add(order)
        db.commit()
        db.refresh(order)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Order with this reference number already exists")
        
    return convert_order(order)

@router.get("/", response_model=List[OrderResponse])
def list_orders(
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None,
    scenario: Optional[str] = None,
    db: Session = Depends(get_db),
    profile: Profile = Depends(get_current_profile)
):
    query = db.query(Order)
    if profile.role != 'ADMIN':
        if not profile.operator_id:
            return []
        query = query.filter(Order.operator_id == profile.operator_id)
        
    if status:
        query = query.filter(Order.status == status)
    if scenario:
        query = query.filter(Order.scenario == scenario)
        
    orders = query.limit(page_size).offset((page - 1) * page_size).all()
    return [convert_order(o) for o in orders]

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    profile: Profile = Depends(get_current_profile)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if profile.role != 'ADMIN' and order.operator_id != profile.operator_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this order")
        
    return convert_order(order)

@router.patch("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: UUID,
    order_in: OrderUpdate,
    db: Session = Depends(get_db),
    profile: Profile = Depends(get_current_profile)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if profile.role != 'ADMIN' and order.operator_id != profile.operator_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this order")
        
    if order.scenario == "DEMO" or (order_in.scenario and order_in.scenario == "DEMO"):
        raise HTTPException(status_code=403, detail="Cannot modify data in the protected DEMO scenario")
        
    update_data = order_in.model_dump(exclude_unset=True)
    
    if "destination_latitude" in update_data or "destination_longitude" in update_data:
        pt = to_shape(order.destination_location)
        lat = update_data.pop("destination_latitude", pt.y)
        lon = update_data.pop("destination_longitude", pt.x)
        order.destination_location = f"SRID=4326;POINT({lon} {lat})"
        
    for field, value in update_data.items():
        setattr(order, field, value)
        
    try:
        db.commit()
        db.refresh(order)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Integrity error, perhaps duplicate reference number")
        
    return convert_order(order)

@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    profile: Profile = Depends(get_current_profile)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if profile.role != 'ADMIN' and order.operator_id != profile.operator_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this order")
        
    if order.scenario == "DEMO":
        raise HTTPException(status_code=403, detail="Cannot delete data in the protected DEMO scenario")
        
    try:
        db.delete(order)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=409, detail="Cannot delete order due to dependent records")
