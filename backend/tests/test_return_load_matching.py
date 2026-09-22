import pytest
import uuid
from typing import List, Dict
from app.services.optimization.return_loads.schemas import (
    ReturnLoadOpportunity,
    ReturnLoadCandidate,
    ReturnLoadCandidateStatus,
    ReturnLoadAssignment,
    ReturnLoadAssignmentStatus
)
from app.services.optimization.return_loads.generator import evaluate_return_load_candidates
from app.services.optimization.return_loads.assigner import assign_return_loads
from app.services.optimization.return_loads.reoptimizer import reoptimize_routes_with_return_loads
from app.services.optimization.solver.schemas import OptimizationResultRoute, OptimizationResult
from app.services.optimization.schemas import OptimizationInput, OptimizationVehicle, OptimizationDepot, OptimizationOrder, OptimizationObjectiveContext
from app.services.optimization.config import OptimizationConfig
from app.services.routing.schemas import Coordinate, MatrixRequest, MatrixResponse
from app.services.routing.routing_service import RoutingService

class MockOSRMClient:
    async def get_table(self, coords: List[Coordinate]):
        dist = 0
        if abs(coords[2].latitude - 10.0) < 0.1:
            # Proximity rejection: dists[0][2] > 5000
            # 0=final, 1=depot, 2=pickup, 3=delivery
            dists = [[0, 0, 6000, 0], [0, 0, 0, 0], [6000, 0, 0, 0], [0, 0, 0, 0]]
        elif abs(coords[2].latitude - 20.0) < 0.1:
            # Detour rejection: dist_new - dist_orig > 25000
            # dist_orig = dists[0][1] = 4000
            # dist_new = dists[0][2] (0) + dists[2][3] (30000) + dists[3][1] (0) = 30000
            dists = [[0, 4000, 0, 0], [4000, 0, 0, 0], [0, 0, 0, 30000], [0, 0, 0, 0]]
        else:
            dists = [[0, 3000, 3000, 1000], [0, 0, 0, 0], [0, 0, 0, 1000], [0, 1000, 0, 0]]
            
        return {"distances": dists, "durations": dists}

@pytest.mark.asyncio
async def test_generator_capacity_rejection():
    route = OptimizationResultRoute(
        route_id="r1", vehicle_id=uuid.uuid4(), ordered_node_ids=["DEPOT-1"], ordered_order_ids=[],
        total_distance_meters=0, total_duration_seconds=0, total_weight_kg=500, capacity_kg=1000, utilization_ratio=0.5, workload_unit_ids=[], parent_cluster_ids=[], route_status="FEASIBLE"
    )
    opp = ReturnLoadOpportunity(return_load_id=uuid.uuid4(), operator_id=uuid.uuid4(), pickup_latitude=0.0, pickup_longitude=0.0, delivery_latitude=0.0, delivery_longitude=0.0, weight_kg=1500)
    candidates = await evaluate_return_load_candidates(route, [opp], Coordinate(latitude=0, longitude=0), Coordinate(latitude=0, longitude=0), MockOSRMClient())
    assert len(candidates) == 1
    assert candidates[0].eligibility_status == ReturnLoadCandidateStatus.REJECTED_CAPACITY

@pytest.mark.asyncio
async def test_generator_proximity_rejection():
    route = OptimizationResultRoute(
        route_id="r1", vehicle_id=uuid.uuid4(), ordered_node_ids=["DEPOT-1"], ordered_order_ids=[],
        total_distance_meters=0, total_duration_seconds=0, total_weight_kg=0, capacity_kg=1000, utilization_ratio=0, workload_unit_ids=[], parent_cluster_ids=[], route_status="FEASIBLE"
    )
    opp = ReturnLoadOpportunity(return_load_id=uuid.uuid4(), operator_id=uuid.uuid4(), pickup_latitude=10.0, pickup_longitude=0.0, delivery_latitude=0.0, delivery_longitude=0.0, weight_kg=500)
    candidates = await evaluate_return_load_candidates(route, [opp], Coordinate(latitude=0, longitude=0), Coordinate(latitude=0, longitude=0), MockOSRMClient())
    assert len(candidates) == 1
    assert candidates[0].eligibility_status == ReturnLoadCandidateStatus.REJECTED_PROXIMITY

