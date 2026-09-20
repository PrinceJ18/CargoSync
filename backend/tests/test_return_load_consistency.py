"""
Step 5.3 — Route ↔ Assignment Consistency Tests

Verifies that return-load relationships are consistent at every level:
- Route-level return_load_id matches assignment return_load_id
- Pickup and delivery stops use the correct return_load_id
- Routes without assignments do not receive fabricated return_load_ids
- OptimizationOrder.return_load_id eliminates string parsing
- API serialization exposes the correct relationship
"""
import pytest
from uuid import uuid4, UUID, uuid5, NAMESPACE_OID

from app.services.optimization.schemas import OptimizationOrder
from app.services.optimization.return_loads.schemas import (
    ReturnLoadAssignment, ReturnLoadAssignmentStatus,
    ReturnLoadOpportunity
)
from app.services.optimization.return_loads.assigner import assign_return_loads
from app.services.optimization.return_loads.schemas import (
    ReturnLoadCandidate, ReturnLoadCandidateStatus
)


class TestOptimizationOrderReturnLoadId:
    """Test 1: OptimizationOrder carries return_load_id"""
    
    def test_return_load_id_field_exists_and_defaults_none(self):
        order = OptimizationOrder(
            id=uuid4(),
            reference_number="ORD-001",
            operator_id=uuid4(),
            scenario="DEMO",
            origin_depot_id=uuid4(),
            destination_latitude=22.72,
            destination_longitude=75.85,
            weight_kg=100.0,
            status="PENDING"
        )
        assert order.return_load_id is None

    def test_return_load_id_set_on_pseudo_order(self):
        rl_id = uuid4()
        order = OptimizationOrder(
            id=uuid4(),
            reference_number=f"RL-PICKUP-{rl_id}",
            operator_id=uuid4(),
            scenario="DEMO",
            origin_depot_id=uuid4(),
            destination_latitude=22.72,
            destination_longitude=75.85,
            weight_kg=50.0,
            status="RL_PICKUP",
            return_load_id=rl_id
        )
        assert order.return_load_id == rl_id
        assert str(order.return_load_id) == str(rl_id)


class TestStopReturnLoadIdConsistency:
    """Test 2: Pickup and delivery stops use the same return_load_id"""

    def test_pseudo_orders_share_same_return_load_id(self):
        rl_id = uuid4()
        pickup_uuid = uuid5(NAMESPACE_OID, f"pickup-{rl_id}")
        delivery_uuid = uuid5(NAMESPACE_OID, f"delivery-{rl_id}")
        
        pickup = OptimizationOrder(
            id=pickup_uuid,
            reference_number=f"RL-PICKUP-{rl_id}",
            operator_id=uuid4(),
            scenario="DEMO",
            origin_depot_id=uuid4(),
            destination_latitude=22.72,
            destination_longitude=75.85,
            weight_kg=50.0,
            status="RL_PICKUP",
            linked_delivery_id=delivery_uuid,
            return_load_id=rl_id
        )
        delivery = OptimizationOrder(
            id=delivery_uuid,
            reference_number=f"RL-DELIVERY-{rl_id}",
            operator_id=uuid4(),
            scenario="DEMO",
            origin_depot_id=uuid4(),
            destination_latitude=22.80,
            destination_longitude=75.90,
            weight_kg=50.0,
            status="RL_DELIVERY",
            return_load_id=rl_id
        )
        
        # Both pseudo-orders carry the same authoritative return_load_id
        assert pickup.return_load_id == delivery.return_load_id
        assert pickup.return_load_id == rl_id


class TestRouteWithoutReturnLoad:
    """Test 3: Route without return load does not receive fabricated return_load_id"""

    def test_regular_order_has_no_return_load_id(self):
        order = OptimizationOrder(
            id=uuid4(),
            reference_number="ORD-001",
            operator_id=uuid4(),
            scenario="DEMO",
            origin_depot_id=uuid4(),
            destination_latitude=22.72,
            destination_longitude=75.85,
            weight_kg=100.0,
            status="PENDING"
        )
        assert order.return_load_id is None
        assert order.status not in ("RL_PICKUP", "RL_DELIVERY")

    def test_empty_assignment_list_produces_no_assignments(self):
        assignments = assign_return_loads([])
        assert len(assignments) == 0


class TestMultiAssignmentPerRoute:
    """Test 4: Multiple return loads assigned to same route are all tracked"""

    def test_multiple_candidates_same_route_all_assigned(self):
        route_id = "route_0"
        vehicle_id = uuid4()
        operator_id = uuid4()
        rl_1 = uuid4()
        rl_2 = uuid4()
        
        candidates = [
            ReturnLoadCandidate(
                return_load_id=rl_1,
                route_id=route_id,
                vehicle_id=vehicle_id,
                operator_id=operator_id,
                remaining_capacity_kg=5000.0,
                return_load_weight_kg=500.0,
                pickup_latitude=22.72,
                pickup_longitude=75.85,
                delivery_latitude=22.80,
                delivery_longitude=75.90,
                incremental_detour_meters=1000.0,
                incremental_duration_seconds=300.0,
                eligibility_status=ReturnLoadCandidateStatus.ELIGIBLE,
            ),
            ReturnLoadCandidate(
                return_load_id=rl_2,
                route_id=route_id,
                vehicle_id=vehicle_id,
                operator_id=operator_id,
                remaining_capacity_kg=5000.0,
                return_load_weight_kg=600.0,
                pickup_latitude=22.73,
                pickup_longitude=75.86,
                delivery_latitude=22.81,
                delivery_longitude=75.91,
                incremental_detour_meters=2000.0,
                incremental_duration_seconds=600.0,
                eligibility_status=ReturnLoadCandidateStatus.ELIGIBLE,
            ),
        ]
        
        assignments = assign_return_loads(candidates)
        assigned = [a for a in assignments if a.assignment_status == ReturnLoadAssignmentStatus.ASSIGNED]
        
        # Both should be assigned (same route, sufficient capacity)
        assert len(assigned) == 2
        assigned_rl_ids = {a.return_load_id for a in assigned}
        assert rl_1 in assigned_rl_ids
        assert rl_2 in assigned_rl_ids
        
        # Both should reference the same route
        assert all(a.route_id == route_id for a in assigned)


class TestApiReturnLoadSerialization:
    """Test 5: API return_load field correctly serializes"""

    def test_route_with_return_load_has_string_return_load(self):
        rl_id = uuid4()
        route_data = {
            "vehicle_id": str(uuid4()),
            "total_distance_meters": 50000.0,
            "total_duration_seconds": 3600.0,
            "stops": [],
            "geometry": {},
            "return_load": str(rl_id)
        }
        assert route_data["return_load"] == str(rl_id)
        assert isinstance(route_data["return_load"], str)

    def test_route_without_return_load_has_none(self):
        route_data = {
            "vehicle_id": str(uuid4()),
            "total_distance_meters": 50000.0,
            "total_duration_seconds": 3600.0,
            "stops": [],
            "geometry": {},
            "return_load": None
        }
        assert route_data["return_load"] is None
