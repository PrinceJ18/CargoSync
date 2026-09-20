import pytest
from uuid import uuid4
import math

from app.services.optimization.baseline.schemas import BaselineInput, BaselineOrder
from app.services.optimization.baseline.calculator import BaselineCalculator
from app.services.routing.schemas import RoutingResponse, RoutingRequest
from app.services.routing.exceptions import RoutingBaseException
from app.services.optimization.exceptions import EmptyWorkloadError

class MockRoutingService:
    def __init__(self):
        self.calls = []
        self.fail_all = False
        self.fail_order_id = None
        
    async def get_route(self, request: RoutingRequest) -> RoutingResponse:
        self.calls.append(request)
        
        if self.fail_all:
            raise RoutingBaseException("Simulated failure for all routes")
            
        # We can uniquely identify the order by its coordinate if we match the request
        # Here we just return dummy values: dist = 1000m, dur = 600s
        # Let's say if lat == 89.0 we simulate a failure
        if request.waypoints[0].latitude == 89.0:
            raise RoutingBaseException("Simulated failure for specific route")
            
        return RoutingResponse(
            distance_meters=1000.0,
            duration_seconds=600.0,
            geometry={},
            provider="mock",
            success=True,
            status_info="OK"
        )

@pytest.fixture
def mock_routing_service():
    return MockRoutingService()

@pytest.fixture
def baseline_calculator(mock_routing_service):
    return BaselineCalculator(mock_routing_service)

@pytest.mark.asyncio
async def test_baseline_successful_routing(baseline_calculator, mock_routing_service):
    order1 = BaselineOrder(
        order_id=uuid4(),
        operator_id=uuid4(),
        origin_depot_id=uuid4(),
        destination_latitude=1.0,
        destination_longitude=1.0,
        origin_depot_latitude=0.0,
        origin_depot_longitude=0.0
    )
    order2 = BaselineOrder(
        order_id=uuid4(),
        operator_id=uuid4(),
        origin_depot_id=uuid4(),
        destination_latitude=2.0,
        destination_longitude=2.0,
        origin_depot_latitude=0.0,
        origin_depot_longitude=0.0
    )
    
    input_data = BaselineInput(orders=[order1, order2])
    result = await baseline_calculator.calculate_baseline(input_data)
    
    assert result.order_count == 2
    assert result.successfully_routed_order_count == 2
    assert result.failed_order_count == 0
    assert math.isclose(result.distance_reference_m, 2000.0) # 2 orders * 1000m
    assert math.isclose(result.duration_reference_s, 1200.0) # 2 orders * 600s
    assert len(mock_routing_service.calls) == 2
    
    # Verify the structure Depot -> Order -> Depot
    assert mock_routing_service.calls[0].origin.latitude == 0.0
    assert mock_routing_service.calls[0].waypoints[0].latitude == 1.0
    assert mock_routing_service.calls[0].destination.latitude == 0.0

@pytest.mark.asyncio
async def test_baseline_partial_success(baseline_calculator, mock_routing_service):
    order1 = BaselineOrder(
        order_id=uuid4(),
        operator_id=uuid4(),
        origin_depot_id=uuid4(),
        destination_latitude=1.0,
        destination_longitude=1.0,
        origin_depot_latitude=0.0,
        origin_depot_longitude=0.0
    )
    order2 = BaselineOrder(
        order_id=uuid4(),
        operator_id=uuid4(),
        origin_depot_id=uuid4(),
        destination_latitude=89.0, # Will trigger mock failure
        destination_longitude=2.0,
        origin_depot_latitude=0.0,
        origin_depot_longitude=0.0
    )
    
    input_data = BaselineInput(orders=[order1, order2])
    with pytest.raises(RoutingBaseException, match="Failed to calculate complete baseline"):
        await baseline_calculator.calculate_baseline(input_data)

@pytest.mark.asyncio
async def test_baseline_empty_workload(baseline_calculator):
    input_data = BaselineInput(orders=[])
    with pytest.raises(EmptyWorkloadError, match="No valid orders provided"):
        await baseline_calculator.calculate_baseline(input_data)

@pytest.mark.asyncio
async def test_baseline_all_failed(baseline_calculator, mock_routing_service):
    mock_routing_service.fail_all = True
    order1 = BaselineOrder(
        order_id=uuid4(),
        operator_id=uuid4(),
        origin_depot_id=uuid4(),
        destination_latitude=1.0,
        destination_longitude=1.0,
        origin_depot_latitude=0.0,
        origin_depot_longitude=0.0
    )
    
    input_data = BaselineInput(orders=[order1])
    with pytest.raises(RoutingBaseException, match="Failed to calculate complete baseline"):
        await baseline_calculator.calculate_baseline(input_data)