@pytest.mark.asyncio
async def test_generator_detour_rejection():
    route = OptimizationResultRoute(
        route_id="r1", vehicle_id=uuid.uuid4(), ordered_node_ids=["DEPOT-1"], ordered_order_ids=[],
        total_distance_meters=0, total_duration_seconds=0, total_weight_kg=0, capacity_kg=1000, utilization_ratio=0, workload_unit_ids=[], parent_cluster_ids=[], route_status="FEASIBLE"
    )
    opp = ReturnLoadOpportunity(return_load_id=uuid.uuid4(), operator_id=uuid.uuid4(), pickup_latitude=20.0, pickup_longitude=0.0, delivery_latitude=0.0, delivery_longitude=0.0, weight_kg=500)
    candidates = await evaluate_return_load_candidates(route, [opp], Coordinate(latitude=0, longitude=0), Coordinate(latitude=0, longitude=0), MockOSRMClient())
    assert len(candidates) == 1
    assert candidates[0].eligibility_status == ReturnLoadCandidateStatus.REJECTED_DETOUR

def test_assigner_cumulative_capacity():
    candidates = [
        ReturnLoadCandidate(return_load_id=uuid.uuid4(), route_id="r1", vehicle_id=uuid.uuid4(), operator_id=uuid.uuid4(), remaining_capacity_kg=1000, return_load_weight_kg=600, pickup_latitude=0, pickup_longitude=0, delivery_latitude=0, delivery_longitude=0, pickup_proximity_meters=1000, incremental_detour_meters=1000, incremental_duration_seconds=1000, eligibility_status=ReturnLoadCandidateStatus.ELIGIBLE),
        ReturnLoadCandidate(return_load_id=uuid.uuid4(), route_id="r1", vehicle_id=uuid.uuid4(), operator_id=uuid.uuid4(), remaining_capacity_kg=1000, return_load_weight_kg=500, pickup_latitude=0, pickup_longitude=0, delivery_latitude=0, delivery_longitude=0, pickup_proximity_meters=2000, incremental_detour_meters=2000, incremental_duration_seconds=2000, eligibility_status=ReturnLoadCandidateStatus.ELIGIBLE)
    ]
    assignments = assign_return_loads(candidates)
    assert len(assignments) == 1
    assert assignments[0].return_load_id == candidates[0].return_load_id
    assert assignments[0].remaining_capacity_after_kg == 400

def test_assigner_exclusive_assignment():
    rl_id = uuid.uuid4()
    candidates = [
        ReturnLoadCandidate(return_load_id=rl_id, route_id="r1", vehicle_id=uuid.uuid4(), operator_id=uuid.uuid4(), remaining_capacity_kg=1000, return_load_weight_kg=500, pickup_latitude=0, pickup_longitude=0, delivery_latitude=0, delivery_longitude=0, pickup_proximity_meters=1000, incremental_detour_meters=1000, incremental_duration_seconds=1000, eligibility_status=ReturnLoadCandidateStatus.ELIGIBLE),
        ReturnLoadCandidate(return_load_id=rl_id, route_id="r2", vehicle_id=uuid.uuid4(), operator_id=uuid.uuid4(), remaining_capacity_kg=1000, return_load_weight_kg=500, pickup_latitude=0, pickup_longitude=0, delivery_latitude=0, delivery_longitude=0, pickup_proximity_meters=2000, incremental_detour_meters=2000, incremental_duration_seconds=2000, eligibility_status=ReturnLoadCandidateStatus.ELIGIBLE)
    ]
    assignments = assign_return_loads(candidates)
    assert len(assignments) == 1
    assert assignments[0].route_id == "r1"

class MockRoutingServiceForReoptimizer:
    def __init__(self):
        self.mock_matrix = []
        self.should_fail = False

    async def get_matrix(self, request: MatrixRequest) -> MatrixResponse:
        if self.should_fail:
            return MatrixResponse(success=False, distances=[], durations=[], provider="mock")
        return MatrixResponse(
            success=True,
            distances=self.mock_matrix,
            durations=self.mock_matrix,
            provider="mock"
        )

