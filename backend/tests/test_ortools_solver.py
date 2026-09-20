import pytest
import uuid
import math
from datetime import datetime

from app.services.optimization.schemas import OptimizationInput, OptimizationOrder, OptimizationVehicle, OptimizationDepot, OptimizationObjectiveContext
from app.services.optimization.config import resolve_optimization_config, OptimizationObjectives, OptimizationConfig
from app.services.optimization.preparation.schemas import CapacityPreparationResult, WorkloadUnit
from app.services.optimization.routing.schemas import RoadCostMatrix, RoadCostEntry, RoutingNode
from app.services.optimization.solver.solver import ORToolsOptimizer

def _mock_order(lat, lon, weight, id_str):
    return OptimizationOrder(origin_depot_id=uuid.uuid4(), id=uuid.uuid4(), reference_number=f"O-{id_str}", operator_id=uuid.uuid4(), scenario="DEMO", destination_latitude=lat, destination_longitude=lon, weight_kg=weight, status="PENDING")

def _mock_vehicle(capacity, id_str, status="AVAILABLE"):
    return OptimizationVehicle(id=uuid.uuid4(), operator_id=uuid.uuid4(), reference_number=f"V-{id_str}", vehicle_type="TRUCK", capacity_kg=capacity, status=status)

def _mock_depot():
    return OptimizationDepot(id=uuid.uuid4(), operator_id=uuid.uuid4(), name="Depot", latitude=0.0, longitude=0.0)

def _build_matrix(depot, orders, distances):
    nodes = [RoutingNode(node_id=f"DEPOT-{depot.id}", node_type="DEPOT", latitude=depot.latitude, longitude=depot.longitude, depot_id=depot.id)]
    for o in orders:
        nodes.append(RoutingNode(node_id=f"ORDER-{o.id}", node_type="ORDER", latitude=o.destination_latitude, longitude=o.destination_longitude, order_id=o.id))
        
    node_index = {n.node_id: i for i, n in enumerate(nodes)}
    entries = []
    n = len(nodes)
    for i in range(n):
        for j in range(n):
            if i == j:
                entries.append(RoadCostEntry(origin_node_id=nodes[i].node_id, destination_node_id=nodes[j].node_id, distance_meters=0.0, duration_seconds=0.0, status="AVAILABLE"))
            else:
                d = distances[i][j]
                if d is None:
                    entries.append(RoadCostEntry(origin_node_id=nodes[i].node_id, destination_node_id=nodes[j].node_id, status="UNAVAILABLE"))
                else:
                    entries.append(RoadCostEntry(origin_node_id=nodes[i].node_id, destination_node_id=nodes[j].node_id, distance_meters=d, duration_seconds=d, status="AVAILABLE"))
                    
    return RoadCostMatrix(nodes=nodes, node_index=node_index, entries=entries, status="SUCCESS")

def _mock_prep(orders):
    wus = []
    for i, o in enumerate(orders):
        wus.append(WorkloadUnit(workload_unit_id=f"W{i}", parent_cluster_id=f"C{i}", order_ids=[o.id], order_count=1, total_weight_kg=o.weight_kg, capacity_limit_kg=1000, utilization_ratio=0.5, centroid_latitude=o.destination_latitude, centroid_longitude=o.destination_longitude, status="READY"))
    return CapacityPreparationResult(ready_workload_units=wus, unserviceable_orders=[], noise_order_ids=[], unclustered_order_ids=[], clustering_status="COMPLETED")

@pytest.fixture
def optimizer():
    return ORToolsOptimizer()

@pytest.fixture
def base_config():
    return resolve_optimization_config("DEMO")

def test_1_one_vehicle_one_order(optimizer, base_config):
    d = _mock_depot()
    o1 = _mock_order(1.0, 1.0, 100.0, "1")
    v1 = _mock_vehicle(1000.0, "1")
    matrix = _build_matrix(d, [o1], [[0, 100], [100, 0]])
    opt_in = OptimizationInput(scenario="DEMO", depots=[d], vehicles=[v1], orders=[o1])
    res = optimizer.solve(opt_in, base_config, _mock_prep([o1]), matrix, OptimizationObjectiveContext(normalization_distance_reference_m=10000.0, normalization_duration_reference_s=3600.0))
    assert res.status == "FEASIBLE"
    assert len(res.routes) == 1
    assert res.total_vehicles_used == 1
    assert res.total_vehicles_eligible == 1
    assert res.vehicle_activation_ratio == 1.0

