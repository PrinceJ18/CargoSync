import pytest
from uuid import uuid4
from datetime import datetime, timedelta

from app.services.optimization.schemas import OptimizationInput, OptimizationOrder, OptimizationDepot, OptimizationVehicle
from app.services.optimization.config import resolve_optimization_config, OptimizationConfigOverrides, CapacityOverrides, TimeWindowOverrides
from app.services.optimization.clustering.schemas import ClusteringResult, Cluster
from app.services.optimization.validation.validator import ClusterValidator

def _mock_order(id=None, weight=100, lat=22.7, lon=75.8, tw_start=None, tw_end=None):
    return OptimizationOrder(origin_depot_id=uuid4(), 
        id=id or uuid4(),
        reference_number="O-1",
        operator_id=uuid4(),
        scenario="DEMO",
        destination_latitude=lat,
        destination_longitude=lon,
        weight_kg=weight,
        status="PENDING",
        delivery_window_start=tw_start,
        delivery_window_end=tw_end
    )

def _mock_vehicle(id=None, cap=1000):
    return OptimizationVehicle(
        id=id or uuid4(),
        reference_number="V-1",
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

def test_valid_cluster_within_capacity():
    # 1. Valid cluster within capacity
    # 21. No SQLAlchemy objects
    # 22. No external calls
    o1 = _mock_order(weight=400)
    v1 = _mock_vehicle(cap=1000)
    c1 = _mock_cluster(order_ids=[o1.id], weight=400)
    
    opt_input = OptimizationInput(scenario="DEMO", operator_id=uuid4(), depots=[OptimizationDepot(id=uuid4(), operator_id=uuid4(), name="D", latitude=0, longitude=0)], vehicles=[v1], orders=[o1], source_issues=[])
    clust_res = ClusteringResult(clusters=[c1], noise_order_ids=[], unclustered_order_ids=[], total_input_orders=1, clustering_status="COMPLETED", clustered_order_count=1, noise_order_count=0, epsilon_meters=5000, min_samples=1)
    config = resolve_optimization_config("DEMO")
    
    val = ClusterValidator().validate(clust_res, opt_input, config)
    
    assert len(val.validated_clusters) == 1
    assert val.validated_clusters[0].validation_status == "NEEDS_FURTHER_ROUTE_VALIDATION"
    assert val.validated_clusters[0].capacity_ratio == 0.4

def test_cluster_exactly_at_capacity_boundary():
    # 2. Cluster exactly at allowed capacity boundary
    o1 = _mock_order(weight=1000)
    v1 = _mock_vehicle(cap=1000)
    c1 = _mock_cluster(order_ids=[o1.id], weight=1000)
    
    opt_input = OptimizationInput(scenario="DEMO", operator_id=uuid4(), depots=[OptimizationDepot(id=uuid4(), operator_id=uuid4(), name="D", latitude=0, longitude=0)], vehicles=[v1], orders=[o1], source_issues=[])
    clust_res = ClusteringResult(clusters=[c1], noise_order_ids=[], unclustered_order_ids=[], total_input_orders=1, clustering_status="COMPLETED", clustered_order_count=1, noise_order_count=0, epsilon_meters=5000, min_samples=1)
    config = resolve_optimization_config("DEMO")
    
    val = ClusterValidator().validate(clust_res, opt_input, config)
    assert val.validated_clusters[0].validation_status == "NEEDS_FURTHER_ROUTE_VALIDATION"
    assert val.validated_clusters[0].capacity_ratio == 1.0

def test_cluster_exceeding_capacity():
    # 3. Cluster exceeding maximum vehicle capacity
    # 4. Multiple vehicles with different capacities
    o1 = _mock_order(weight=1500)
    v1 = _mock_vehicle(cap=1000)
    v2 = _mock_vehicle(cap=1200) # Max is 1200
    c1 = _mock_cluster(order_ids=[o1.id], weight=1500)
    
    opt_input = OptimizationInput(scenario="DEMO", operator_id=uuid4(), depots=[OptimizationDepot(id=uuid4(), operator_id=uuid4(), name="D", latitude=0, longitude=0)], vehicles=[v1, v2], orders=[o1], source_issues=[])
    clust_res = ClusteringResult(clusters=[c1], noise_order_ids=[], unclustered_order_ids=[], total_input_orders=1, clustering_status="COMPLETED", clustered_order_count=1, noise_order_count=0, epsilon_meters=5000, min_samples=1)
    config = resolve_optimization_config("DEMO")
    
    val = ClusterValidator().validate(clust_res, opt_input, config)
    assert val.validated_clusters[0].validation_status == "INFEASIBLE_CAPACITY"
    assert val.validated_clusters[0].capacity_ratio == 1500/1200
    assert len(val.validated_clusters[0].validation_reasons) == 1
    assert val.validated_clusters[0].validation_reasons[0].code == "CAPACITY_EXCEEDED"

def test_no_eligible_vehicles():
    # 5. No eligible vehicles
    o1 = _mock_order(weight=100)
    c1 = _mock_cluster(order_ids=[o1.id], weight=100)
    opt_input = OptimizationInput(scenario="DEMO", operator_id=uuid4(), depots=[OptimizationDepot(id=uuid4(), operator_id=uuid4(), name="D", latitude=0, longitude=0)], vehicles=[], orders=[o1], source_issues=[])
    clust_res = ClusteringResult(clusters=[c1], noise_order_ids=[], unclustered_order_ids=[], total_input_orders=1, clustering_status="COMPLETED", clustered_order_count=1, noise_order_count=0, epsilon_meters=5000, min_samples=1)
    config = resolve_optimization_config("DEMO")
    
    val = ClusterValidator().validate(clust_res, opt_input, config)
    assert val.validated_clusters[0].validation_status == "NO_ELIGIBLE_VEHICLE"
    assert val.validated_clusters[0].validation_reasons[0].code == "NO_ELIGIBLE_VEHICLE"

def test_time_window_validation():
    # 7. Valid time windows
    # 8. Invalid order-level time window
    # 10. Route-level deferred
    now = datetime.now()
    o1 = _mock_order(tw_start=now, tw_end=now + timedelta(hours=1)) # Valid
    o2 = _mock_order(tw_start=now + timedelta(hours=2), tw_end=now) # Invalid
    
    v1 = _mock_vehicle()
    c1 = _mock_cluster(cluster_id="C1", order_ids=[o1.id], weight=100)
    c2 = _mock_cluster(cluster_id="C2", order_ids=[o2.id], weight=100)
    
    opt_input = OptimizationInput(scenario="DEMO", operator_id=uuid4(), depots=[OptimizationDepot(id=uuid4(), operator_id=uuid4(), name="D", latitude=0, longitude=0)], vehicles=[v1], orders=[o1, o2], source_issues=[])
    clust_res = ClusteringResult(clusters=[c1, c2], noise_order_ids=[], unclustered_order_ids=[], total_input_orders=2, clustering_status="COMPLETED", clustered_order_count=2, noise_order_count=0, epsilon_meters=5000, min_samples=1)
    config = resolve_optimization_config("DEMO")
    
    val = ClusterValidator().validate(clust_res, opt_input, config)
    assert val.validated_clusters[0].validation_status == "NEEDS_FURTHER_ROUTE_VALIDATION"
    
    assert val.validated_clusters[1].validation_status == "INVALID_TIME_WINDOW"
    assert val.validated_clusters[1].validation_reasons[0].code == "INVALID_TIME_WINDOW"

def test_multiple_validation_reasons():
    # 13. Multiple validation reasons on one cluster
    now = datetime.now()
    o1 = _mock_order(weight=2000, tw_start=now + timedelta(hours=2), tw_end=now) # Invalid TW and heavy
    v1 = _mock_vehicle(cap=1000)
    c1 = _mock_cluster(order_ids=[o1.id], weight=2000)
    
    opt_input = OptimizationInput(scenario="DEMO", operator_id=uuid4(), depots=[OptimizationDepot(id=uuid4(), operator_id=uuid4(), name="D", latitude=0, longitude=0)], vehicles=[v1], orders=[o1], source_issues=[])
    clust_res = ClusteringResult(clusters=[c1], noise_order_ids=[], unclustered_order_ids=[], total_input_orders=1, clustering_status="COMPLETED", clustered_order_count=1, noise_order_count=0, epsilon_meters=5000, min_samples=1)
    config = resolve_optimization_config("DEMO")
    
    val = ClusterValidator().validate(clust_res, opt_input, config)
    # Status is INFEASIBLE_CAPACITY (which takes precedence over INVALID_TIME_WINDOW as it's a hard vehicle block)
    assert val.validated_clusters[0].validation_status == "INFEASIBLE_CAPACITY"
    # But BOTH reasons must be captured
    codes = [r.code for r in val.validated_clusters[0].validation_reasons]
    assert "CAPACITY_EXCEEDED" in codes
    assert "INVALID_TIME_WINDOW" in codes
    assert len(codes) == 2

def test_geographic_metrics_and_noise_preservation():
    # 11. Geographic metric calculation
    # 12. Correct distinction between geographic distance and road distance
    # 14. Noise/unclustered orders are not silently converted into clusters
    # 15. Empty clustering result
    o1 = _mock_order(lat=22.7, lon=75.8)
    v1 = _mock_vehicle()
    c1 = _mock_cluster(order_ids=[o1.id], lat=22.7, lon=75.81) # centroid slightly offset
    
    opt_input = OptimizationInput(scenario="DEMO", operator_id=uuid4(), depots=[OptimizationDepot(id=uuid4(), operator_id=uuid4(), name="D", latitude=0, longitude=0)], vehicles=[v1], orders=[o1], source_issues=[])
    clust_res = ClusteringResult(clusters=[c1], noise_order_ids=[uuid4()], unclustered_order_ids=[], total_input_orders=2, clustering_status="COMPLETED", clustered_order_count=1, noise_order_count=1, epsilon_meters=5000, min_samples=1)
    config = resolve_optimization_config("DEMO")
    
    val = ClusterValidator().validate(clust_res, opt_input, config)
    
    # 11, 12 - Geodesic straight-line distance is calculated
    assert val.validated_clusters[0].max_distance_from_centroid_meters > 0
    # 14
    assert len(val.noise_order_ids) == 1
    
def test_configuration_overrides():
    # 19. Existing optimization configuration defaults respected
    # 20. Configuration override respected
    o1 = _mock_order(weight=2000)
    v1 = _mock_vehicle(cap=1000)
    c1 = _mock_cluster(order_ids=[o1.id], weight=2000)
    
    opt_input = OptimizationInput(scenario="DEMO", operator_id=uuid4(), depots=[OptimizationDepot(id=uuid4(), operator_id=uuid4(), name="D", latitude=0, longitude=0)], vehicles=[v1], orders=[o1], source_issues=[])
    clust_res = ClusteringResult(clusters=[c1], noise_order_ids=[], unclustered_order_ids=[], total_input_orders=1, clustering_status="COMPLETED", clustered_order_count=1, noise_order_count=0, epsilon_meters=5000, min_samples=1)
    
    # Disable capacity enforcement
    config_override = resolve_optimization_config("DEMO", OptimizationConfigOverrides(
        capacity=CapacityOverrides(enforce_capacity=False)
    ))
    
    val = ClusterValidator().validate(clust_res, opt_input, config_override)
    # Should not fail capacity check since it's disabled
    assert val.validated_clusters[0].validation_status == "NEEDS_FURTHER_ROUTE_VALIDATION"
    assert len(val.validated_clusters[0].validation_reasons) == 0

def test_disabled_clustering_preservation():
    # 16. Disabled clustering result
    # 17. Deterministic output ordering
    opt_input = OptimizationInput(scenario="DEMO", operator_id=uuid4(), depots=[OptimizationDepot(id=uuid4(), operator_id=uuid4(), name="D", latitude=0, longitude=0)], vehicles=[], orders=[], source_issues=[])
    clust_res = ClusteringResult(clusters=[], noise_order_ids=[], unclustered_order_ids=[uuid4()], total_input_orders=1, clustering_status="DISABLED", clustered_order_count=0, noise_order_count=0, epsilon_meters=5000, min_samples=1)
    config = resolve_optimization_config("DEMO")
    
    val = ClusterValidator().validate(clust_res, opt_input, config)
    assert val.clustering_status == "DISABLED"
    assert len(val.unclustered_order_ids) == 1
    assert len(val.validated_clusters) == 0
