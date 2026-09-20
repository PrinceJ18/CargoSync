import pytest
import math
from uuid import uuid4

from app.services.optimization.clustering.distance import HaversineDistanceProvider
from app.services.optimization.clustering.engine import ClusteringEngine
from app.services.optimization.schemas import OptimizationInput, OptimizationOrder, OptimizationDepot, OptimizationVehicle
from app.services.optimization.config import resolve_optimization_config, OptimizationConfigOverrides, ClusteringOverrides

def _create_mock_input(orders_data, scenario="DEMO"):
    op_id = uuid4()
    orders = []
    for lat, lon, weight in orders_data:
        orders.append(
            OptimizationOrder(origin_depot_id=uuid4(), 
                id=uuid4(),
                reference_number="O",
                operator_id=op_id,
                scenario=scenario,
                destination_latitude=lat,
                destination_longitude=lon,
                weight_kg=weight,
                status="PENDING"
            )
        )
    return OptimizationInput(
        scenario=scenario,
        operator_id=op_id,
        depots=[OptimizationDepot(id=uuid4(), operator_id=op_id, name="D", latitude=0, longitude=0)],
        vehicles=[],
        orders=orders,
        source_issues=[]
    )

def test_haversine_correctness_and_properties():
    # 5. Haversine distance correctness.
    # 6. Symmetric distance matrix (distance(A,B) == distance(B,A)).
    # 7. Zero diagonal (distance(A,A) == 0).
    provider = HaversineDistanceProvider()
    
    pt1 = (52.2296756, 21.0122287) # Warsaw
    pt2 = (52.406374, 16.9251681)  # Poznan
    
    dist1 = provider.distance_meters(pt1, pt2)
    dist2 = provider.distance_meters(pt2, pt1)
    
    # Approx 279 km between Warsaw and Poznan
    assert 278000 < dist1 < 280000
    assert dist1 == dist2 # Symmetry
    assert provider.distance_meters(pt1, pt1) == 0.0 # Zero diagonal

def test_empty_and_single_input():
    # 9. Single-order input.
    # 10. Empty input.
    engine = ClusteringEngine(HaversineDistanceProvider())
    config = resolve_optimization_config("DEMO")
    
    empty_input = _create_mock_input([])
    res_empty = engine.run_clustering(empty_input, config)
    assert res_empty.total_input_orders == 0
    assert len(res_empty.clusters) == 0
    
    single_input = _create_mock_input([(22.7, 75.8, 100)])
    res_single = engine.run_clustering(single_input, config)
    assert res_single.total_input_orders == 1
    assert len(res_single.clusters) == 0
    assert len(res_single.noise_order_ids) == 1

def test_disabled_clustering_behavior():
    # 17. Disabled clustering behavior.
    engine = ClusteringEngine(HaversineDistanceProvider())
    overrides = OptimizationConfigOverrides(clustering=ClusteringOverrides(enabled=False))
    config = resolve_optimization_config("DEMO", overrides=overrides)
    
    # Give it enough points that it would cluster if enabled
    test_input = _create_mock_input([(22.7, 75.8, 10), (22.7, 75.8, 10), (22.7, 75.8, 10)])
    res = engine.run_clustering(test_input, config)
    
    assert res.clustering_status == "DISABLED"
    assert len(res.clusters) == 0
    assert len(res.noise_order_ids) == 0
    assert len(res.unclustered_order_ids) == 3
    assert res.total_input_orders == 3

def test_all_noise_input():
    # 11. All-noise input.
    engine = ClusteringEngine(HaversineDistanceProvider())
    overrides = OptimizationConfigOverrides(clustering=ClusteringOverrides(epsilon_meters=50.0, min_samples=3))
    config = resolve_optimization_config("DEMO", overrides=overrides)
    
    # Points very far apart
    test_input = _create_mock_input([(22.7, 75.8, 10), (22.8, 75.9, 10), (22.9, 76.0, 10)])
    res = engine.run_clustering(test_input, config)
    
    assert len(res.clusters) == 0
    assert len(res.noise_order_ids) == 3
    