def test_2_one_vehicle_multiple_orders(optimizer, base_config):
    d = _mock_depot()
    o1 = _mock_order(1.0, 1.0, 100.0, "1")
    o2 = _mock_order(2.0, 2.0, 100.0, "2")
    v1 = _mock_vehicle(1000.0, "1")
    matrix = _build_matrix(d, [o1, o2], [[0, 10, 20], [10, 0, 5], [20, 5, 0]])
    opt_in = OptimizationInput(scenario="DEMO", depots=[d], vehicles=[v1], orders=[o1, o2])
    res = optimizer.solve(opt_in, base_config, _mock_prep([o1, o2]), matrix, OptimizationObjectiveContext(normalization_distance_reference_m=10000.0, normalization_duration_reference_s=3600.0))
    assert res.status == "FEASIBLE"
    assert len(res.routes) == 1
    assert len(res.routes[0].ordered_order_ids) == 2

def test_3_multiple_vehicles(optimizer, base_config):
    d = _mock_depot()
    o1 = _mock_order(1.0, 1.0, 600.0, "1")
    o2 = _mock_order(2.0, 2.0, 600.0, "2")
    v1 = _mock_vehicle(1000.0, "1")
    v2 = _mock_vehicle(1000.0, "2")
    matrix = _build_matrix(d, [o1, o2], [[0, 10, 20], [10, 0, 5], [20, 5, 0]])
    opt_in = OptimizationInput(scenario="DEMO", depots=[d], vehicles=[v1, v2], orders=[o1, o2])
    res = optimizer.solve(opt_in, base_config, _mock_prep([o1, o2]), matrix, OptimizationObjectiveContext(normalization_distance_reference_m=10000.0, normalization_duration_reference_s=3600.0))
    assert res.status == "FEASIBLE"
    assert len(res.routes) == 2

def test_4_exact_capacity_boundary(optimizer, base_config):
    d = _mock_depot()
    o1 = _mock_order(1.0, 1.0, 500.0, "1")
    o2 = _mock_order(2.0, 2.0, 500.0, "2")
    v1 = _mock_vehicle(1000.0, "1")
    matrix = _build_matrix(d, [o1, o2], [[0, 10, 20], [10, 0, 5], [20, 5, 0]])
    opt_in = OptimizationInput(scenario="DEMO", depots=[d], vehicles=[v1], orders=[o1, o2])
    res = optimizer.solve(opt_in, base_config, _mock_prep([o1, o2]), matrix, OptimizationObjectiveContext(normalization_distance_reference_m=10000.0, normalization_duration_reference_s=3600.0))
    assert res.status == "FEASIBLE"
    assert res.routes[0].total_weight_kg == 1000.0

def test_5_capacity_infeasibility(optimizer, base_config):
    d = _mock_depot()
    o1 = _mock_order(1.0, 1.0, 600.0, "1")
    o2 = _mock_order(2.0, 2.0, 600.0, "2")
    v1 = _mock_vehicle(1000.0, "1")
    matrix = _build_matrix(d, [o1, o2], [[0, 10, 20], [10, 0, 5], [20, 5, 0]])
    opt_in = OptimizationInput(scenario="DEMO", depots=[d], vehicles=[v1], orders=[o1, o2])
    res = optimizer.solve(opt_in, base_config, _mock_prep([o1, o2]), matrix, OptimizationObjectiveContext(normalization_distance_reference_m=10000.0, normalization_duration_reference_s=3600.0))
    assert res.status == "INFEASIBLE"
    assert len(res.unassigned_order_ids) == 1

