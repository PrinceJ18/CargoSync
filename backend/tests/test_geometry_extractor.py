import pytest
import uuid
from pydantic import ValidationError

from app.services.optimization.schemas import OptimizationInput, OptimizationOrder, OptimizationVehicle, OptimizationDepot
from app.services.optimization.solver.schemas import OptimizationResult, OptimizationResultRoute
from app.services.routing.routing_service import RoutingService
from app.services.routing.schemas import RoutingRequest, RoutingResponse, Coordinate
from app.services.routing.exceptions import NoRouteFoundError
from app.services.optimization.geometry.extractor import RouteGeometryExtractor

class MockRoutingService:
    def __init__(self):
        self.requests = []
        self.mock_response = None
        self.mock_exception = None

    async def get_route(self, request: RoutingRequest) -> RoutingResponse:
        self.requests.append(request)
        if self.mock_exception:
            raise self.mock_exception
        if self.mock_response:
            return self.mock_response
            
        return RoutingResponse(
            distance_meters=100.0,
            duration_seconds=50.0,
            geometry={"type": "LineString", "coordinates": [[1.0, 1.0], [2.0, 2.0]]},
            provider="mock",
            success=True,
            status_info="OK"
        )

@pytest.fixture
def mock_routing_service():
    return MockRoutingService()

@pytest.fixture
def geometry_extractor(mock_routing_service):
    return RouteGeometryExtractor(routing_service=mock_routing_service)

def test_extract_geometry_success(geometry_extractor, mock_routing_service):
    depot_id = uuid.uuid4()
    order1_id = uuid.uuid4()
    order2_id = uuid.uuid4()
    
    depot = OptimizationDepot(id=depot_id, operator_id=uuid.uuid4(), name="Depot", latitude=10.0, longitude=10.0)
    order1 = OptimizationOrder(origin_depot_id=uuid.uuid4(), id=order1_id, reference_number="1", operator_id=uuid.uuid4(), scenario="DEMO", destination_latitude=11.0, destination_longitude=11.0, weight_kg=10, status="PENDING")
    order2 = OptimizationOrder(origin_depot_id=uuid.uuid4(), id=order2_id, reference_number="2", operator_id=uuid.uuid4(), scenario="DEMO", destination_latitude=12.0, destination_longitude=12.0, weight_kg=10, status="PENDING")
    
    opt_in = OptimizationInput(
        scenario="DEMO",
        depots=[depot],
        vehicles=[],
        orders=[order1, order2]
    )
    
    route = OptimizationResultRoute(
        route_id="r1",
        vehicle_id=uuid.uuid4(),
        ordered_node_ids=[f"DEPOT-{depot_id}", f"ORDER-{order1_id}", f"ORDER-{order2_id}", f"DEPOT-{depot_id}"],
        ordered_order_ids=[order1_id, order2_id],
        total_distance_meters=50,
        total_duration_seconds=25,
        total_weight_kg=20,
        capacity_kg=100,
        utilization_ratio=0.2,
        workload_unit_ids=[],
        parent_cluster_ids=[]
    )
    
    opt_res = OptimizationResult(
        status="FEASIBLE",
        routes=[route]
    )
    
    import asyncio
    result = asyncio.run(geometry_extractor.extract_geometry(opt_res, opt_in))
    
    assert result.status == "SUCCESS"
    assert len(result.routes) == 1
    ext = result.routes[0]
    
    assert ext.route_id == "r1"
    assert ext.status == "SUCCESS"
    assert ext.distance_meters == 100.0
    assert ext.duration_seconds == 50.0
    assert ext.geometry == {"type": "LineString", "coordinates": [[1.0, 1.0], [2.0, 2.0]]}
    
    # Check that RoutingService was called with the exact sequence
    assert len(mock_routing_service.requests) == 1
    req = mock_routing_service.requests[0]
    assert req.origin.latitude == 10.0
    assert req.origin.longitude == 10.0
    assert len(req.waypoints) == 2
    assert req.waypoints[0].latitude == 11.0
    assert req.waypoints[0].longitude == 11.0
    assert req.waypoints[1].latitude == 12.0
    assert req.waypoints[1].longitude == 12.0
    assert req.destination.latitude == 10.0
    assert req.destination.longitude == 10.0

def test_extract_geometry_missing_coordinate(geometry_extractor):
    depot_id = uuid.uuid4()
    depot = OptimizationDepot(id=depot_id, operator_id=uuid.uuid4(), name="Depot", latitude=10.0, longitude=10.0)
    opt_in = OptimizationInput(scenario="DEMO", depots=[depot], vehicles=[], orders=[])
    
    route = OptimizationResultRoute(
        route_id="r1",
        vehicle_id=uuid.uuid4(),
        ordered_node_ids=[f"DEPOT-{depot_id}", "ORDER-MISSING"],
        ordered_order_ids=[],
        total_distance_meters=0, total_duration_seconds=0, total_weight_kg=0, capacity_kg=0, utilization_ratio=0, workload_unit_ids=[], parent_cluster_ids=[]
    )
    
    opt_res = OptimizationResult(status="FEASIBLE", routes=[route])
    
    import asyncio
    result = asyncio.run(geometry_extractor.extract_geometry(opt_res, opt_in))
    
    assert result.status == "FAILED"
    assert result.routes[0].status == "FAILED"
    assert "Missing coordinate" in result.routes[0].error_message
    
def test_extract_geometry_provider_error(geometry_extractor, mock_routing_service):
    depot_id = uuid.uuid4()
    depot = OptimizationDepot(id=depot_id, operator_id=uuid.uuid4(), name="Depot", latitude=10.0, longitude=10.0)
    opt_in = OptimizationInput(scenario="DEMO", depots=[depot], vehicles=[], orders=[])
    
    route = OptimizationResultRoute(
        route_id="r1",
        vehicle_id=uuid.uuid4(),
        ordered_node_ids=[f"DEPOT-{depot_id}", f"DEPOT-{depot_id}"],
        ordered_order_ids=[],
        total_distance_meters=0, total_duration_seconds=0, total_weight_kg=0, capacity_kg=0, utilization_ratio=0, workload_unit_ids=[], parent_cluster_ids=[]
    )
    
    opt_res = OptimizationResult(status="FEASIBLE", routes=[route])
    
    mock_routing_service.mock_exception = NoRouteFoundError("Failed to route")
    
    import asyncio
    result = asyncio.run(geometry_extractor.extract_geometry(opt_res, opt_in))
    
    assert result.status == "FAILED"
    assert result.routes[0].status == "FAILED"
    assert "Failed to route" in result.routes[0].error_message
    assert result.routes[0].geometry is None
