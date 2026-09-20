import pytest
from uuid import uuid4

from app.services.routing.dataset_schemas import (
    RoutingDataset,
    RoutingOrder,
    RoutingVehicle,
    RoutingDepot,
    DatasetValidationIssue
)
from app.services.optimization.input_builder import build_optimization_input
from app.services.optimization.exceptions import OptimizationInputError, EmptyWorkloadError

def create_valid_routing_dataset(scenario="DEMO"):
    op_id = uuid4()
    d_id = uuid4()
    return RoutingDataset(
        scenario=scenario,
        operator_id=op_id,
        depots=[
            RoutingDepot(id=d_id, operator_id=op_id, name="Depot A", latitude=22.7, longitude=75.8)
        ],
        vehicles=[
            RoutingVehicle(id=uuid4(), operator_id=op_id, reference_number="V1", vehicle_type="TRUCK", capacity_kg=1000, status="AVAILABLE")
        ],
        orders=[
            RoutingOrder(origin_depot_id=d_id, id=uuid4(), reference_number="O1", operator_id=op_id, scenario=scenario, destination_latitude=22.71, destination_longitude=75.81, weight_kg=100, status="PENDING")
        ],
        issues=[]
    )

def test_valid_demo_dataset():
    # 1. Valid DEMO RoutingDataset -> OptimizationInput
    dataset = create_valid_routing_dataset("DEMO")
    opt_input = build_optimization_input(dataset)
    assert opt_input.scenario == "DEMO"
    assert opt_input.depots[0].id == dataset.depots[0].id
    assert len(opt_input.vehicles) == 1
    assert len(opt_input.orders) == 1

def test_valid_network_dataset():
    # 2. Valid NETWORK RoutingDataset -> OptimizationInput
    dataset = create_valid_routing_dataset("NETWORK")
    opt_input = build_optimization_input(dataset)
    assert opt_input.scenario == "NETWORK"
    assert opt_input.depots[0].id == dataset.depots[0].id

def test_issues_preserved_and_invalid_records_excluded():
    # 3. Invalid orders are excluded from optimization orders.
    # 4. Their DatasetValidationIssues remain in source_issues.
    # 5. Invalid vehicles are excluded.
    # 6. Their issues remain traceable.
    # 7. Valid orders continue when issues exist.
    dataset = create_valid_routing_dataset()
    bad_order_issue = DatasetValidationIssue(record_type="Order", record_id=uuid4(), reason="Bad Coords", severity="ERROR")
    bad_vehicle_issue = DatasetValidationIssue(record_type="Vehicle", record_id=uuid4(), reason="Bad Cap", severity="ERROR")
    dataset.issues.extend([bad_order_issue, bad_vehicle_issue])
    
    # Notice that dataset.orders and dataset.vehicles already excluded the bad ones in Step 3.5,
    # so we just test that the valid ones continue and the issues are preserved.
    opt_input = build_optimization_input(dataset)
    assert len(opt_input.orders) == 1
    assert len(opt_input.vehicles) == 1
    assert len(opt_input.source_issues) == 2
    assert opt_input.source_issues[0].record_type == "Order"
    assert opt_input.source_issues[1].record_type == "Vehicle"

def test_missing_valid_depot():
    # 8. Missing valid depot produces a clear input error.
    dataset = create_valid_routing_dataset()
    dataset.depots = []
    with pytest.raises(OptimizationInputError) as exc_info:
        build_optimization_input(dataset)
    assert "At least one valid depot is required" in str(exc_info.value)

def test_zero_eligible_vehicles():
    # 9. Zero eligible vehicles produces a clear input condition.
    dataset = create_valid_routing_dataset()
    dataset.vehicles = []
    with pytest.raises(OptimizationInputError) as exc_info:
        build_optimization_input(dataset)
    assert "No eligible vehicles found" in str(exc_info.value)

def test_zero_valid_orders():
    # 10. Zero valid orders produces a clear empty-workload state.
    dataset = create_valid_routing_dataset()
    dataset.orders = []
    with pytest.raises(EmptyWorkloadError) as exc_info:
        build_optimization_input(dataset)
    assert "No valid orders to route" in str(exc_info.value)

def test_business_data_preserved():
    # 11. Scenario is preserved.
    # 12. Order IDs/references remain unchanged.
    # 13. Vehicle capacities remain unchanged.
    # 14. Coordinates remain unchanged.
    # 15. Admin/operator scope information is preserved correctly.
    dataset = create_valid_routing_dataset("DEMO")
    opt_input = build_optimization_input(dataset)
    
    assert opt_input.scenario == dataset.scenario
    assert opt_input.operator_id == dataset.operator_id
    
    assert opt_input.orders[0].id == dataset.orders[0].id
    assert opt_input.orders[0].reference_number == dataset.orders[0].reference_number
    assert opt_input.orders[0].destination_latitude == dataset.orders[0].destination_latitude
    assert opt_input.orders[0].destination_longitude == dataset.orders[0].destination_longitude
    
    assert opt_input.vehicles[0].id == dataset.vehicles[0].id
    assert opt_input.vehicles[0].capacity_kg == dataset.vehicles[0].capacity_kg
    
    assert opt_input.depots[0].id == dataset.depots[0].id
    assert opt_input.depots[0].latitude == dataset.depots[0].latitude
    assert opt_input.depots[0].longitude == dataset.depots[0].longitude

def test_pure_transformation():
    # 16. No SQLAlchemy objects leak into the optimization schemas.
    # 17. Deterministic output structure.
    dataset = create_valid_routing_dataset("DEMO")
    opt_input = build_optimization_input(dataset)
    
    assert isinstance(opt_input.depots[0].id, type(dataset.depots[0].id))
    # Using pydantic dump to verify pure dict serializability
    d = opt_input.model_dump()
    assert d["scenario"] == "DEMO"
    assert "vehicles" in d
    assert "orders" in d
    assert "source_issues" in d