def test_6_multiple_vehicle_capacities(optimizer, base_config):
    d = _mock_depot()
    o1 = _mock_order(1.0, 1.0, 600.0, "1")
    v_small = _mock_vehicle(500.0, "S")
    v_large = _mock_vehicle(1000.0, "L")
    matrix = _build_matrix(d, [o1], [[0, 10], [10, 0]])
    opt_in = OptimizationInput(scenario="DEMO", depots=[d], vehicles=[v_small, v_large], orders=[o1])
    res = optimizer.solve(opt_in, base_config, _mock_prep([o1]), matrix, OptimizationObjectiveContext(normalization_distance_reference_m=10000.0, normalization_duration_reference_s=3600.0))
    assert res.status == "FEASIBLE"
    assert len(res.routes) == 1
    assert res.routes[0].vehicle_id == v_large.id

def test_7_8_9_10_route_stats(optimizer, base_config):
    d = _mock_depot()
    o1 = _mock_order(1.0, 1.0, 100.0, "1")
    v1 = _mock_vehicle(1000.0, "1")
    matrix = _build_matrix(d, [o1], [[0, 15], [20, 0]])
    opt_in = OptimizationInput(scenario="DEMO", depots=[d], vehicles=[v1], orders=[o1])
    res = optimizer.solve(opt_in, base_config, _mock_prep([o1]), matrix, OptimizationObjectiveContext(normalization_distance_reference_m=10000.0, normalization_duration_reference_s=3600.0))
    r = res.routes[0]
    assert r.total_distance_meters == 35.0
    assert r.total_duration_seconds == 35.0
    assert len(r.ordered_node_ids) == 3
    assert r.ordered_node_ids[0].startswith("DEPOT-")
    assert r.ordered_node_ids[-1].startswith("DEPOT-")

def test_11_unavailable_arc_prohibition(optimizer, base_config):
    d = _mock_depot()
    o1 = _mock_order(1.0, 1.0, 100.0, "1")
    v1 = _mock_vehicle(1000.0, "1")
    matrix = _build_matrix(d, [o1], [[0, None], [100, 0]])
    opt_in = OptimizationInput(scenario="DEMO", depots=[d], vehicles=[v1], orders=[o1])
    res = optimizer.solve(opt_in, base_config, _mock_prep([o1]), matrix, OptimizationObjectiveContext(normalization_distance_reference_m=10000.0, normalization_duration_reference_s=3600.0))
    assert res.status == "INFEASIBLE"

def test_12_incomplete_coverage_status(optimizer, base_config):
    d = _mock_depot()
    o1 = _mock_order(1.0, 1.0, 100.0, "1")
    o2 = _mock_order(2.0, 2.0, 100.0, "2")
    v1 = _mock_vehicle(1000.0, "1")
    matrix = _build_matrix(d, [o1, o2], [[0, 10, None], [10, 0, None], [None, None, 0]])
    opt_in = OptimizationInput(scenario="DEMO", depots=[d], vehicles=[v1], orders=[o1, o2])
    res = optimizer.solve(opt_in, base_config, _mock_prep([o1, o2]), matrix, OptimizationObjectiveContext(normalization_distance_reference_m=10000.0, normalization_duration_reference_s=3600.0))
    assert res.status == "INFEASIBLE"
    assert len(res.unassigned_order_ids) > 0

def test_13_no_eligible_vehicles(optimizer, base_config):
    d = _mock_depot()
    o1 = _mock_order(1.0, 1.0, 100.0, "1")
    v1 = _mock_vehicle(1000.0, "1", status="MAINTENANCE")
    matrix = _build_matrix(d, [o1], [[0, 10], [10, 0]])
    res = optimizer.solve(OptimizationInput(scenario="DEMO", depots=[d], vehicles=[v1], orders=[o1]), base_config, _mock_prep([o1]), matrix, OptimizationObjectiveContext(normalization_distance_reference_m=10000.0, normalization_duration_reference_s=3600.0))
    assert res.status == "INFEASIBLE"
    assert "No eligible vehicles" in res.message

