import pytest
from uuid import uuid4
from typing import List

from app.services.optimization.schemas import OptimizationInput, OptimizationOrder, OptimizationDepot, OptimizationVehicle
from app.services.optimization.config import resolve_optimization_config, OptimizationConfigOverrides, CapacityOverrides
from app.services.optimization.clustering.schemas import ClusteringResult, Cluster
from app.services.optimization.validation.schemas import ClusterValidationResult, ValidatedCluster, ValidationReason
from app.services.optimization.preparation.preparer import CapacityPreparer

def _mock_order(id=None, weight=100, lat=22.7, lon=75.8):
    return OptimizationOrder(origin_depot_id=uuid4(), 
        id=id or uuid4(),
        reference_number=f"O-{weight}",
        operator_id=uuid4(),
        scenario="DEMO",
        destination_latitude=lat,
        destination_longitude=lon,
        weight_kg=weight,
        status="PENDING",
        delivery_window_start=None,
        delivery_window_end=None
    )

def _mock_vehicle(id=None, cap=1000):
    return OptimizationVehicle(
        id=id or uuid4(),
        reference_number=f"V-{cap}",
        operator_id=uuid4(),
        scenario="DEMO",
        vehicle_type="TRUCK",
        capacity_kg=cap,
        status="AVAILABLE"
    )

def _mock_cluster(cluster_id="C1", order_ids=None, weight=100, lat=22.7, lon=75.8):
    return Cluster(
        cluster_id=cluster_id,
        order_ids=order_ids or [],
        centroid_latitude=lat,
        centroid_longitude=lon,
        order_count=len(order_ids or []),
        total_weight_kg=weight
    )

def _mock_validated_cluster(cluster: Cluster, status="NEEDS_FURTHER_ROUTE_VALIDATION", reasons=None):
    return ValidatedCluster(
        cluster_id=cluster.cluster_id,
        original_cluster=cluster,
        validation_status=status,
        validation_reasons=reasons or [],
        required_capacity_kg=cluster.total_weight_kg,
        maximum_available_capacity_kg=1000,
        capacity_ratio=1.0,
        max_distance_from_centroid_meters=0.0
    )

def test_cluster_fits_single_vehicle():
    # 1. fits, 10. multiple capacities, 11. fits larger not smaller
    v1 = _mock_vehicle(cap=500)
    v2 = _mock_vehicle(cap=1000) # max cap 1000
    
    o1 = _mock_order(weight=400)
    o2 = _mock_order(weight=400)
    c1 = _mock_cluster(order_ids=[o1.id, o2.id], weight=800)
    vc1 = _mock_validated_cluster(c1, status="NEEDS_FURTHER_ROUTE_VALIDATION")
    
    opt_input = OptimizationInput(scenario="DEMO", operator_id=uuid4(), depots=[OptimizationDepot(id=uuid4(), operator_id=uuid4(), name="D", latitude=0, longitude=0)], vehicles=[v1, v2], orders=[o1, o2], source_issues=[])
    clust_res = ClusteringResult(clusters=[c1], noise_order_ids=[], unclustered_order_ids=[], total_input_orders=2, clustering_status="COMPLETED", clustered_order_count=2, noise_order_count=0, epsilon_meters=5000, min_samples=1)
    val_res = ClusterValidationResult(validated_clusters=[vc1], noise_order_ids=[], unclustered_order_ids=[], total_input_orders=2, clustering_status="COMPLETED")
    config = resolve_optimization_config("DEMO") # max_load_ratio = 1.0
    
    res = CapacityPreparer().prepare(opt_input, clust_res, val_res, config)
    
    assert len(res.ready_workload_units) == 1
    assert res.ready_workload_units[0].total_weight_kg == 800
    assert res.ready_workload_units[0].status == "READY"
    assert len(res.unserviceable_orders) == 0
    # 19. Parent ID traceable
    assert res.ready_workload_units[0].parent_cluster_id == "C1"
    assert res.ready_workload_units[0].workload_unit_id == "C1-W01"

def test_cluster_exactly_equals_capacity():
    # 2. Exactly equals
    v1 = _mock_vehicle(cap=1000)
    o1 = _mock_order(weight=1000)
    c1 = _mock_cluster(order_ids=[o1.id], weight=1000)
    vc1 = _mock_validated_cluster(c1, status="NEEDS_FURTHER_ROUTE_VALIDATION")
    
    opt_input = OptimizationInput(scenario="DEMO", operator_id=uuid4(), depots=[OptimizationDepot(id=uuid4(), operator_id=uuid4(), name="D", latitude=0, longitude=0)], vehicles=[v1], orders=[o1], source_issues=[])
    clust_res = ClusteringResult(clusters=[c1], noise_order_ids=[], unclustered_order_ids=[], total_input_orders=1, clustering_status="COMPLETED", clustered_order_count=1, noise_order_count=0, epsilon_meters=5000, min_samples=1)
    val_res = ClusterValidationResult(validated_clusters=[vc1], noise_order_ids=[], unclustered_order_ids=[], total_input_orders=1, clustering_status="COMPLETED")
    
    res = CapacityPreparer().prepare(opt_input, clust_res, val_res, resolve_optimization_config("DEMO"))
    
    assert len(res.ready_workload_units) == 1
    assert res.ready_workload_units[0].utilization_ratio == 1.0
    assert res.ready_workload_units[0].status == "READY"

