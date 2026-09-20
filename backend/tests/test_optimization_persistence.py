import pytest
from uuid import uuid4
from unittest.mock import patch, MagicMock

from app.schemas.optimization import OptimizationRunRequest
from app.services.optimization.orchestrator import OptimizationOrchestrator
from app.services.routing.exceptions import RoutingBaseException
from app.services.routing.schemas import RoutingResponse
from app.db.models import OptimizationRun, OptimizedRoute, OptimizedRouteStop
from geoalchemy2.elements import WKTElement

@pytest.fixture
def mock_db_session():
    class MockQuery:
        def filter(self, *args, **kwargs):
            return self
        def first(self):
            return None
        def all(self):
            return []
    class MockSession:
        def __init__(self):
            self.added_objects = []
        def query(self, *args, **kwargs):
            return MockQuery()
        def add(self, obj):
            self.added_objects.append(obj)
        def flush(self):
            pass
        def commit(self):
            self.committed = True
        def rollback(self):
            self.rolled_back = True
            
    return MockSession()

@pytest.mark.asyncio
@patch("app.services.routing.osrm_client.OSRMClient.__init__", return_value=None)
@patch("app.services.routing.osrm_client.OSRMClient.get_route")
async def test_persistence_successful_geometry_conversion(mock_get_route, mock_osrm_init, mock_db_session):
    # Test A, C, F
    
    # We need a successful route
    # Let's mock the routing service to return a specific geometry
    mock_get_route.return_value = {
        "distance": 10000.0,
        "duration": 1800.0,
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [75.8577, 22.7196],
                [75.8645, 22.7240],
                [75.8721, 22.7288]
            ]
        }
    }
    
    orchestrator = OptimizationOrchestrator(db=mock_db_session)
    # mock dataset builder to return a valid dataset so it proceeds to extraction
    # Wait, it's easier to mock dataset builder than setting up real DB data
    with patch("app.services.optimization.orchestrator.RoutingDatasetBuilder.build_dataset") as mock_build_dataset:
        from app.services.optimization.schemas import OptimizationInput, OptimizationDepot, OptimizationOrder, OptimizationVehicle
        
        from app.services.routing.dataset_schemas import RoutingDataset, RoutingDepot, RoutingOrder, RoutingVehicle
        depot_id = uuid4()
        operator_id = uuid4()
        ds = RoutingDataset(
            scenario="DEMO",
            depots=[RoutingDepot(id=depot_id, operator_id=operator_id, name="D1", latitude=22.7196, longitude=75.8577)],
            orders=[RoutingOrder(id=uuid4(), reference_number="REF1", operator_id=operator_id, scenario="DEMO", status="PENDING", origin_depot_id=depot_id, destination_latitude=22.7240, destination_longitude=75.8645, weight_kg=100.0)],
            vehicles=[RoutingVehicle(id=uuid4(), operator_id=operator_id, reference_number="V1", vehicle_type="TRUCK", status="AVAILABLE", capacity_kg=1000.0)]
        )
        mock_build_dataset.return_value = ds
        
        opt_input = OptimizationInput(
            scenario="DEMO",
            depots=[OptimizationDepot(id=ds.depots[0].id, operator_id=ds.depots[0].operator_id, name="D1", latitude=22.7196, longitude=75.8577)],
            orders=[OptimizationOrder(id=ds.orders[0].id, operator_id=ds.orders[0].operator_id, reference_number="REF1", scenario="DEMO", origin_depot_id=ds.orders[0].id, status="PENDING", destination_latitude=22.7240, destination_longitude=75.8645, weight_kg=100.0)],
            vehicles=[OptimizationVehicle(id=ds.vehicles[0].id, operator_id=ds.vehicles[0].operator_id, reference_number="V1", vehicle_type="TRUCK", status="AVAILABLE", capacity_kg=1000.0)]
        )
        
        # We also need to mock preparation, matrix, baseline, solver because they run before persistence.
        # It's easier to mock them to return trivial successful results.
        with patch("app.services.optimization.orchestrator.CapacityPreparer.prepare") as mock_prep:
            class DummyCluster:
                def __init__(self, orders):
                    self.orders = orders
            class DummyAssignment:
                def __init__(self, cluster):
                    self.cluster = cluster
            class DummyPrepResult:
                def __init__(self, ready_workload_units):
                    self.ready_workload_units = ready_workload_units
                    self.unserviceable_orders = []
            
            class DummyWorkloadUnit:
                def __init__(self, order_ids):
                    self.order_ids = order_ids
            
            mock_prep.return_value = DummyPrepResult(ready_workload_units=[DummyWorkloadUnit(order_ids=[opt_input.orders[0].id])])
            
            with patch("app.services.optimization.orchestrator.RoadCostMatrixBuilder.build") as mock_matrix:
                from app.services.optimization.routing.schemas import RoadCostMatrix
                mock_matrix.return_value = RoadCostMatrix(nodes=[], node_index={}, entries=[], status="SUCCESS")
                
                with patch("app.services.optimization.orchestrator.BaselineCalculator.calculate_baseline") as mock_baseline:
                    from app.services.optimization.baseline.schemas import BaselineResult
                    mock_baseline.return_value = BaselineResult(distance_reference_m=10.0, duration_reference_s=10.0, order_count=1, successfully_routed_order_count=1, failed_order_count=0, diagnostics=[])
                    
                    with patch("app.services.optimization.orchestrator.ORToolsOptimizer.solve") as mock_solve:
                        from app.services.optimization.solver.schemas import OptimizationResult, OptimizationResultRoute
                        route_id = str(uuid4())
                        mock_solve.return_value = OptimizationResult(
                            status="OPTIMAL",
                            routes=[OptimizationResultRoute(
                                route_id=route_id,
                                vehicle_id=opt_input.vehicles[0].id,
                                ordered_node_ids=[f"DEPOT-{opt_input.depots[0].id}", f"ORDER-{opt_input.orders[0].id}"],
                                ordered_order_ids=[opt_input.orders[0].id],
                                total_distance_meters=100.0,
                                total_duration_seconds=100.0,
                                total_weight_kg=100.0,
                                capacity_kg=1000.0,
                                utilization_ratio=0.1,
                                workload_unit_ids=[],
                                parent_cluster_ids=[]
                            )]
                        )
                        
                        response = await orchestrator.run_optimization(OptimizationRunRequest(scenario_id="DEMO"))
                        assert response.status == "COMPLETED", f"Response failed: {[d.message for d in response.diagnostics]}"
                        
                        # Verify persistence
                        routes = [obj for obj in mock_db_session.added_objects if isinstance(obj, OptimizedRoute)]
                        assert len(routes) == 1
                        persisted_route = routes[0]
                        # Verify coordinate ordering is long lat (X Y) -> Test A, C
                        # LINESTRING(75.8577 22.7196, 75.8645 22.724, 75.8721 22.7288)
                        assert isinstance(persisted_route.geometry, WKTElement)
                        wkt = str(persisted_route.geometry.data)
                        assert "LINESTRING(75.8577 22.7196, 75.8645 22.724" in wkt
                        assert "0 0, 1 1" not in wkt # Test B - No dummy geometry
                        
                        # Verify stops - Test F
                        stops = [obj for obj in mock_db_session.added_objects if isinstance(obj, OptimizedRouteStop)]
                        assert len(stops) == 1
                        assert stops[0].order_id == opt_input.orders[0].id
                        assert str(stops[0].location.data) == f"POINT({opt_input.orders[0].destination_longitude} {opt_input.orders[0].destination_latitude})"


