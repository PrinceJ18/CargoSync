from app.services.routing.dataset_schemas import RoutingDataset, DatasetValidationIssue
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
        raise OptimizationInputError("No valid depot found in the routing dataset. At least one valid depot is required.")
    
    opt_depots = [
        OptimizationDepot(
            id=d.id,
            operator_id=d.operator_id,
            name=d.name,
            latitude=d.latitude,
            longitude=d.longitude
        ) for d in dataset.depots
    ]
    
    valid_depot_ids = {d.id: d for d in dataset.depots}
    
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
        
    opt_orders = []
    for o in dataset.orders:
        if not o.origin_depot_id:
            dataset.issues.append(DatasetValidationIssue(
                record_type="Order",
                record_id=o.id,
                reference_number=o.reference_number,
                reason="Order is missing origin_depot_id. An explicit origin depot is required.",
                severity="ERROR"
            ))
            continue
            
        if o.origin_depot_id not in valid_depot_ids:
            dataset.issues.append(DatasetValidationIssue(
                record_type="Order",
                record_id=o.id,
                reference_number=o.reference_number,
                reason=f"Order references depot {o.origin_depot_id} which does not exist or has invalid coordinates.",
                severity="ERROR"
            ))
            continue
            
        if valid_depot_ids[o.origin_depot_id].operator_id != o.operator_id:
            dataset.issues.append(DatasetValidationIssue(
                record_type="Order",
                record_id=o.id,
                reference_number=o.reference_number,
                reason=f"Order belongs to operator {o.operator_id} but its depot belongs to {valid_depot_ids[o.origin_depot_id].operator_id}.",
                severity="ERROR"
            ))
            continue
            
        opt_orders.append(
            OptimizationOrder(
                id=o.id,
                reference_number=o.reference_number,
                operator_id=o.operator_id,
                scenario=o.scenario,
                origin_depot_id=o.origin_depot_id,
                destination_latitude=o.destination_latitude,
                destination_longitude=o.destination_longitude,
                weight_kg=o.weight_kg,
                status=o.status,
                pickup_window_start=o.pickup_window_start,
                pickup_window_end=o.pickup_window_end,
                delivery_window_start=o.delivery_window_start,
                delivery_window_end=o.delivery_window_end
            )
        )
        
    if not opt_orders:
        raise EmptyWorkloadError("No valid orders remain after origin depot validation.")
    
    # Return the Permissive OptimizationInput, preserving source_issues
    return OptimizationInput(
        scenario=dataset.scenario,
        operator_id=dataset.operator_id,
        depots=opt_depots,
        vehicles=opt_vehicles,
        orders=opt_orders,
        source_issues=dataset.issues
    )