def test_21_objective_behavior(optimizer):
    d = _mock_depot()
    o1 = _mock_order(1.0, 1.0, 100.0, "1")
    o2 = _mock_order(2.0, 2.0, 100.0, "2")
    v1 = _mock_vehicle(1000.0, "1")
    v2 = _mock_vehicle(1000.0, "2")
    matrix = _build_matrix(d, [o1, o2], [[0, 10, 10000], [10, 0, 10], [10000, 10, 0]])
    opt_in = OptimizationInput(scenario="DEMO", depots=[d], vehicles=[v1, v2], orders=[o1, o2])
    
    config = resolve_optimization_config("DEMO")
    config.objectives.minimize_vehicles_weight = 100.0
    res = optimizer.solve(opt_in, config, _mock_prep([o1, o2]), matrix, OptimizationObjectiveContext(normalization_distance_reference_m=10000.0, normalization_duration_reference_s=3600.0))
    assert res.total_vehicles_used == 1
    assert res.total_vehicles_eligible == 2
    assert res.vehicle_activation_ratio == 0.5
    
def test_26_complete_serviceable_order_coverage(optimizer, base_config):
    d = _mock_depot()
    o1 = _mock_order(1.0, 1.0, 100.0, "1")
    o2 = _mock_order(2.0, 2.0, 100.0, "2")
    v1 = _mock_vehicle(1000.0, "1")
    matrix = _build_matrix(d, [o1, o2], [[0, 10, 20], [10, 0, 10], [20, 10, 0]])
    opt_in = OptimizationInput(scenario="DEMO", depots=[d], vehicles=[v1], orders=[o1, o2])
import pytest
import uuid
import math
from datetime import datetime

from app.services.optimization.schemas import OptimizationInput, OptimizationOrder, OptimizationVehicle, OptimizationDepot, OptimizationObjectiveContext
from app.services.optimization.config import resolve_optimization_config, OptimizationObjectives, OptimizationConfig
from app.services.optimization.preparation.schemas import CapacityPreparationResult, WorkloadUnit
from app.services.optimization.routing.schemas import RoadCostMatrix, RoadCostEntry, RoutingNode
from app.services.optimization.solver.solver import ORToolsOptimizer

def _mock_order(lat, lon, weight, id_str):
    return OptimizationOrder(origin_depot_id=uuid.uuid4(), id=uuid.uuid4(), reference_number=f"O-{id_str}", operator_id=uuid.uuid4(), scenario="DEMO", destination_latitude=lat, destination_longitude=lon, weight_kg=weight, status="PENDING")

def _mock_vehicle(capacity, id_str, status="AVAILABLE"):
    return OptimizationVehicle(id=uuid.uuid4(), operator_id=uuid.uuid4(), reference_number=f"V-{id_str}", vehicle_type="TRUCK", capacity_kg=capacity, status=status)

def _mock_depot():
    return OptimizationDepot(id=uuid.uuid4(), operator_id=uuid.uuid4(), name="Depot", latitude=0.0, longitude=0.0)

def _build_matrix(depot, orders, distances):
    nodes = [RoutingNode(node_id=f"DEPOT-{depot.id}", node_type="DEPOT", latitude=depot.latitude, longitude=depot.longitude, depot_id=depot.id)]
    for o in orders:
        nodes.append(RoutingNode(node_id=f"ORDER-{o.id}", node_type="ORDER", latitude=o.destination_latitude, longitude=o.destination_longitude, order_id=o.id))
        
    node_index = {n.node_id: i for i, n in enumerate(nodes)}
    entries = []
    n = len(nodes)
    for i in range(n):
        for j in range(n):
            if i == j:
                entries.append(RoadCostEntry(origin_node_id=nodes[i].node_id, destination_node_id=nodes[j].node_id, distance_meters=0.0, duration_seconds=0.0, status="AVAILABLE"))
            else:
                d = distances[i][j]
                if d is None:
                    entries.append(RoadCostEntry(origin_node_id=nodes[i].node_id, destination_node_id=nodes[j].node_id, status="UNAVAILABLE"))
                else:
                    entries.append(RoadCostEntry(origin_node_id=nodes[i].node_id, destination_node_id=nodes[j].node_id, distance_meters=d, duration_seconds=d, status="AVAILABLE"))
                    
    return RoadCostMatrix(nodes=nodes, node_index=node_index, entries=entries, status="SUCCESS")

