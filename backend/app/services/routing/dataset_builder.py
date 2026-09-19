from typing import Optional, List, Dict
from sqlalchemy.orm import Session
from uuid import UUID
from geoalchemy2.shape import to_shape

from app.db.models import Order, Depot, Vehicle
from app.services.routing.dataset_schemas import RoutingOrder, RoutingDepot, RoutingVehicle, RoutingDataset, DatasetValidationIssue
from app.services.routing.coordinate_validator import is_valid_global_coordinate
from app.services.routing.exceptions import CoordinateValidationError

class RoutingDatasetBuilder:
    def __init__(self, db: Session):
        self.db = db

    def _extract_coordinates(self, wkb_element) -> tuple[float, float]:
        """Extracts latitude (Y) and longitude (X) from PostGIS WKBElement."""
        if wkb_element is None:
            raise CoordinateValidationError("Coordinate is NULL")
            
        try:
            shape = to_shape(wkb_element)
            lat = float(shape.y)
            lon = float(shape.x)
        except Exception as e:
            raise CoordinateValidationError(f"Failed to parse PostGIS geometry: {e}")
            
        if not is_valid_global_coordinate(lat, lon):
            raise CoordinateValidationError(f"Invalid global coordinates: lat={lat}, lon={lon}")
            
        return lat, lon

    def build_dataset(self, scenario: str, operator_id: Optional[UUID] = None) -> RoutingDataset:
        """
        Builds a routing-ready dataset.
        If operator_id is provided, scopes the dataset to that operator.
        If operator_id is None, fetches for all operators (ADMIN only).
        """
        
        # Build base queries
        depots_query = self.db.query(Depot).filter(Depot.scenario == scenario, Depot.is_active == True)
        vehicles_query = self.db.query(Vehicle).filter(Vehicle.scenario == scenario)
        orders_query = self.db.query(Order).filter(Order.scenario == scenario, Order.status == "PENDING")
        
        if operator_id:
            depots_query = depots_query.filter(Depot.operator_id == operator_id)
            vehicles_query = vehicles_query.filter(Vehicle.operator_id == operator_id)
            orders_query = orders_query.filter(Order.operator_id == operator_id)
            
        db_depots = depots_query.all()
        db_vehicles = vehicles_query.all()
        db_orders = orders_query.all()
        
        issues: List[DatasetValidationIssue] = []
        
        routing_depots: List[RoutingDepot] = []
        for depot in db_depots:
            try:
                lat, lon = self._extract_coordinates(depot.location)
                routing_depots.append(RoutingDepot(
                    id=depot.id,
                    operator_id=depot.operator_id,
                    name=depot.name,
                    latitude=lat,
                    longitude=lon
                ))
            except CoordinateValidationError as e:
                issues.append(DatasetValidationIssue(
                    record_type="Depot",
                    record_id=depot.id,
                    reference_number=depot.name,
                    reason=str(e),
                    severity="ERROR"
                ))
                
        routing_vehicles: List[RoutingVehicle] = []
        for vehicle in db_vehicles:
            if vehicle.capacity_kg <= 0:
                issues.append(DatasetValidationIssue(
                    record_type="Vehicle",
                    record_id=vehicle.id,
                    reference_number=vehicle.reference_number,
                    reason=f"Invalid vehicle capacity: {vehicle.capacity_kg}",
                    severity="ERROR"
                ))
                continue
                
            routing_vehicles.append(RoutingVehicle(
                id=vehicle.id,
                operator_id=vehicle.operator_id,
                reference_number=vehicle.reference_number,
                vehicle_type=vehicle.vehicle_type,
                capacity_kg=float(vehicle.capacity_kg),
                status=vehicle.status,
                depot_id=vehicle.depot_id
            ))
            
        routing_orders: List[RoutingOrder] = []
        for order in db_orders:
            try:
                lat, lon = self._extract_coordinates(order.destination_location)
                routing_orders.append(RoutingOrder(
                    id=order.id,
                    reference_number=order.reference_number,
                    operator_id=order.operator_id,
                    scenario=order.scenario,
                    destination_latitude=lat,
                    destination_longitude=lon,
                    weight_kg=float(order.weight_kg),
                    status=order.status,
                    pickup_window_start=order.pickup_window_start,
                    pickup_window_end=order.pickup_window_end,
                    delivery_window_start=order.delivery_window_start,
                    delivery_window_end=order.delivery_window_end
                ))
            except CoordinateValidationError as e:
                issues.append(DatasetValidationIssue(
                    record_type="Order",
                    record_id=order.id,
                    reference_number=order.reference_number,
                    reason=str(e),
                    severity="ERROR"
                ))

        return RoutingDataset(
            scenario=scenario,
            operator_id=operator_id,
            depots=routing_depots,
            vehicles=routing_vehicles,
            orders=routing_orders,
            issues=issues
        )
