import pytest
import uuid
from typing import List

from app.services.routing.routing_service import RoutingService
from app.services.routing.schemas import MatrixRequest, MatrixResponse
from app.services.routing.exceptions import ProviderTimeoutError, NoRouteFoundError

from app.services.optimization.schemas import OptimizationInput, OptimizationOrder, OptimizationDepot
from app.services.optimization.config import resolve_optimization_config
from app.services.optimization.preparation.schemas import CapacityPreparationResult, WorkloadUnit
from app.services.optimization.routing.matrix_builder import RoadCostMatrixBuilder

@pytest.fixture
def anyio_backend():
    return 'asyncio'

class MockRoutingService(RoutingService):
    def __init__(self, should_timeout=False, no_route=False, partial_failure=False):
        self.should_timeout = should_timeout
        self.no_route = no_route
        self.partial_failure = partial_failure
        self.call_count = 0
        self.last_request = None
        
    async def get_matrix(self, request: MatrixRequest) -> MatrixResponse:
        self.call_count += 1
        self.last_request = request
        
        if self.should_timeout:
            raise ProviderTimeoutError("Timeout")
        
        if self.no_route:
            raise NoRouteFoundError("No route")
            
        n = len(request.locations)
        distances = [[1000.0 for _ in range(n)] for _ in range(n)]
        durations = [[600.0 for _ in range(n)] for _ in range(n)]
        
        for i in range(n):
            distances[i][i] = 0.0
            durations[i][i] = 0.0
            
        if self.partial_failure and n > 1:
            distances[0][1] = None
            durations[0][1] = None
            
        return MatrixResponse(
            distances=distances,
            durations=durations,
            provider="osrm",
            success=True
        )

def _mock_order(lat, lon):
    return OptimizationOrder(origin_depot_id=uuid.uuid4(), 
        id=uuid.uuid4(),
        reference_number="O1",
        operator_id=uuid.uuid4(),
        scenario="DEMO",
        destination_latitude=lat,
        destination_longitude=lon,
        weight_kg=100.0,
        status="PENDING",
        delivery_window_start=None,
        delivery_window_end=None
    )

def _mock_depot():
    return OptimizationDepot(id=uuid.uuid4(), operator_id=uuid.uuid4(), name="D", latitude=0, longitude=0)

@pytest.fixture
def mock_service():
    return MockRoutingService()

@pytest.mark.anyio
async def test_two_node_matrix(mock_service):
    # 1. Two-node matrix, 3. Distance units, 4. Duration units, 5. Node indexing
    # 24. Order traceability, 26. Depot traceability
    d = _mock_depot()
    o = _mock_order(1, 1)
    
    opt = OptimizationInput(scenario="DEMO", operator_id=uuid.uuid4(), depots=[d], vehicles=[], orders=[o], source_issues=[])
    wu = WorkloadUnit(workload_unit_id="W1", parent_cluster_id="C1", order_ids=[o.id], order_count=1, total_weight_kg=100.0, capacity_limit_kg=1000, utilization_ratio=0.1, centroid_latitude=1, centroid_longitude=1, status="READY")
    prep = CapacityPreparationResult(ready_workload_units=[wu], unserviceable_orders=[], noise_order_ids=[], unclustered_order_ids=[], clustering_status="COMPLETED")
    
    builder = RoadCostMatrixBuilder(mock_service)
    res = await builder.build(opt, prep, resolve_optimization_config("DEMO"))
    
    assert res.status == "SUCCESS"
    assert len(res.nodes) == 2
    assert "DEPOT" in res.nodes[0].node_id
    assert "ORDER" in res.nodes[1].node_id
    
    # Check traceabilities
    assert res.nodes[1].order_id == o.id
    assert res.nodes[1].workload_unit_id == "W1"
    assert res.nodes[1].parent_cluster_id == "C1"
    
    assert res.node_index[res.nodes[0].node_id] == 0
    assert res.node_index[res.nodes[1].node_id] == 1
    
    assert len(res.entries) == 4
    
    # 8. Self-distance = 0, 9. Self-duration = 0
    self_edge = next(e for e in res.entries if e.origin_node_id == res.nodes[0].node_id and e.destination_node_id == res.nodes[0].node_id)
    assert self_edge.distance_meters == 0.0
    assert self_edge.duration_seconds == 0.0