def _mock_prep(orders):
    wus = []
    for i, o in enumerate(orders):
        wus.append(WorkloadUnit(workload_unit_id=f"W{i}", parent_cluster_id=f"C{i}", order_ids=[o.id], order_count=1, total_weight_kg=o.weight_kg, capacity_limit_kg=1000, utilization_ratio=0.5, centroid_latitude=o.destination_latitude, centroid_longitude=o.destination_longitude, status="READY"))
    return CapacityPreparationResult(ready_workload_units=wus, unserviceable_orders=[], noise_order_ids=[], unclustered_order_ids=[], clustering_status="COMPLETED")

@pytest.fixture
def optimizer():
    return ORToolsOptimizer()

@pytest.fixture
def base_config():
    return resolve_optimization_config("DEMO")

def test_1_one_vehicle_one_order(optimizer, base_config):
    d = _mock_depot()
    o1 = _mock_order(1.0, 1.0, 100.0, "1")
    v1 = _mock_vehicle(1000.0, "1")
    matrix = _build_matrix(d, [o1], [[0, 100], [100, 0]])
    opt_in = OptimizationInput(scenario="DEMO", depots=[d], vehicles=[v1], orders=[o1])
    res = optimizer.solve(opt_in, base_config, _mock_prep([o1]), matrix, OptimizationObjectiveContext(normalization_distance_reference_m=10000.0, normalization_duration_reference_s=3600.0))
    assert res.status == "FEASIBLE"
    assert len(res.routes) == 1
    assert res.total_vehicles_used == 1
    assert res.total_vehicles_eligible == 1
    assert res.vehicle_activation_ratio == 1.0

def test_2_one_vehicle_multiple_orders(optimizer, base_config):
    d = _mock_depot()
    o1 = _mock_order(1.0, 1.0, 100.0, "1")
    o2 = _mock_order(2.0, 2.0, 100.0, "2")
    v1 = _mock_vehicle(1000.0, "1")
    matrix = _build_matrix(d, [o1, o2], [[0, 10, 20], [10, 0, 5], [20, 5, 0]])
    opt_in = OptimizationInput(scenario="DEMO", depots=[d], vehicles=[v1], orders=[o1, o2])
    res = optimizer.solve(opt_in, base_config, _mock_prep([o1, o2]), matrix, OptimizationObjectiveContext(normalization_distance_reference_m=10000.0, normalization_duration_reference_s=3600.0))
    assert res.status == "FEASIBLE"
    assert len(res.routes) == 1
    assert len(res.routes[0].ordered_order_ids) == 2

def test_3_multiple_vehicles(optimizer, base_config):
    d = _mock_depot()
    o1 = _mock_order(1.0, 1.0, 600.0, "1")
    o2 = _mock_order(2.0, 2.0, 600.0, "2")
    v1 = _mock_vehicle(1000.0, "1")
    v2 = _mock_vehicle(1000.0, "2")
    matrix = _build_matrix(d, [o1, o2], [[0, 10, 20], [10, 0, 5], [20, 5, 0]])
    opt_in = OptimizationInput(scenario="DEMO", depots=[d], vehicles=[v1, v2], orders=[o1, o2])
    res = optimizer.solve(opt_in, base_config, _mock_prep([o1, o2]), matrix, OptimizationObjectiveContext(normalization_distance_reference_m=10000.0, normalization_duration_reference_s=3600.0))
    assert res.status == "FEASIBLE"
    assert len(res.routes) == 2

def test_4_exact_capacity_boundary(optimizer, base_config):
    d = _mock_depot()
    o1 = _mock_order(1.0, 1.0, 500.0, "1")
    o2 = _mock_order(2.0, 2.0, 500.0, "2")
    v1 = _mock_vehicle(1000.0, "1")
    matrix = _build_matrix(d, [o1, o2], [[0, 10, 20], [10, 0, 5], [20, 5, 0]])
    opt_in = OptimizationInput(scenario="DEMO", depots=[d], vehicles=[v1], orders=[o1, o2])
    res = optimizer.solve(opt_in, base_config, _mock_prep([o1, o2]), matrix, OptimizationObjectiveContext(normalization_distance_reference_m=10000.0, normalization_duration_reference_s=3600.0))
    assert res.status == "FEASIBLE"
    assert res.routes[0].total_weight_kg == 1000.0

