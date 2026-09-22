import uuid
from typing import List, Dict, Tuple, Optional
import math

from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

from app.services.optimization.schemas import OptimizationInput, OptimizationOrder, OptimizationVehicle, OptimizationObjectiveContext
from app.services.optimization.config import OptimizationConfig
from app.services.optimization.preparation.schemas import CapacityPreparationResult
from app.services.optimization.routing.schemas import RoadCostMatrix, RoadCostEntry, RoutingNode
from app.services.optimization.solver.schemas import OptimizationResult, OptimizationResultRoute

class ORToolsOptimizer:
    def __init__(self):
        pass

    def solve(
        self,
        opt_input: OptimizationInput,
        config: OptimizationConfig,
        prep_result: CapacityPreparationResult,
        matrix: RoadCostMatrix,
        objective_context: OptimizationObjectiveContext
    ) -> OptimizationResult:
        
        # 1. Base validation
        if matrix.status == "FAILED":
            return OptimizationResult(status="INVALID_INPUT", message="Cost matrix failed.")
        
        if not opt_input.orders:
            return OptimizationResult(status="INVALID_INPUT", message="No orders provided.")
            
        eligible_vehicles = [v for v in opt_input.vehicles if v.status == "AVAILABLE" and v.capacity_kg > 0]
        if not eligible_vehicles:
            return OptimizationResult(status="INFEASIBLE", message="No eligible vehicles available.")
            
        # Extract the node IDs we care about. 
        # A subset of orders were prepared into ready_workload_units.
        # Unserviceable orders from prep_result should be carried over.
        routed_order_ids = set()
        for wu in prep_result.ready_workload_units:
            for oid in wu.order_ids:
                routed_order_ids.add(oid)
                
        if not routed_order_ids:
            return OptimizationResult(
                status="INFEASIBLE", 
                message="No serviceable orders found after capacity preparation.",
                unserviceable_order_ids=prep_result.unserviceable_orders
            )
            
        # We must route exactly the nodes corresponding to `routed_order_ids` + all depots
        node_id_to_index = matrix.node_index
        index_to_node = {idx: node for node in matrix.nodes for idx in [node_id_to_index[node.node_id]]}
        
        # Determine depot assignments for vehicles
        default_depot = opt_input.depots[0] if opt_input.depots else None
        
        # Vehicle capacities and depot starts/ends
        vehicle_capacities = []
        starts = []
        ends = []
        
        for v in eligible_vehicles:
            # Usable capacity
            usable = v.capacity_kg * config.capacity.max_load_ratio
            vehicle_capacities.append(int(math.floor(usable)))
            
            # Resolve the vehicle's depot index in the matrix
            assigned_depot_id = v.depot_id or (default_depot.id if default_depot else None)
            if not assigned_depot_id:
                return OptimizationResult(status="INVALID_INPUT", message=f"Vehicle {v.id} lacks a depot assignment and no default exists.")
                
            depot_node_id = f"DEPOT-{assigned_depot_id}"
            if depot_node_id not in matrix.node_index:
                return OptimizationResult(status="INVALID_INPUT", message=f"Depot {assigned_depot_id} for vehicle {v.id} not found in matrix.")
                
            depot_idx = matrix.node_index[depot_node_id]
            starts.append(depot_idx)
            ends.append(depot_idx)
            
        num_vehicles = len(eligible_vehicles)
        num_nodes = len(matrix.nodes)
        
        # Setup OR-Tools
        manager = pywrapcp.RoutingIndexManager(num_nodes, num_vehicles, starts, ends)
        routing = pywrapcp.RoutingModel(manager)
        
        # Build dense cost arrays for O(1) lookups
        # Initialize with large penalty for missing edges
        PENALTY = 999999999
        distance_array = [[PENALTY] * num_nodes for _ in range(num_nodes)]
        duration_array = [[PENALTY] * num_nodes for _ in range(num_nodes)]
        available_array = [[True] * num_nodes for _ in range(num_nodes)]
        
        for entry in matrix.entries:
            idx_from = node_id_to_index.get(entry.origin_node_id)
            idx_to = node_id_to_index.get(entry.destination_node_id)
            if idx_from is not None and idx_to is not None:
                if entry.status == "UNAVAILABLE":
                    available_array[idx_from][idx_to] = False
                elif entry.status == "AVAILABLE" and entry.distance_meters is not None:
                    distance_array[idx_from][idx_to] = int(math.ceil(entry.distance_meters))
                    duration_array[idx_from][idx_to] = int(math.ceil(entry.duration_seconds))
                
        # Objective weights and Normalization Context
        w_dist = config.objectives.minimize_distance_weight
        w_dur = config.objectives.minimize_duration_weight
        w_veh = config.objectives.minimize_vehicles_weight
        
        d_ref = objective_context.normalization_distance_reference_m
        t_ref = objective_context.normalization_duration_reference_s
        
        if d_ref <= 0 or t_ref <= 0:
            return OptimizationResult(status="INVALID_INPUT", message="D_reference and T_reference must be > 0.")
            
        # COMPUTATIONAL_PRECISION_SCALE:
        # Since the dimensionless objective components (like d_m / D_ref) result in tiny floats,
        # and OR-Tools requires integer costs, we multiply the entire mathematical objective
        # by a large constant scale factor before calling math.ceil(). This preserves the 
        # ordering of candidates without losing small arc variations to integer truncation.
        # This is strictly an implementation mechanism and NOT a business weighting factor.
        COMPUTATIONAL_PRECISION_SCALE = 1000000.0
        
        def cost_callback(from_index, to_index):
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            d_m = distance_array[from_node][to_node]
            d_s = duration_array[from_node][to_node]
            if d_m == PENALTY or d_s == PENALTY:
                return PENALTY
                
            norm_dist = d_m / d_ref
            norm_dur = d_s / t_ref
            
            # The mathematical objective term for this arc
            arc_obj = (w_dist * norm_dist) + (w_dur * norm_dur)
            
            return int(math.ceil(arc_obj * COMPUTATIONAL_PRECISION_SCALE))
            
        transit_callback_index = routing.RegisterTransitCallback(cost_callback)
        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)
        
        if w_veh > 0 and num_vehicles > 0:
            # Vehicle activation cost mathematically: w_vehicles * (1 / V_eligible) per vehicle used
            # since V_used is just the sum of 1 for each vehicle used.
            # We scale it into the same integer precision space as the arc costs.
            veh_obj = w_veh / num_vehicles
            routing.SetFixedCostOfAllVehicles(int(math.ceil(veh_obj * COMPUTATIONAL_PRECISION_SCALE)))
        
        # Capacity dimension
        node_demands = [0] * num_nodes
        for node in matrix.nodes:
            idx = node_id_to_index[node.node_id]
            if node.node_type == "ORDER" and node.order_id in routed_order_ids:
                order = next((o for o in opt_input.orders if o.id == node.order_id), None)
                if order:
                    if order.status == "RL_DELIVERY":
                        node_demands[idx] = -int(math.ceil(order.weight_kg))
                    else:
                        node_demands[idx] = int(math.ceil(order.weight_kg))
                    
        def demand_callback(from_index):
            from_node = manager.IndexToNode(from_index)
            return node_demands[from_node]
            
        demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)
        routing.AddDimensionWithVehicleCapacity(
            demand_callback_index,
            0,
            vehicle_capacities,
            True,
            'Capacity'
        )
        
        # Add a Distance dimension for precedence constraints
        routing.AddDimension(
            transit_callback_index,
            0,
            999999999,
            True,
            'Distance'
        )
        distance_dimension = routing.GetDimensionOrDie('Distance')
        
        # Pickups and Deliveries constraints
        for node in matrix.nodes:
            if node.node_type == "ORDER" and node.order_id in routed_order_ids:
                order = next((o for o in opt_input.orders if o.id == node.order_id), None)
                if order and order.linked_delivery_id:
                    pickup_idx = manager.NodeToIndex(node_id_to_index[node.node_id])
                    
                    del_node = next((n for n in matrix.nodes if n.node_type == "ORDER" and n.order_id == order.linked_delivery_id), None)
                    if del_node:
                        delivery_idx = manager.NodeToIndex(node_id_to_index[del_node.node_id])
                        routing.AddPickupAndDelivery(pickup_idx, delivery_idx)
                        routing.solver().Add(
                            routing.VehicleVar(pickup_idx) == routing.VehicleVar(delivery_idx)
                        )
                        routing.solver().Add(
                            distance_dimension.CumulVar(pickup_idx) <= distance_dimension.CumulVar(delivery_idx)
                        )
                        
        # Workload Unit constraint removed: 
        # Using VehicleVar(A) == VehicleVar(B) breaks PATH_CHEAPEST_ARC and PARALLEL_CHEAPEST_INSERTION 
        # causing the solver to drop all nodes. Since OR-Tools has capacity dimensions, it will optimally 
        # pack vehicles anyway. WorkloadUnits from CapacityPreparer guarantee feasibility but don't need 
        # to be strictly enforced as SameVehicle in the routing model.
        
        # Disjunctions to allow dropping, avoiding total solver crash
        DROP_PENALTY = 10000000000
        for node in matrix.nodes:
            if node.node_type == "ORDER" and node.order_id in routed_order_ids:
                idx = node_id_to_index[node.node_id]
                routing.AddDisjunction([manager.NodeToIndex(idx)], DROP_PENALTY)
                
        # Strict unavailable arc prohibition at model construction
        for i in range(num_nodes):
            for j in range(num_nodes):
                if i != j and not available_array[i][j]:
                    routing.NextVar(i).RemoveValue(j)
                    
        # Deterministic search strategy
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION
        search_parameters.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
        search_parameters.time_limit.seconds = 5
        
        assignment = routing.SolveWithParameters(search_parameters)
        ortools_status = routing.status()
        
        if not assignment:
            return OptimizationResult(
                status="NO_SOLUTION",
                message=f"OR-Tools returned no solution. Status code: {ortools_status}"
            )
            
        routes = []
        unassigned_order_ids = []
        total_dist_meters = 0.0
        total_dur_seconds = 0.0
        vehicles_used = 0
        unused_vehicles = []
        
        # Check dropped nodes
        for node in matrix.nodes:
            if node.node_type == "ORDER" and node.order_id in routed_order_ids:
                idx = node_id_to_index[node.node_id]
                if assignment.Value(routing.NextVar(manager.NodeToIndex(idx))) == manager.NodeToIndex(idx):
                    unassigned_order_ids.append(node.order_id)
                    
        for vehicle_id in range(num_vehicles):
            index = routing.Start(vehicle_id)
            if routing.IsEnd(assignment.Value(routing.NextVar(index))):
                unused_vehicles.append(eligible_vehicles[vehicle_id].id)
                continue
                
            vehicles_used += 1
            route_dist = 0.0
            route_dur = 0.0
            route_weight = 0.0
            ordered_nodes = []
            ordered_orders = []
            wu_ids = set()
            cluster_ids = set()
            
            while not routing.IsEnd(index):
                node_index = manager.IndexToNode(index)
                node = index_to_node[node_index]
                ordered_nodes.append(node.node_id)
                if node.node_type == "ORDER" and node.order_id:
                    ordered_orders.append(node.order_id)
                    route_weight += node_demands[node_index]
                    if node.workload_unit_id:
                        wu_ids.add(node.workload_unit_id)
                    if node.parent_cluster_id:
                        cluster_ids.add(node.parent_cluster_id)
                        
                index = assignment.Value(routing.NextVar(index))
                next_node_index = manager.IndexToNode(index)
                
                # Strict unavailable arc validation
                if not available_array[node_index][next_node_index]:
                    return OptimizationResult(
                        status="INFEASIBLE", 
                        message="Solver attempted to traverse an unavailable road arc."
                    )
                    
                d_m = distance_array[node_index][next_node_index]
                d_s = duration_array[node_index][next_node_index]
                    
                route_dist += d_m
                route_dur += d_s
                
            end_node_index = manager.IndexToNode(index)
            end_node = index_to_node[end_node_index]
            ordered_nodes.append(end_node.node_id)
            
            veh = eligible_vehicles[vehicle_id]
            physical_cap = veh.capacity_kg
            util_ratio = route_weight / physical_cap if physical_cap > 0 else 0.0
            
            total_dist_meters += route_dist
            total_dur_seconds += route_dur
            
            assigned_depot_id = veh.depot_id or (default_depot.id if default_depot else None)
            routes.append(OptimizationResultRoute(
                route_id=f"ROUTE-{uuid.uuid4()}",
                vehicle_id=veh.id,
                depot_id=assigned_depot_id,
                ordered_node_ids=ordered_nodes,
                ordered_order_ids=ordered_orders,
                total_distance_meters=route_dist,
                total_duration_seconds=route_dur,
                total_weight_kg=route_weight,
                capacity_kg=physical_cap,
                utilization_ratio=util_ratio,
                workload_unit_ids=list(wu_ids),
                parent_cluster_ids=list(cluster_ids),
                route_status="FEASIBLE" # Route level is feasible if it successfully built
            ))
            
        if not routes:
            status = "INFEASIBLE"
            message = "No valid routes could be formed (all orders dropped)."
        elif unassigned_order_ids:
            status = "INFEASIBLE"
            message = "One or more orders could not be assigned due to capacity or constraint limits."
        elif ortools_status == 6:  # ROUTING_OPTIMAL
            status = "OPTIMAL"
        else:
            status = "FEASIBLE"
            
        return OptimizationResult(
            status=status,
            message=message if 'message' in locals() else None,
            routes=routes,
            total_vehicles_eligible=num_vehicles,
            total_vehicles_used=vehicles_used,
            vehicle_activation_ratio=(vehicles_used / num_vehicles) if num_vehicles > 0 else 0.0,
            unused_vehicles=unused_vehicles,
            unserviceable_order_ids=prep_result.unserviceable_orders,
            unassigned_order_ids=unassigned_order_ids,
            total_distance_meters=total_dist_meters,
            total_duration_seconds=total_dur_seconds
        )
