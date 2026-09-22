import logging
from typing import Optional, List, Dict
from uuid import UUID
from sqlalchemy.orm import Session
from datetime import datetime
from geoalchemy2.elements import WKTElement
import json

from app.schemas.optimization import (
    OptimizationRunRequest, 
    OptimizationRunResponse,
    OptimizationDiagnostic,
    OptimizationMetricsResult,
    OptimizationMetric,
    OptimizationSavings
)

from app.services.routing.dataset_builder import RoutingDatasetBuilder
from app.services.optimization.input_builder import build_optimization_input
from app.services.optimization.exceptions import EmptyWorkloadError, OptimizationInputError
from app.services.routing.exceptions import RoutingBaseException

from app.services.optimization.clustering.engine import ClusteringEngine
from app.services.optimization.clustering.distance import HaversineDistanceProvider
from app.services.optimization.validation.validator import ClusterValidator
from app.services.optimization.preparation.preparer import CapacityPreparer
from app.services.optimization.routing.matrix_builder import RoadCostMatrixBuilder
from app.services.optimization.baseline.calculator import BaselineCalculator
from app.services.optimization.baseline.schemas import BaselineInput, BaselineOrder
from app.services.optimization.routing.schemas import RoutingNode
from app.services.routing.schemas import Coordinate
from app.services.optimization.solver.solver import ORToolsOptimizer
from app.services.optimization.schemas import OptimizationObjectiveContext
from app.services.optimization.metrics.calculator import MetricsCalculator
from app.services.optimization.metrics.schemas import MetricsInput
from app.services.optimization.config import resolve_optimization_config, OptimizationConfigOverrides
from app.services.routing.routing_service import RoutingService
from app.services.routing.osrm_client import OSRMClient
from app.db.models import OptimizationRun, OptimizedRoute, OptimizedRouteStop
from app.services.optimization.geometry.extractor import RouteGeometryExtractor
from app.services.optimization.solver.schemas import OptimizationResult
from app.services.optimization.return_loads.schemas import ReturnLoadOpportunity, ReturnLoadAssignmentStatus
from app.services.optimization.return_loads.generator import evaluate_return_load_candidates
from app.services.optimization.return_loads.assigner import assign_return_loads
from app.services.optimization.return_loads.reoptimizer import reoptimize_routes_with_return_loads
from app.db.models import ReturnLoad, ReturnLoadAssignment as DBReturnLoadAssignment
from geoalchemy2.shape import to_shape
logger = logging.getLogger(__name__)