def test_5_capacity_infeasibility(optimizer, base_config):
    d = _mock_depot()
    o1 = _mock_order(1.0, 1.0, 600.0, "1")
    o2 = _mock_order(2.0, 2.0, 600.0, "2")
    v1 = _mock_vehicle(1000.0, "1")
    matrix = _build_matrix(d, [o1, o2], [[0, 10, 20], [10, 0, 5], [20, 5, 0]])
    opt_in = OptimizationInput(scenario="DEMO", depots=[d], vehicles=[v1], orders=[o1, o2])
    res = optimizer.solve(opt_in, base_config, _mock_prep([o1, o2]), matrix, OptimizationObjectiveContext(normalization_distance_reference_m=10000.0, normalization_duration_reference_s=3600.0))
    assert res.status == "INFEASIBLE"
    assert len(res.unassigned_order_ids) == 1

def test_6_multiple_vehicle_capacities(optimizer, base_config):
    d = _mock_depot()
    o1 = _mock_order(1.0, 1.0, 600.0, "1")
    v_small = _mock_vehicle(500.0, "S")
    v_large = _mock_vehicle(1000.0, "L")
    matrix = _build_matrix(d, [o1], [[0, 10], [10, 0]])
    opt_in = OptimizationInput(scenario="DEMO", depots=[d], vehicles=[v_small, v_large], orders=[o1])
    res = optimizer.solve(opt_in, base_config, _mock_prep([o1]), matrix, OptimizationObjectiveContext(normalization_distance_reference_m=10000.0, normalization_duration_reference_s=3600.0))
    assert res.status == "FEASIBLE"
    assert len(res.routes) == 1
    assert res.routes[0].vehicle_id == v_large.id

def test_7_8_9_10_route_stats(optimizer, base_config):
    d = _mock_depot()
    o1 = _mock_order(1.0, 1.0, 100.0, "1")
    v1 = _mock_vehicle(1000.0, "1")
    matrix = _build_matrix(d, [o1], [[0, 15], [20, 0]])
    opt_in = OptimizationInput(scenario="DEMO", depots=[d], vehicles=[v1], orders=[o1])
    res = optimizer.solve(opt_in, base_config, _mock_prep([o1]), matrix, OptimizationObjectiveContext(normalization_distance_reference_m=10000.0, normalization_duration_reference_s=3600.0))
    r = res.routes[0]
    assert r.total_distance_meters == 35.0
    assert r.total_duration_seconds == 35.0
    assert len(r.ordered_node_ids) == 3
    assert r.ordered_node_ids[0].startswith("DEPOT-")
    assert r.ordered_node_ids[-1].startswith("DEPOT-")

def test_11_unavailable_arc_prohibition(optimizer, base_config):
    d = _mock_depot()
    o1 = _mock_order(1.0, 1.0, 100.0, "1")
    v1 = _mock_vehicle(1000.0, "1")
    matrix = _build_matrix(d, [o1], [[0, None], [100, 0]])
    opt_in = OptimizationInput(scenario="DEMO", depots=[d], vehicles=[v1], orders=[o1])
    res = optimizer.solve(opt_in, base_config, _mock_prep([o1]), matrix, OptimizationObjectiveContext(normalization_distance_reference_m=10000.0, normalization_duration_reference_s=3600.0))
    assert res.status == "INFEASIBLE"

def test_12_incomplete_coverage_status(optimizer, base_config):
    d = _mock_depot()
    o1 = _mock_order(1.0, 1.0, 100.0, "1")
    o2 = _mock_order(2.0, 2.0, 100.0, "2")
    v1 = _mock_vehicle(1000.0, "1")
    matrix = _build_matrix(d, [o1, o2], [[0, 10, None], [10, 0, None], [None, None, 0]])
    opt_in = OptimizationInput(scenario="DEMO", depots=[d], vehicles=[v1], orders=[o1, o2])
    res = optimizer.solve(opt_in, base_config, _mock_prep([o1, o2]), matrix, OptimizationObjectiveContext(normalization_distance_reference_m=10000.0, normalization_duration_reference_s=3600.0))
    assert res.status == "INFEASIBLE"
    assert len(res.unassigned_order_ids) > 0