@pytest.mark.anyio
async def test_duplicate_coordinates_avoided():
    # 21. Duplicate coordinates handled, 22. duplicate calls avoided
    d = _mock_depot() # 0, 0
    o1 = _mock_order(0, 0)
    
    opt = OptimizationInput(scenario="DEMO", operator_id=uuid.uuid4(), depots=[d], vehicles=[], orders=[o1], source_issues=[])
    wu = WorkloadUnit(workload_unit_id="W1", parent_cluster_id="C1", order_ids=[o1.id], order_count=1, total_weight_kg=100.0, capacity_limit_kg=1000, utilization_ratio=0.1, centroid_latitude=0, centroid_longitude=0, status="READY")
    prep = CapacityPreparationResult(ready_workload_units=[wu], unserviceable_orders=[], noise_order_ids=[], unclustered_order_ids=[], clustering_status="COMPLETED")
    
    srv = MockRoutingService()
    builder = RoadCostMatrixBuilder(srv)
    res = await builder.build(opt, prep, resolve_optimization_config("DEMO"))
    
    assert res.status == "SUCCESS"
    # Even though there are 2 nodes (DEPOT and ORDER), they have the same coordinate (0,0)
    # the unique coords array is size 1. A trivial matrix should be built without calling get_matrix!
    # OR if it did call get_matrix, it called it with 1 coordinate.
    assert srv.call_count == 0

@pytest.mark.anyio
async def test_provider_timeout():
    # 14. Provider unavailable, 15. timeout
    d = _mock_depot() 
    o1 = _mock_order(1, 1)
    
    opt = OptimizationInput(scenario="DEMO", operator_id=uuid.uuid4(), depots=[d], vehicles=[], orders=[o1], source_issues=[])
    wu = WorkloadUnit(workload_unit_id="W1", parent_cluster_id="C1", order_ids=[o1.id], order_count=1, total_weight_kg=100, capacity_limit_kg=1000, utilization_ratio=0.1, centroid_latitude=1, centroid_longitude=1, status="READY")
    prep = CapacityPreparationResult(ready_workload_units=[wu], unserviceable_orders=[], noise_order_ids=[], unclustered_order_ids=[], clustering_status="COMPLETED")
    
    srv = MockRoutingService(should_timeout=True)
    builder = RoadCostMatrixBuilder(srv)
    res = await builder.build(opt, prep, resolve_optimization_config("DEMO"))
    
    assert res.status == "FAILED"
    assert "Timeout" in res.failure_reason
    assert len(res.entries) == 0

@pytest.mark.anyio
async def test_partial_failure():
    # 19. Partial matrix failure, 20. failed edges not zero-cost
    d = _mock_depot() # 0, 0
    o1 = _mock_order(1, 1)
    
    opt = OptimizationInput(scenario="DEMO", operator_id=uuid.uuid4(), depots=[d], vehicles=[], orders=[o1], source_issues=[])
    wu = WorkloadUnit(workload_unit_id="W1", parent_cluster_id="C1", order_ids=[o1.id], order_count=1, total_weight_kg=100, capacity_limit_kg=1000, utilization_ratio=0.1, centroid_latitude=1, centroid_longitude=1, status="READY")
    prep = CapacityPreparationResult(ready_workload_units=[wu], unserviceable_orders=[], noise_order_ids=[], unclustered_order_ids=[], clustering_status="COMPLETED")
    
    srv = MockRoutingService(partial_failure=True)
    builder = RoadCostMatrixBuilder(srv)
    res = await builder.build(opt, prep, resolve_optimization_config("DEMO"))
    
    assert res.status == "PARTIAL"
    failed_edge = next(e for e in res.entries if e.status == "UNAVAILABLE")
    assert failed_edge.distance_meters is None
    assert failed_edge.duration_seconds is None