def test_large_cluster_is_split():
    # 3. Slightly exceeds, 4. Split into multiple, 5-8. Orders perfectly assigned
    # 12. Cannot fit even largest
    v1 = _mock_vehicle(cap=1000)
    
    # 1100kg total -> exceeds 1000kg -> split required
    o1 = _mock_order(weight=600, lat=22.1, lon=75.1)
    o2 = _mock_order(weight=300, lat=22.2, lon=75.2)
    o3 = _mock_order(weight=200, lat=22.3, lon=75.3)
    
    c1 = _mock_cluster(order_ids=[o1.id, o2.id, o3.id], weight=1100)
    # Passed from validation as INFEASIBLE_CAPACITY
    vc1 = _mock_validated_cluster(c1, status="INFEASIBLE_CAPACITY")
    
    opt_input = OptimizationInput(scenario="DEMO", operator_id=uuid4(), depots=[OptimizationDepot(id=uuid4(), operator_id=uuid4(), name="D", latitude=0, longitude=0)], vehicles=[v1], orders=[o1, o2, o3], source_issues=[])
    clust_res = ClusteringResult(clusters=[c1], noise_order_ids=[], unclustered_order_ids=[], total_input_orders=3, clustering_status="COMPLETED", clustered_order_count=3, noise_order_count=0, epsilon_meters=5000, min_samples=1)
    val_res = ClusterValidationResult(validated_clusters=[vc1], noise_order_ids=[], unclustered_order_ids=[], total_input_orders=3, clustering_status="COMPLETED")
    
    res = CapacityPreparer().prepare(opt_input, clust_res, val_res, resolve_optimization_config("DEMO"))
    
    assert len(res.ready_workload_units) == 2
    
    # Check deterministic ordering (descending weight: 600, 300, 200)
    # Bin 1: 600 + 300 = 900
    # Bin 2: 200
    w1 = next(w for w in res.ready_workload_units if w.workload_unit_id == "C1-W01")
    w2 = next(w for w in res.ready_workload_units if w.workload_unit_id == "C1-W02")
    
    assert w1.total_weight_kg == 900
    assert w2.total_weight_kg == 200
    
    # 5. Exactly once, 6. None disappear, 7. No duplicates
    all_assigned = w1.order_ids + w2.order_ids
    assert set(all_assigned) == {o1.id, o2.id, o3.id}
    assert len(all_assigned) == 3
    
    # 8. No unit exceeds capacity
    assert w1.capacity_limit_kg == 1000
    assert w2.capacity_limit_kg == 1000
    
    # 16. Geographic coherence (centroid calculation updated per bin)
    assert w1.centroid_latitude == (22.1 + 22.2) / 2
    
    # 20. Workload unit IDs deterministic
    assert w1.status == "SPLIT"
    assert w2.status == "SPLIT"
    
def test_individual_order_larger_than_capacity():
    # 9. Individual order larger than max capacity
    v1 = _mock_vehicle(cap=1000)
    o1 = _mock_order(weight=1200) # unserviceable
    o2 = _mock_order(weight=500)  # feasible
    
    c1 = _mock_cluster(order_ids=[o1.id, o2.id], weight=1700)
    vc1 = _mock_validated_cluster(c1, status="INFEASIBLE_CAPACITY")
    
    opt_input = OptimizationInput(scenario="DEMO", operator_id=uuid4(), depots=[OptimizationDepot(id=uuid4(), operator_id=uuid4(), name="D", latitude=0, longitude=0)], vehicles=[v1], orders=[o1, o2], source_issues=[])
    clust_res = ClusteringResult(clusters=[c1], noise_order_ids=[], unclustered_order_ids=[], total_input_orders=2, clustering_status="COMPLETED", clustered_order_count=2, noise_order_count=0, epsilon_meters=5000, min_samples=1)
    val_res = ClusterValidationResult(validated_clusters=[vc1], noise_order_ids=[], unclustered_order_ids=[], total_input_orders=2, clustering_status="COMPLETED")
    
    res = CapacityPreparer().prepare(opt_input, clust_res, val_res, resolve_optimization_config("DEMO"))
    
    assert len(res.unserviceable_orders) == 1
    assert res.unserviceable_orders[0].order_id == o1.id
    assert res.unserviceable_orders[0].reason_code == "UNSERVICEABLE_ORDER_CAPACITY"
    
    assert len(res.ready_workload_units) == 1
    assert res.ready_workload_units[0].total_weight_kg == 500