class OptimizationOrchestrator:
    def __init__(self, db: Session):
        self.db = db
        # Initialize the routing abstraction
        osrm_client = OSRMClient()
        self.routing_service = RoutingService(client=osrm_client)

    async def run_optimization(self, request: OptimizationRunRequest) -> OptimizationRunResponse:
        import uuid
        run_id = uuid.uuid4()
        
        diagnostics: List[OptimizationDiagnostic] = []
        
        # Determine operator scope
        operator_scope = request.operator_ids[0] if request.operator_ids and len(request.operator_ids) > 0 else None
        
        try:
            # Resolve config
            opt_config = resolve_optimization_config(scenario=request.scenario_id, overrides=None)

            # 1. VALIDATE_ORDERS (Dataset Builder & Input Builder)
            dataset_builder = RoutingDatasetBuilder(self.db)
            dataset = dataset_builder.build_dataset(scenario=request.scenario_id, operator_id=operator_scope)
            
            for issue in dataset.issues:
                diagnostics.append(OptimizationDiagnostic(
                    level=issue.severity,
                    message=issue.reason,
                    record_id=str(issue.record_id),
                    record_type=issue.record_type
                ))
                
            opt_input = build_optimization_input(dataset)
            for issue in opt_input.source_issues:
                diagnostics.append(OptimizationDiagnostic(
                    level=issue.severity,
                    message=issue.reason,
                    record_id=str(issue.record_id),
                    record_type=issue.record_type
                ))
            
            # 2. CLUSTER_ORDERS
            distance_provider = HaversineDistanceProvider()
            clusterer = ClusteringEngine(distance_provider=distance_provider)
            cluster_result = clusterer.run_clustering(opt_input=opt_input, config=opt_config)
            
            # 3. VALIDATE_CLUSTERS
            validator = ClusterValidator()
            val_result = validator.validate(clustering_result=cluster_result, opt_input=opt_input, config=opt_config)
            
            for val_cluster in val_result.validated_clusters:
                for diag in val_cluster.validation_reasons:
                    diagnostics.append(OptimizationDiagnostic(
                        level="WARNING",
                        message=diag.message,
                        record_type="Cluster"
                    ))
                
            # 4. PREPARE_FLEET
            preparer = CapacityPreparer()
            prep_result = preparer.prepare(
                opt_input=opt_input,
                clustering_result=cluster_result,
                validation_result=val_result,
                config=opt_config
            )
            
            if not prep_result.ready_workload_units:
                return OptimizationRunResponse(
                    run_id=run_id,
                    status="FAILED",
                    scenario=request.scenario_id,
                    diagnostics=diagnostics + [OptimizationDiagnostic(level="ERROR", message="No feasible cluster assignments found.")],
                )
                
            # 5. BUILD_ROUTING_MATRIX
            matrix_builder = RoadCostMatrixBuilder(self.routing_service)
            
            # 6. CALCULATE_BASELINE
            feasible_order_ids = set()
            for wu in prep_result.ready_workload_units:
                feasible_order_ids.update(wu.order_ids)
                
            feasible_orders = [o for o in opt_input.orders if o.id in feasible_order_ids]
            baseline_orders = [
                BaselineOrder(
                    order_id=o.id,
                    operator_id=o.operator_id,
                    origin_depot_id=o.origin_depot_id,
                    origin_depot_latitude=next(d.latitude for d in opt_input.depots if d.id == o.origin_depot_id),
                    origin_depot_longitude=next(d.longitude for d in opt_input.depots if d.id == o.origin_depot_id),
                    destination_latitude=o.destination_latitude,
                    destination_longitude=o.destination_longitude
                ) for o in feasible_orders
            ]
            
            baseline_calc = BaselineCalculator(self.routing_service)
            baseline_res = await baseline_calc.calculate_baseline(BaselineInput(orders=baseline_orders))
            
            objective_context = OptimizationObjectiveContext(
                normalization_distance_reference_m=baseline_res.distance_reference_m,
                normalization_duration_reference_s=baseline_res.duration_reference_s
            )
            
            # 7. OPTIMIZE_ROUTES
            solver = ORToolsOptimizer()
            final_routes = []
            solver_status = "OPTIMAL"
            
            optimized_successful_order_ids = []
            
            matrix_result = await matrix_builder.build(
                opt_input=opt_input,
                preparation_result=prep_result,
                config=opt_config
            )
            
            solve_result = solver.solve(
                opt_input=opt_input,
                config=opt_config,
                prep_result=prep_result,
                matrix=matrix_result,
                objective_context=objective_context
            )
            
            if solve_result.status not in ["OPTIMAL", "FEASIBLE"]:
                diagnostics.append(OptimizationDiagnostic(
                    level="WARNING",
                    message=f"Solver returned {solve_result.status}: {solve_result.message}",
                    record_type="OptimizationRun"
                ))
                solver_status = "FAILED"
            else:
                final_routes.extend(solve_result.routes)
                for route in solve_result.routes:
                    optimized_successful_order_ids.extend(route.ordered_order_ids)
            
            # 8. MATCH_RETURN_LOADS
            rl_query = self.db.query(ReturnLoad).filter(ReturnLoad.scenario == request.scenario_id, ReturnLoad.status == 'PENDING')
            if operator_scope:
                rl_query = rl_query.filter(ReturnLoad.operator_id == operator_scope)
            rl_records = rl_query.all()
            for rl in rl_records:
                p_shp = to_shape(rl.pickup_location)
                d_shp = to_shape(rl.delivery_location)
                opportunities.append(ReturnLoadOpportunity(
                    return_load_id=rl.id,
                    operator_id=rl.operator_id,
                    pickup_latitude=p_shp.y,
                    pickup_longitude=p_shp.x,
                    delivery_latitude=d_shp.y,
                    delivery_longitude=d_shp.x,
                    weight_kg=float(rl.weight_kg)
                ))
            
            all_candidates = []
            for route in final_routes:
                depot = next((d for d in opt_input.depots if d.id == route.depot_id), None)
                if not depot: continue
                last_order_id = route.ordered_order_ids[-1] if route.ordered_order_ids else None
                last_order = next((o for o in opt_input.orders if o.id == last_order_id), None)
                final_coord = Coordinate(latitude=last_order.destination_latitude, longitude=last_order.destination_longitude) if last_order else Coordinate(latitude=depot.latitude, longitude=depot.longitude)
                
                candidates = await evaluate_return_load_candidates(
                    route=route,
                    opportunities=opportunities,
                    final_delivery_coord=final_coord,
                    depot_coord=Coordinate(latitude=depot.latitude, longitude=depot.longitude),
                    osrm_client=self.routing_service.client
                )
                from app.services.optimization.return_loads.schemas import ReturnLoadCandidateStatus
                all_candidates.extend([c for c in candidates if c.eligibility_status == ReturnLoadCandidateStatus.ELIGIBLE])
            
            rl_assignments_domain = assign_return_loads(all_candidates)
            
            # Reoptimize with return loads
            reopt_result = await reoptimize_routes_with_return_loads(
                opt_input=opt_input,
                opt_result=OptimizationResult(status=solver_status, routes=final_routes),
                opportunities=opportunities,
                assignments=rl_assignments_domain,
                routing_service=self.routing_service,
                config=opt_config,
                objective_context=objective_context
            )
            
            # Update final_routes to use the reoptimized routes
            final_routes = reopt_result.routes
            
            # Create a map for quick lookup of return loads per route (supports multiple)
            rl_assigned_to_route: Dict[str, List[str]] = {}
            for a in rl_assignments_domain:
                if a.assignment_status == ReturnLoadAssignmentStatus.ASSIGNED:
                    rl_assigned_to_route.setdefault(a.route_id, []).append(str(a.return_load_id))

            enriched_routes = []
            for route in final_routes:
                enriched_routes.append({
                    "vehicle_id": str(route.vehicle_id),
                    "total_distance_meters": route.total_distance_meters,
                    "total_duration_seconds": route.total_duration_seconds,
                    "stops": [{"order_id": str(o_id)} for o_id in route.ordered_order_ids],
                    "geometry": {}, 
                    "return_load": rl_assigned_to_route.get(route.route_id, [None])[0]
                })
                
            # 9. CALCULATE_SAVINGS
            metrics_calc = MetricsCalculator()
            total_opt_distance = sum(r["total_distance_meters"] for r in enriched_routes)
            total_opt_duration = sum(r["total_duration_seconds"] for r in enriched_routes)
            
            savings_input = MetricsInput(
                baseline_successful_order_ids=[o.order_id for o in baseline_orders],
                optimized_successful_order_ids=optimized_successful_order_ids,
                aligned_baseline_distance_meters=baseline_res.distance_reference_m,
                aligned_optimized_distance_meters=total_opt_distance,
                cost_per_km_inr=opt_config.metrics.cost_per_km_inr,
                emission_factor_kg_per_km=opt_config.metrics.emission_factor_kg_per_km
            )
            
            savings_result = metrics_calc.calculate_savings(savings_input)
            
            for diag in savings_result.diagnostics:
                diagnostics.append(OptimizationDiagnostic(
                    level="WARNING",
                    message=diag,
                    record_type="Metrics"
                ))
                
            metrics_output = OptimizationMetricsResult(
                baseline=OptimizationMetric(
                    distance_meters=baseline_res.distance_reference_m,
                    duration_seconds=baseline_res.duration_reference_s,
                    vehicles_used=baseline_res.successfully_routed_order_count
                ),
                optimized=OptimizationMetric(
                    distance_meters=total_opt_distance,
                    duration_seconds=total_opt_duration,
                    vehicles_used=len(enriched_routes)
                ),
                savings=OptimizationSavings(
                    comparable_workload_count=savings_result.comparable_workload_count,
                    distance_saved_meters=savings_result.distance_saved_meters or 0.0,
                    cost_saved_inr=savings_result.cost_saved_inr,
                    co2_saved_kg=savings_result.co2_saved_kg
                )
            )
            
            # 10. PERSIST_RESULTS
            run_status = "COMPLETED" if solver_status == "OPTIMAL" else "PARTIAL"
            
            # Extract final route geometry
            extractor = RouteGeometryExtractor(self.routing_service)
            final_opt_result = OptimizationResult(
                status=solver_status,
                routes=final_routes
            )
            extraction_result = await extractor.extract_geometry(
                optimization_result=final_opt_result, 
                optimization_input=opt_input
            )
            geometry_map = {r.route_id: r for r in extraction_result.routes}
            
            run_record = OptimizationRun(
                id=run_id,
                operator_id=operator_scope,
                scenario=request.scenario_id,
                status=run_status,
                solver_status=solver_status,
                config_snapshot=opt_config.model_dump(mode='json'),
                diagnostics=[d.model_dump(mode='json') for d in diagnostics],
                baseline_distance_meters=baseline_res.distance_reference_m,
                baseline_duration_seconds=baseline_res.duration_reference_s,
                baseline_vehicles_used=baseline_res.successfully_routed_order_count,
                optimized_distance_meters=total_opt_distance,
                optimized_duration_seconds=total_opt_duration,
                optimized_vehicles_used=len(enriched_routes),
                comparable_workload_count=savings_result.comparable_workload_count,
                cost_saved_inr=savings_result.cost_saved_inr,
                co2_saved_kg=savings_result.co2_saved_kg
            )
            self.db.add(run_record)
            self.db.flush()
            
            order_map = {o.id: o for o in opt_input.orders}
            
            for idx, route in enumerate(final_routes):
                import uuid
                route_id = uuid.uuid4()
                
                geom_data = geometry_map.get(route.route_id)
                if not geom_data or geom_data.status != "SUCCESS" or not geom_data.geometry:
                    # Explicit geometry failure handling - do NOT write placeholder
                    raise RoutingBaseException(f"Route geometry extraction failed: {geom_data.error_message if geom_data else 'Unknown geometry error'}")
                
                # Convert GeoJSON LineString to WKT LINESTRING
                coords = geom_data.geometry.get("coordinates", [])
                if len(coords) < 2:
                    raise RoutingBaseException(f"Extracted route geometry must have at least 2 points.")
                
                wkt_coords = ", ".join([f"{c[0]} {c[1]}" for c in coords])
                real_wkt = f"LINESTRING({wkt_coords})"
                
                # Use first assigned return_load_id for the denormalized route-level column
                route_rl_ids = rl_assigned_to_route.get(route.route_id, [])
                route_record = OptimizedRoute(
                    id=route_id,
                    run_id=run_id,
                    vehicle_id=route.vehicle_id,
                    total_distance_meters=route.total_distance_meters,
                    total_duration_seconds=route.total_duration_seconds,
                    geometry=WKTElement(real_wkt, srid=4326),
                    return_load_id=route_rl_ids[0] if route_rl_ids else None
                )
                self.db.add(route_record)
                
                # Add route stops
                depot = next((d for d in opt_input.depots if d.id == route.depot_id), None)
                seq_idx = 0
                
                if depot:
                    start_depot_stop = OptimizedRouteStop(
                        route_id=route_id,
                        sequence_index=seq_idx,
                        stop_type="DEPOT_START",
                        order_id=None,
                        return_load_id=None,
                        location=WKTElement(f"POINT({depot.longitude} {depot.latitude})", srid=4326)
                    )
                    self.db.add(start_depot_stop)
                    seq_idx += 1

                for o_id in route.ordered_order_ids:
                    order = order_map.get(o_id)
                    if order:
                        stop_type = "ORDER"
                        db_order_id = o_id
                        db_return_load_id = None
                        
                        if order.status == "RL_PICKUP":
                            stop_type = "RETURN_PICKUP"
                            db_order_id = None
                            # Use authoritative return_load_id field if available, fall back to reference_number parsing
                            db_return_load_id = str(order.return_load_id) if order.return_load_id else order.reference_number.replace("RL-PICKUP-", "")
                        elif order.status == "RL_DELIVERY":
                            stop_type = "RETURN_DELIVERY"
                            db_order_id = None
                            db_return_load_id = str(order.return_load_id) if order.return_load_id else order.reference_number.replace("RL-DELIVERY-", "")
                            
                        stop_record = OptimizedRouteStop(
                            route_id=route_id,
                            sequence_index=seq_idx,
                            stop_type=stop_type,
                            order_id=db_order_id,
                            return_load_id=db_return_load_id,
                            location=WKTElement(f"POINT({order.destination_longitude} {order.destination_latitude})", srid=4326)
                        )
                        self.db.add(stop_record)
                        seq_idx += 1
                        
                if depot:
                    end_depot_stop = OptimizedRouteStop(
                        route_id=route_id,
                        sequence_index=seq_idx,
                        stop_type="DEPOT_END",
                        order_id=None,
                        return_load_id=None,
                        location=WKTElement(f"POINT({depot.longitude} {depot.latitude})", srid=4326)
                    )
                    self.db.add(end_depot_stop)
                        
                # Add return load assignment for this route if any
                for a in rl_assignments_domain:
                    if a.route_id == route.route_id:
                        db_a = DBReturnLoadAssignment(
                            id=uuid.uuid4(),
                            run_id=run_id,
                            route_id=route_id, 
                            vehicle_id=a.vehicle_id,
                            return_load_id=a.return_load_id,
                            assignment_status=a.assignment_status.value,
                            incremental_detour_meters=a.incremental_detour_meters,
                            incremental_duration_seconds=a.incremental_duration_seconds
                        )
                        self.db.add(db_a)
                
            self.db.commit()

            return OptimizationRunResponse(
                run_id=run_id,
                status=run_status,
                scenario=request.scenario_id,
                solver_status=solver_status,
                diagnostics=diagnostics,
                metrics=metrics_output,
                routes=enriched_routes
            )
            
        except EmptyWorkloadError as e:
            self.db.rollback()
            run_record = OptimizationRun(
                id=run_id, operator_id=operator_scope, scenario=request.scenario_id,
                status="FAILED", config_snapshot={}, diagnostics=[{"level": "ERROR", "message": str(e)}]
            )
            self.db.add(run_record)
            self.db.commit()
            return OptimizationRunResponse(
                run_id=run_id,
                status="FAILED",
                scenario=request.scenario_id,
                diagnostics=diagnostics + [OptimizationDiagnostic(level="ERROR", message=str(e))],
            )
        except OptimizationInputError as e:
            self.db.rollback()
            run_record = OptimizationRun(
                id=run_id, operator_id=operator_scope, scenario=request.scenario_id,
                status="FAILED", config_snapshot={}, diagnostics=[{"level": "ERROR", "message": str(e)}]
            )
            self.db.add(run_record)
            self.db.commit()
            return OptimizationRunResponse(
                run_id=run_id,
                status="FAILED",
                scenario=request.scenario_id,
                diagnostics=diagnostics + [OptimizationDiagnostic(level="ERROR", message=str(e))],
            )
        except RoutingBaseException as e:
            self.db.rollback()
            run_record = OptimizationRun(
                id=run_id, operator_id=operator_scope, scenario=request.scenario_id,
                status="FAILED", config_snapshot={}, diagnostics=[{"level": "ERROR", "message": f"Routing failure: {str(e)}"}]
            )
            self.db.add(run_record)
            self.db.commit()
            return OptimizationRunResponse(
                run_id=run_id,
                status="FAILED",
                scenario=request.scenario_id,
                diagnostics=diagnostics + [OptimizationDiagnostic(level="ERROR", message=f"Routing failure: {str(e)}")],
            )
        except Exception as e:
            logger.exception("Unexpected error during optimization orchestration")
            self.db.rollback()
            return OptimizationRunResponse(
                run_id=run_id,
                status="FAILED",
                scenario=request.scenario_id,
                diagnostics=diagnostics + [OptimizationDiagnostic(level="ERROR", message="An unexpected internal error occurred.")],
            )
