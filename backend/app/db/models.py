import uuid
from sqlalchemy import Column, Integer, String, DateTime, Numeric, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from geoalchemy2 import Geography
from app.db.database import Base

class Operator(Base):
    __tablename__ = "operators"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(UUID(as_uuid=True), primary_key=True)
    role = Column(String, nullable=False)
    operator_id = Column(UUID(as_uuid=True), ForeignKey("operators.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class Depot(Base):
    __tablename__ = "depots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    operator_id = Column(UUID(as_uuid=True), ForeignKey("operators.id", ondelete="CASCADE"), nullable=False)
    scenario = Column(String, nullable=False, default="DEMO")
    name = Column(String, nullable=False)
    address = Column(String, nullable=True)
    location = Column(Geography(geometry_type='POINT', srid=4326), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    operator = relationship("Operator")

class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    operator_id = Column(UUID(as_uuid=True), ForeignKey("operators.id", ondelete="CASCADE"), nullable=False)
    scenario = Column(String, nullable=False, default="DEMO")
    reference_number = Column(String, nullable=False)
    vehicle_type = Column(String, nullable=False)
    capacity_kg = Column(Numeric, nullable=False)
    status = Column(String, nullable=False, default="AVAILABLE")
    depot_id = Column(UUID(as_uuid=True), ForeignKey("depots.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    operator = relationship("Operator")
    depot = relationship("Depot")

class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    operator_id = Column(UUID(as_uuid=True), ForeignKey("operators.id", ondelete="CASCADE"), nullable=False)
    scenario = Column(String, nullable=False, default="DEMO")
    reference_number = Column(String, nullable=False)
    origin_depot_id = Column(UUID(as_uuid=True), ForeignKey("depots.id", ondelete="SET NULL"), nullable=True)
    destination_location = Column(Geography(geometry_type='POINT', srid=4326), nullable=False)
    weight_kg = Column(Numeric, nullable=False)
    status = Column(String, nullable=False, default="PENDING")
    pickup_window_start = Column(DateTime(timezone=True), nullable=True)
    pickup_window_end = Column(DateTime(timezone=True), nullable=True)
    delivery_window_start = Column(DateTime(timezone=True), nullable=True)
    delivery_window_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    operator = relationship("Operator")
    origin_depot = relationship("Depot")

class ReturnLoad(Base):
    __tablename__ = "return_loads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    operator_id = Column(UUID(as_uuid=True), ForeignKey("operators.id", ondelete="CASCADE"), nullable=False)
    scenario = Column(String, nullable=False, default="DEMO")
    reference_number = Column(String, nullable=False)
    pickup_location = Column(Geography(geometry_type='POINT', srid=4326), nullable=False)
    delivery_location = Column(Geography(geometry_type='POINT', srid=4326), nullable=False)
    weight_kg = Column(Numeric, nullable=False)
    status = Column(String, nullable=False, default="PENDING")
    pickup_window_start = Column(DateTime(timezone=True), nullable=True)
    pickup_window_end = Column(DateTime(timezone=True), nullable=True)
    delivery_window_start = Column(DateTime(timezone=True), nullable=True)
    delivery_window_end = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    operator = relationship("Operator")

class ReturnLoadAssignment(Base):
    __tablename__ = "return_load_assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), nullable=False)
    route_id = Column(UUID(as_uuid=True), nullable=False)
    vehicle_id = Column(UUID(as_uuid=True), nullable=False)
    return_load_id = Column(UUID(as_uuid=True), ForeignKey("return_loads.id", ondelete="CASCADE"), nullable=False)
    assignment_status = Column(String, nullable=False, default="ASSIGNED")
    incremental_detour_meters = Column(Numeric, nullable=False)
    incremental_duration_seconds = Column(Numeric, nullable=False)
    rejection_reason = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class OptimizationRun(Base):
    __tablename__ = "optimization_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    operator_id = Column(UUID(as_uuid=True), ForeignKey("operators.id", ondelete="SET NULL"), nullable=True)
    scenario = Column(String, nullable=False, default="DEMO")
    status = Column(String, nullable=False, default="PENDING")
    solver_status = Column(String, nullable=True)
    config_snapshot = Column(JSONB, nullable=False)
    diagnostics = Column(JSONB, nullable=False, server_default='[]')
    
    baseline_distance_meters = Column(Numeric, nullable=True)
    baseline_duration_seconds = Column(Numeric, nullable=True)
    baseline_vehicles_used = Column(Integer, nullable=True)
    
    optimized_distance_meters = Column(Numeric, nullable=True)
    optimized_duration_seconds = Column(Numeric, nullable=True)
    optimized_vehicles_used = Column(Integer, nullable=True)
    
    comparable_workload_count = Column(Integer, nullable=True)
    cost_saved_inr = Column(Numeric, nullable=True)
    co2_saved_kg = Column(Numeric, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class OptimizedRoute(Base):
    __tablename__ = "optimized_routes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), ForeignKey("optimization_runs.id", ondelete="CASCADE"), nullable=False)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.id", ondelete="RESTRICT"), nullable=False)
    total_distance_meters = Column(Numeric, nullable=False)
    total_duration_seconds = Column(Numeric, nullable=False)
    geometry = Column(Geography(geometry_type='LINESTRING', srid=4326), nullable=False)
    return_load_id = Column(UUID(as_uuid=True), nullable=True) # Intentionally no strict FK here to avoid cycles if return_loads isn't in models
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class OptimizedRouteStop(Base):
    __tablename__ = "optimized_route_stops"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    route_id = Column(UUID(as_uuid=True), ForeignKey("optimized_routes.id", ondelete="CASCADE"), nullable=False)
    sequence_index = Column(Integer, nullable=False)
    stop_type = Column(String, nullable=False)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    return_load_id = Column(UUID(as_uuid=True), nullable=True)
    location = Column(Geography(geometry_type='POINT', srid=4326), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class RoutingMatrixCache(Base):
    __tablename__ = "routing_matrix_cache"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider = Column(String, nullable=False)
    signature = Column(String, nullable=False, unique=True, index=True)
    distances = Column(JSONB, nullable=False)
    durations = Column(JSONB, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class RouteGeometryCache(Base):
    __tablename__ = "route_geometry_cache"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider = Column(String, nullable=False)
    signature = Column(String, nullable=False, unique=True, index=True)
    distance = Column(Numeric, nullable=False)
    duration = Column(Numeric, nullable=False)
    geometry = Column(JSONB, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
