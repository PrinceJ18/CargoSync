from typing import List, Dict, Optional
import copy
import uuid

from app.services.optimization.schemas import (
    OptimizationInput, OptimizationOrder, OptimizationVehicle, OptimizationDepot,
    OptimizationObjectiveContext
)
from app.services.optimization.config import OptimizationConfig
from app.services.optimization.solver.schemas import OptimizationResult, OptimizationResultRoute
from app.services.optimization.return_loads.schemas import (
    ReturnLoadOpportunity, ReturnLoadAssignment, ReturnLoadAssignmentStatus
)
from app.services.routing.routing_service import RoutingService
from app.services.optimization.solver.solver import ORToolsOptimizer
from app.services.optimization.routing.matrix_builder import RoadCostMatrixBuilder
from app.services.optimization.preparation.schemas import CapacityPreparationResult, WorkloadUnit

async def reoptimize_routes_with_return_loads(
    opt_input: OptimizationInput,
    opt_result: OptimizationResult,
    opportunities: List[ReturnLoadOpportunity],
    assignments: List[ReturnLoadAssignment],
    routing_service: RoutingService,
    config: OptimizationConfig,
    objective_context: OptimizationObjectiveContext
) -> OptimizationResult:
    """
    Incorporates assigned return loads into the route result by invoking OR-Tools to 
    dynamically optimize the full sequence including the new Return Load Pickup and Delivery nodes.
    If re-optimization fails, rolls back the assignment.
    """
    if not assignments:
        return opt_result
        
    opp_map = {opp.return_load_id: opp for opp in opportunities}
    assignment_map: Dict[str, List[ReturnLoadAssignment]] = {}
    
    for a in assignments:
        if a.assignment_status == ReturnLoadAssignmentStatus.ASSIGNED:
            assignment_map.setdefault(a.route_id, []).append(a)
            
    new_result = copy.deepcopy(opt_result)
    
    for route in new_result.routes:
        route_assignments = assignment_map.get(route.route_id)
        if not route_assignments:
            continue
            
        # 1. Build a localized OptimizationInput for this specific route
        # Extract vehicle and depot
        vehicle = next((v for v in opt_input.vehicles if v.id == route.vehicle_id), None)
        if not vehicle:
            # Should not happen, but safeguard
            continue
            
        depot = next((d for d in opt_input.depots if d.id == route.depot_id), None)
        if not depot:
            continue
            
        # Extract original routed orders
        original_orders = [o for o in opt_input.orders if o.id in route.ordered_order_ids]
        
        # We will inject the new return load orders here
        injected_orders = []
        for a in route_assignments:
            opp = opp_map[a.return_load_id]
            pickup_uuid = uuid.uuid5(uuid.NAMESPACE_OID, f"pickup-{a.return_load_id}")
            delivery_uuid = uuid.uuid5(uuid.NAMESPACE_OID, f"delivery-{a.return_load_id}")
            
            injected_orders.append(OptimizationOrder(
                id=pickup_uuid,
                reference_number=f"RL-PICKUP-{a.return_load_id}",
                operator_id=opp.operator_id,
                scenario=opt_input.scenario,
                origin_depot_id=depot.id,
                destination_latitude=opp.pickup_latitude,
                destination_longitude=opp.pickup_longitude,
                weight_kg=opp.weight_kg,
                status="RL_PICKUP",
                linked_delivery_id=delivery_uuid,
                return_load_id=a.return_load_id
            ))
            
            injected_orders.append(OptimizationOrder(
                id=delivery_uuid,
                reference_number=f"RL-DELIVERY-{a.return_load_id}",
                operator_id=opp.operator_id,
                scenario=opt_input.scenario,
                origin_depot_id=depot.id,
                destination_latitude=opp.delivery_latitude,
                destination_longitude=opp.delivery_longitude,
                weight_kg=opp.weight_kg,
                status="RL_DELIVERY",
                return_load_id=a.return_load_id
            ))
            
            # Also append to the global opt_input so Geometry Extractor finds them later
            opt_input.orders.extend(injected_orders[-2:])
            
        all_route_orders = original_orders + injected_orders
        
        local_input = OptimizationInput(
            scenario=opt_input.scenario,
            operator_id=opt_input.operator_id,
            depots=[depot],
            vehicles=[vehicle],
            orders=all_route_orders
        )
        
        # 2. Build local CapacityPreparationResult
        ready_units = []
        for o in all_route_orders:
            # Treat each order as its own workload unit for this localized solve
            ready_units.append(
                WorkloadUnit(
                    workload_unit_id=f"WU-{o.id}",
                    order_ids=[o.id],
                    parent_cluster_id="dummy",
                    order_count=1,
                    total_weight_kg=o.weight_kg if o.status != "RL_DELIVERY" else -o.weight_kg,
                    capacity_limit_kg=vehicle.capacity_kg,
                    utilization_ratio=0.0,
                    centroid_latitude=o.destination_latitude,
                    centroid_longitude=o.destination_longitude,
                    status="READY"
                )
            )
            
        prep_result = CapacityPreparationResult(
            ready_workload_units=ready_units,
            unserviceable_orders=[],
            noise_order_ids=[],
            unclustered_order_ids=[],
            clustering_status="SUCCESS"
        )
        
        # 3. Build Cost Matrix
        matrix_builder = RoadCostMatrixBuilder(routing_service)
        matrix = await matrix_builder.build(local_input, prep_result, config)
        
        # 4. Invoke Solver
        solver = ORToolsOptimizer()
        local_result = solver.solve(local_input, config, prep_result, matrix, objective_context)
        
        # 5. Evaluate Re-optimization
        if local_result.status not in ["OPTIMAL", "FEASIBLE"] or not local_result.routes:
            # Reoptimization failed (e.g. constraints violated). Rollback by keeping the original route untouched.
            for a in route_assignments:
                a.assignment_status = ReturnLoadAssignmentStatus.UNASSIGNED_REOPTIMIZATION_FAILED
            continue
            
        # Re-optimization succeeded!
        new_route = local_result.routes[0]
        
        # Restore the original UUIDs so it seamlessly replaces the old route in the final output
        new_route.route_id = route.route_id 
        
        # Calculate real utilization
        # Original total weight + sum of return load weights
        total_new_weight = sum(o.weight_kg for o in original_orders) + sum(opp_map[a.return_load_id].weight_kg for a in route_assignments)
        new_route.total_weight_kg = total_new_weight
        new_route.utilization_ratio = total_new_weight / vehicle.capacity_kg if vehicle.capacity_kg > 0 else 0.0
        
        # Update the main result's route
        route.ordered_node_ids = new_route.ordered_node_ids
        route.ordered_order_ids = new_route.ordered_order_ids
        route.total_distance_meters = new_route.total_distance_meters
        route.total_duration_seconds = new_route.total_duration_seconds
        route.total_weight_kg = new_route.total_weight_kg
        route.utilization_ratio = new_route.utilization_ratio
        
    return new_result