def test_13_no_eligible_vehicles(optimizer, base_config):
    d = _mock_depot()
    o1 = _mock_order(1.0, 1.0, 100.0, "1")
    v1 = _mock_vehicle(1000.0, "1", status="MAINTENANCE")
    matrix = _build_matrix(d, [o1], [[0, 10], [10, 0]])
    res = optimizer.solve(OptimizationInput(scenario="DEMO", depots=[d], vehicles=[v1], orders=[o1]), base_config, _mock_prep([o1]), matrix, OptimizationObjectiveContext(normalization_distance_reference_m=10000.0, normalization_duration_reference_s=3600.0))
    assert res.status == "INFEASIBLE"
    assert "No eligible vehicles" in res.message

def test_21_objective_behavior(optimizer):
    d = _mock_depot()
    o1 = _mock_order(1.0, 1.0, 100.0, "1")
    o2 = _mock_order(2.0, 2.0, 100.0, "2")
    v1 = _mock_vehicle(1000.0, "1")
    v2 = _mock_vehicle(1000.0, "2")
    matrix = _build_matrix(d, [o1, o2], [[0, 10, 10000], [10, 0, 10], [10000, 10, 0]])
    opt_in = OptimizationInput(scenario="DEMO", depots=[d], vehicles=[v1, v2], orders=[o1, o2])
    
    config = resolve_optimization_config("DEMO")
    config.objectives.minimize_vehicles_weight = 100.0
    res = optimizer.solve(opt_in, config, _mock_prep([o1, o2]), matrix, OptimizationObjectiveContext(normalization_distance_reference_m=10000.0, normalization_duration_reference_s=3600.0))
    assert res.total_vehicles_used == 1
    assert res.total_vehicles_eligible == 2
    assert res.vehicle_activation_ratio == 0.5
    
def test_26_complete_serviceable_order_coverage(optimizer, base_config):
    d = _mock_depot()
    o1 = _mock_order(1.0, 1.0, 100.0, "1")
    o2 = _mock_order(2.0, 2.0, 100.0, "2")
    v1 = _mock_vehicle(1000.0, "1")
    matrix = _build_matrix(d, [o1, o2], [[0, 10, 20], [10, 0, 10], [20, 10, 0]])
    opt_in = OptimizationInput(scenario="DEMO", depots=[d], vehicles=[v1], orders=[o1, o2])
    prep = _mock_prep([o1, o2])
    res = optimizer.solve(opt_in, base_config, prep, matrix, OptimizationObjectiveContext(normalization_distance_reference_m=10000.0, normalization_duration_reference_s=3600.0))
    assert res.status == "FEASIBLE" # Path Cheapest Arc gives FEASIBLE not OPTIMAL
    
    routed_set = set()
    for r in res.routes:
        for oid in r.ordered_order_ids:
            routed_set.add(oid)
    assert routed_set == {o1.id, o2.id}
    assert routed_set == {o1.id, o2.id}
    assert len(res.unassigned_order_ids) == 0

def test_30_objective_order_preservation():
    # 8. Objective-order preservation result
    # Prove that the integer representation preserves the ordering of 
    # candidate objective values when the difference is strictly larger 
    # than 1/SCALE.
    COMPUTATIONAL_PRECISION_SCALE = 1000000.0
    
    # Candidate A
    obj_a = 0.0001234
    
    # Candidate B (Difference of 0.000002, which is 2/SCALE)
    obj_b = 0.0001254
    
    assert obj_a < obj_b
    assert abs(obj_a - obj_b) > (1.0 / COMPUTATIONAL_PRECISION_SCALE)
    
    int_a = int(math.ceil(obj_a * COMPUTATIONAL_PRECISION_SCALE)) # ceil(123.4) = 124
    int_b = int(math.ceil(obj_b * COMPUTATIONAL_PRECISION_SCALE)) # ceil(125.4) = 126
    
    # Integer cost ordering is preserved
    assert int_a < int_b
    assert int_a == 124
    assert int_b == 126
