from app.services.routing.dataset_schemas import RoutingDataset
from app.services.optimization.schemas import (
    OptimizationInput,
    OptimizationOrder,
    OptimizationVehicle,
    OptimizationDepot
)
from app.services.optimization.exceptions import OptimizationInputError, EmptyWorkloadError

def build_optimization_input(dataset: RoutingDataset) -> OptimizationInput:
    """
    Transforms a RoutingDataset into a strongly-typed OptimizationInput contract.
    Enforces eligibility rules for depots, vehicles, and orders.
    """
    # 1. Depot Handling
    if not dataset.depots:
        raise OptimizationInputError("No valid depot found in the routing dataset. Exactly one valid depot is required.")
    
    # We take the first valid depot as the primary depot for optimization
    source_depot = dataset.depots[0]
    opt_depot = OptimizationDepot(
        id=source_depot.id,
        operator_id=source_depot.operator_id,
        name=source_depot.name,
        latitude=source_depot.latitude,
        longitude=source_depot.longitude
    )
    
    # 2. Vehicle Handling
    if not dataset.vehicles:
        raise OptimizationInputError("No eligible vehicles found in the routing dataset.")
        
    opt_vehicles = [
        OptimizationVehicle(
            id=v.id,
            operator_id=v.operator_id,
            reference_number=v.reference_number,
            vehicle_type=v.vehicle_type,
            capacity_kg=v.capacity_kg,
            status=v.status,
            depot_id=v.depot_id
        ) for v in dataset.vehicles
    ]
    
    # 3. Order Handling
    if not dataset.orders:
        raise EmptyWorkloadError("No valid orders to route. The workload is empty.")
        
    opt_orders = [
        OptimizationOrder(
            id=o.id,
            reference_number=o.reference_number,
            operator_id=o.operator_id,
            scenario=o.scenario,
            destination_latitude=o.destination_latitude,
            destination_longitude=o.destination_longitude,
            weight_kg=o.weight_kg,
            status=o.status,
            pickup_window_start=o.pickup_window_start,
            pickup_window_end=o.pickup_window_end,
            delivery_window_start=o.delivery_window_start,
            delivery_window_end=o.delivery_window_end
        ) for o in dataset.orders
    ]
    
    # Return the Permissive OptimizationInput, preserving source_issues
    return OptimizationInput(
        scenario=dataset.scenario,
        operator_id=dataset.operator_id,
        depot=opt_depot,
        vehicles=opt_vehicles,
        orders=opt_orders,
        source_issues=dataset.issues
    )