@pytest.mark.asyncio
@patch("app.services.routing.osrm_client.OSRMClient.__init__", return_value=None)
@patch("app.services.routing.osrm_client.OSRMClient.get_route")
async def test_persistence_geometry_failure(mock_get_route, mock_osrm_init, mock_db_session):
    # Test D
    
    from app.services.routing.exceptions import RoutingBaseException
    mock_get_route.side_effect = RoutingBaseException("OSRM Routing failed: NoRoute")
    
    orchestrator = OptimizationOrchestrator(db=mock_db_session)
    with patch("app.services.optimization.orchestrator.RoutingDatasetBuilder.build_dataset") as mock_build_dataset:
        from app.services.optimization.schemas import OptimizationInput, OptimizationDepot, OptimizationOrder, OptimizationVehicle
        
        from app.services.routing.dataset_schemas import RoutingDataset, RoutingDepot, RoutingOrder, RoutingVehicle
        depot_id = uuid4()
        operator_id = uuid4()
        ds = RoutingDataset(
            scenario="DEMO",
            depots=[RoutingDepot(id=depot_id, operator_id=operator_id, name="D1", latitude=22.7196, longitude=75.8577)],
            orders=[RoutingOrder(id=uuid4(), reference_number="REF1", operator_id=operator_id, scenario="DEMO", status="PENDING", origin_depot_id=depot_id, destination_latitude=22.7240, destination_longitude=75.8645, weight_kg=100.0)],
            vehicles=[RoutingVehicle(id=uuid4(), operator_id=operator_id, reference_number="V1", vehicle_type="TRUCK", status="AVAILABLE", capacity_kg=1000.0)]
        )
        mock_build_dataset.return_value = ds
        
        opt_input = OptimizationInput(
            scenario="DEMO",
            depots=[OptimizationDepot(id=ds.depots[0].id, operator_id=ds.depots[0].operator_id, name="D1", latitude=22.7196, longitude=75.8577)],
            orders=[OptimizationOrder(id=ds.orders[0].id, operator_id=ds.orders[0].operator_id, reference_number="REF1", scenario="DEMO", origin_depot_id=ds.orders[0].id, status="PENDING", destination_latitude=22.7240, destination_longitude=75.8645, weight_kg=100.0)],
            vehicles=[OptimizationVehicle(id=ds.vehicles[0].id, operator_id=ds.vehicles[0].operator_id, reference_number="V1", vehicle_type="TRUCK", status="AVAILABLE", capacity_kg=1000.0)]
        )
        
        with patch("app.services.optimization.orchestrator.CapacityPreparer.prepare") as mock_prep:
            class DummyCluster:
                def __init__(self, orders):
                    self.orders = orders
            class DummyAssignment:
                def __init__(self, cluster):
                    self.cluster = cluster
            class DummyPrepResult:
                def __init__(self, ready_workload_units):
                    self.ready_workload_units = ready_workload_units
                    self.unserviceable_orders = []
            
            class DummyWorkloadUnit:
                def __init__(self, order_ids):
                    self.order_ids = order_ids
            
            mock_prep.return_value = DummyPrepResult(ready_workload_units=[DummyWorkloadUnit(order_ids=[opt_input.orders[0].id])])
            
            with patch("app.services.optimization.orchestrator.RoadCostMatrixBuilder.build") as mock_matrix:
                from app.services.optimization.routing.schemas import RoadCostMatrix
                mock_matrix.return_value = RoadCostMatrix(nodes=[], node_index={}, entries=[], status="SUCCESS")
                
                with patch("app.services.optimization.orchestrator.BaselineCalculator.calculate_baseline") as mock_baseline:
                    from app.services.optimization.baseline.schemas import BaselineResult
                    mock_baseline.return_value = BaselineResult(distance_reference_m=10.0, duration_reference_s=10.0, order_count=1, successfully_routed_order_count=1, failed_order_count=0, diagnostics=[])
                    
                    with patch("app.services.optimization.orchestrator.ORToolsOptimizer.solve") as mock_solve:
                        from app.services.optimization.solver.schemas import OptimizationResult, OptimizationResultRoute
                        mock_solve.return_value = OptimizationResult(
                            status="OPTIMAL",
                            routes=[OptimizationResultRoute(
                                route_id=str(uuid4()),
                                vehicle_id=opt_input.vehicles[0].id,
                                ordered_node_ids=[f"DEPOT-{opt_input.depots[0].id}", f"ORDER-{opt_input.orders[0].id}"],
                                ordered_order_ids=[opt_input.orders[0].id],
                                total_distance_meters=100.0,
                                total_duration_seconds=100.0,
                                total_weight_kg=100.0,
                                capacity_kg=1000.0,
                                utilization_ratio=0.1,
                                workload_unit_ids=[],
                                parent_cluster_ids=[]
                            )]
                        )
                        
                        response = await orchestrator.run_optimization(OptimizationRunRequest(scenario_id="DEMO"))
                        
                        assert response.status == "FAILED"
                        assert len(response.diagnostics) > 0
                        
                        # Verify we rolled back and stored a FAILED record
                        assert getattr(mock_db_session, 'rolled_back', False)
                        
                        # Only FAILED optimization run should be inserted via exception handler
                        routes = [obj for obj in mock_db_session.added_objects if isinstance(obj, OptimizedRoute)]
                        assert len(routes) == 0 # No routes persisted due to geometry failure
                        
                        runs = [obj for obj in mock_db_session.added_objects if isinstance(obj, OptimizationRun)]
                        assert len(runs) > 0
                        assert runs[-1].status == "FAILED"