def test_valid_clustering_metadata_and_duplicates():
    # 1. Valid geographic clustering.
    # 8. Duplicate coordinates.
    # 13. Correct cluster centroid.
    # 14. Correct cluster order count.
    # 15. Correct cluster total weight.
    engine = ClusteringEngine(HaversineDistanceProvider())
    overrides = OptimizationConfigOverrides(clustering=ClusteringOverrides(epsilon_meters=5000.0, min_samples=3))
    config = resolve_optimization_config("DEMO", overrides=overrides)
    
    # 3 duplicate points, guaranteed to form a cluster
    test_input = _create_mock_input([(22.7, 75.8, 100), (22.7, 75.8, 150), (22.7, 75.8, 50)])
    res = engine.run_clustering(test_input, config)
    
    assert len(res.clusters) == 1
    assert len(res.noise_order_ids) == 0
    
    cluster = res.clusters[0]
    assert cluster.order_count == 3
    assert cluster.total_weight_kg == 300
    assert cluster.centroid_latitude == 22.7
    assert cluster.centroid_longitude == 75.8

def test_multiple_clusters_and_noise_preservation():
    # 2. Multiple geographic clusters.
    # 3. Geographic noise.
    # 12. Deterministic cluster IDs.
    # 16. Noise IDs preserved.
    # 18. DEMO configuration.
    # 19. NETWORK configuration.
    engine = ClusteringEngine(HaversineDistanceProvider())
    overrides = OptimizationConfigOverrides(clustering=ClusteringOverrides(epsilon_meters=2000.0, min_samples=3))
    config = resolve_optimization_config("NETWORK", overrides=overrides)
    
    # Cluster 1 (tight)
    c1 = [(22.71, 75.81, 10), (22.711, 75.811, 10), (22.712, 75.812, 10)]
    # Cluster 2 (tight, far away)
    c2 = [(22.91, 75.91, 10), (22.911, 75.911, 10), (22.912, 75.912, 10)]
    # Noise point (far from everything)
    noise = [(23.5, 76.5, 10)]
    
    test_input = _create_mock_input(c1 + c2 + noise, scenario="NETWORK")
    noise_id = test_input.orders[-1].id
    
    res = engine.run_clustering(test_input, config)
    
    assert len(res.clusters) == 2
    assert res.clusters[0].cluster_id == "CLUSTER-001"
    assert res.clusters[1].cluster_id == "CLUSTER-002"
    
    assert len(res.noise_order_ids) == 1
    assert res.noise_order_ids[0] == noise_id

def test_deterministic_execution():
    # 20. Repeated execution produces identical results.
    # 21, 22, 23, 24 implicitly covered by these pure unit tests
    engine = ClusteringEngine(HaversineDistanceProvider())
    config = resolve_optimization_config("DEMO")
    
    c1 = [(22.71, 75.81, 10), (22.711, 75.811, 10), (22.712, 75.812, 10)]
    test_input = _create_mock_input(c1)
    
    res1 = engine.run_clustering(test_input, config)
    res2 = engine.run_clustering(test_input, config)
    
    assert res1.model_dump() == res2.model_dump()

def test_epsilon_interpretation_in_meters():
    # 4. Correct epsilon interpretation in meters.
    # Orders at ~500m distance apart. If eps=1000m, they cluster. If eps=100m, they don't.
    engine = ClusteringEngine(HaversineDistanceProvider())
    
    # 22.7000 to 22.7045 is approx 500 meters
    pts = [(22.7000, 75.8000, 10), (22.7045, 75.8000, 10), (22.7090, 75.8000, 10)]
    test_input = _create_mock_input(pts)
    
    cfg_cluster = resolve_optimization_config("DEMO", OptimizationConfigOverrides(
        clustering=ClusteringOverrides(epsilon_meters=1000.0, min_samples=3)
    ))
    res_cluster = engine.run_clustering(test_input, cfg_cluster)
    assert len(res_cluster.clusters) == 1
    
    cfg_noise = resolve_optimization_config("DEMO", OptimizationConfigOverrides(
        clustering=ClusteringOverrides(epsilon_meters=100.0, min_samples=3)
    ))
    res_noise = engine.run_clustering(test_input, cfg_noise)
    assert len(res_noise.clusters) == 0
    assert len(res_noise.noise_order_ids) == 3