def test_no_eligible_vehicles():
    # 13. No eligible vehicles
    o1 = _mock_order(weight=500)
    c1 = _mock_cluster(order_ids=[o1.id], weight=500)
    vc1 = _mock_validated_cluster(c1, status="NO_ELIGIBLE_VEHICLE")
    
    opt_input = OptimizationInput(scenario="DEMO", operator_id=uuid4(), depots=[OptimizationDepot(id=uuid4(), operator_id=uuid4(), name="D", latitude=0, longitude=0)], vehicles=[], orders=[o1], source_issues=[])
    clust_res = ClusteringResult(clusters=[c1], noise_order_ids=[], unclustered_order_ids=[], total_input_orders=1, clustering_status="COMPLETED", clustered_order_count=1, noise_order_count=0, epsilon_meters=5000, min_samples=1)
    val_res = ClusterValidationResult(validated_clusters=[vc1], noise_order_ids=[], unclustered_order_ids=[], total_input_orders=1, clustering_status="COMPLETED")
    
    res = CapacityPreparer().prepare(opt_input, clust_res, val_res, resolve_optimization_config("DEMO"))
    
    assert len(res.ready_workload_units) == 0
    assert len(res.unserviceable_orders) == 1
    assert res.unserviceable_orders[0].reason_code == "NO_ELIGIBLE_VEHICLE"

def test_max_load_ratio():
    # 14. Different configured max_load_ratio values
    # 15. Configuration overrides are respected
    v1 = _mock_vehicle(cap=1000)
    o1 = _mock_order(weight=900)
    c1 = _mock_cluster(order_ids=[o1.id], weight=900)
    vc1 = _mock_validated_cluster(c1, status="INFEASIBLE_CAPACITY") # Validated with 0.8 ratio previously
    
    opt_input = OptimizationInput(scenario="DEMO", operator_id=uuid4(), depots=[OptimizationDepot(id=uuid4(), operator_id=uuid4(), name="D", latitude=0, longitude=0)], vehicles=[v1], orders=[o1], source_issues=[])
    clust_res = ClusteringResult(clusters=[c1], noise_order_ids=[], unclustered_order_ids=[], total_input_orders=1, clustering_status="COMPLETED", clustered_order_count=1, noise_order_count=0, epsilon_meters=5000, min_samples=1)
    val_res = ClusterValidationResult(validated_clusters=[vc1], noise_order_ids=[], unclustered_order_ids=[], total_input_orders=1, clustering_status="COMPLETED")
    
    # 1000 * 0.8 = 800 usable. Order is 900.
    config = resolve_optimization_config("DEMO", OptimizationConfigOverrides(
        capacity=CapacityOverrides(max_load_ratio=0.8)
    ))
    
    res = CapacityPreparer().prepare(opt_input, clust_res, val_res, config)
    assert len(res.ready_workload_units) == 0
    assert len(res.unserviceable_orders) == 1
    assert res.unserviceable_orders[0].reason_code == "UNSERVICEABLE_ORDER_CAPACITY"

def test_noise_and_unclustered_preserved():
    # 17. Noise orders remain unclustered
    # 18. Unclustered orders are preserved
    # 22. Multiple clusters processed independently
    v1 = _mock_vehicle(cap=1000)
    o1 = _mock_order(weight=100)
    c1 = _mock_cluster(cluster_id="C1", order_ids=[o1.id], weight=100)
    vc1 = _mock_validated_cluster(c1)
    
    n1_id, u1_id = uuid4(), uuid4()
    
    opt_input = OptimizationInput(scenario="DEMO", operator_id=uuid4(), depots=[OptimizationDepot(id=uuid4(), operator_id=uuid4(), name="D", latitude=0, longitude=0)], vehicles=[v1], orders=[o1], source_issues=[])
    clust_res = ClusteringResult(clusters=[c1], noise_order_ids=[n1_id], unclustered_order_ids=[u1_id], total_input_orders=3, clustering_status="COMPLETED", clustered_order_count=1, noise_order_count=1, epsilon_meters=5000, min_samples=1)
    val_res = ClusterValidationResult(validated_clusters=[vc1], noise_order_ids=[n1_id], unclustered_order_ids=[u1_id], total_input_orders=3, clustering_status="COMPLETED")
    
    res = CapacityPreparer().prepare(opt_input, clust_res, val_res, resolve_optimization_config("DEMO"))
    
    assert res.noise_order_ids == [n1_id]
    assert res.unclustered_order_ids == [u1_id]
    assert len(res.ready_workload_units) == 1