@pytest.mark.asyncio
async def test_reoptimization_semantics():
    op_id = uuid.uuid4()
    depot_id = uuid.uuid4()
    v_id = uuid.uuid4()
    o1_id = uuid.uuid4()
    o2_id = uuid.uuid4()
    rl_id = uuid.uuid4()
    route_id = "test-route-1"
    
    # 0 = Depot, 1 = Order A, 2 = Order B, 3 = RL Pickup, 4 = RL Delivery
    # We want a sequence where Depot -> P -> A -> B -> D -> Depot is cheaper than Depot -> A -> B -> P -> D -> Depot
    mock_matrix = [
        [0, 1000, 1000, 10, 1000], # Depot
        [1000, 0, 10, 1000, 1000], # Order A
        [10, 1000, 0, 1000, 10],   # Order B
        [1000, 10, 1000, 0, 1000], # RL Pickup
        [10, 1000, 1000, 1000, 0]  # RL Delivery
    ]
    
    routing_service = MockRoutingServiceForReoptimizer()
    routing_service.mock_matrix = mock_matrix
    
    opt_input = OptimizationInput(
        scenario="test",
        operator_id=op_id,
        depots=[OptimizationDepot(id=depot_id, operator_id=op_id, name="Depot", latitude=0, longitude=0)],
        vehicles=[OptimizationVehicle(id=v_id, operator_id=op_id, reference_number="V1", vehicle_type="Van", capacity_kg=2000, status="AVAILABLE", depot_id=depot_id)],
        orders=[
            OptimizationOrder(id=o1_id, reference_number="A", operator_id=op_id, scenario="test", origin_depot_id=depot_id, destination_latitude=1, destination_longitude=1, weight_kg=100, status="PENDING"),
            OptimizationOrder(id=o2_id, reference_number="B", operator_id=op_id, scenario="test", origin_depot_id=depot_id, destination_latitude=2, destination_longitude=2, weight_kg=100, status="PENDING"),
        ]
    )
    
    opt_result = OptimizationResult(
        status="FEASIBLE",
        routes=[
            OptimizationResultRoute(
                route_id=route_id, vehicle_id=v_id, depot_id=depot_id,
                ordered_node_ids=[f"DEPOT-{depot_id}", f"ORDER-{o1_id}", f"ORDER-{o2_id}", f"DEPOT-{depot_id}"],
                ordered_order_ids=[o1_id, o2_id],
                total_distance_meters=1000, total_duration_seconds=1000, total_weight_kg=200, capacity_kg=2000, utilization_ratio=0.1, workload_unit_ids=[], parent_cluster_ids=[], route_status="FEASIBLE"
            )
        ]
    )
    
    opportunities = [ReturnLoadOpportunity(return_load_id=rl_id, operator_id=op_id, pickup_latitude=3, pickup_longitude=3, delivery_latitude=4, delivery_longitude=4, weight_kg=500)]
    assignments = [ReturnLoadAssignment(return_load_id=rl_id, route_id=route_id, vehicle_id=v_id, assignment_status=ReturnLoadAssignmentStatus.ASSIGNED, incremental_detour_meters=10, incremental_duration_seconds=10, remaining_capacity_after_kg=1300)]
    
    from app.services.optimization.config import resolve_optimization_config
    config = resolve_optimization_config("test")
    obj_ctx = OptimizationObjectiveContext(normalization_distance_reference_m=10000, normalization_duration_reference_s=10000)
    
    # 1. Reoptimization succeeds and changes sequence
    new_result = await reoptimize_routes_with_return_loads(opt_input, opt_result, opportunities, assignments, routing_service, config, obj_ctx)
    assert new_result.status == "FEASIBLE"
    assert new_result.routes[0].route_id == route_id
    # Sequence should be Depot -> P -> A -> B -> D -> Depot because of the matrix costs
    # Depot (0), P (3), A (1), B (2), D (4)
    # 0 -> 3 (10) -> 1 (10) -> 2 (10) -> 4 (10) -> 0 (10)
    seq = new_result.routes[0].ordered_node_ids
    print("Generated Sequence:", seq)
    assert len(seq) == 6
    assert seq[0] == f"DEPOT-{depot_id}"
    assert seq[-1] == f"DEPOT-{depot_id}"
    
    # 2. Cumulative capacity is enforced
    assert new_result.routes[0].total_weight_kg == 700 # 200 + 500
    
    # 3. Infeasible reoptimization rolls back to original result
    # We simulate routing failure (e.g., matrix fails or infeasible capacity)
    routing_service.should_fail = True
    new_result_failed = await reoptimize_routes_with_return_loads(opt_input, opt_result, opportunities, assignments, routing_service, config, obj_ctx)
    
    # Original route geometry remains intact after rollback
    seq_failed = new_result_failed.routes[0].ordered_node_ids
    assert len(seq_failed) == 4
    assert seq_failed == [f"DEPOT-{depot_id}", f"ORDER-{o1_id}", f"ORDER-{o2_id}", f"DEPOT-{depot_id}"]
    
    # Return load receives UNASSIGNED_REOPTIMIZATION_FAILED
    assert assignments[0].assignment_status == ReturnLoadAssignmentStatus.UNASSIGNED_REOPTIMIZATION_FAILED
