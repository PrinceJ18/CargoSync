from typing import List, Dict
from uuid import UUID

from app.services.optimization.schemas import OptimizationInput, OptimizationOrder
from app.services.optimization.config import OptimizationConfig
from app.services.optimization.clustering.schemas import ClusteringResult, Cluster
from app.services.optimization.clustering.distance import HaversineDistanceProvider
from app.services.optimization.validation.schemas import (
    ClusterValidationResult, 
    ValidatedCluster, 
    ValidationReason
)

class ClusterValidator:
    def __init__(self):
        self.distance_provider = HaversineDistanceProvider()

    def validate(self, 
                 clustering_result: ClusteringResult, 
                 opt_input: OptimizationInput, 
                 config: OptimizationConfig) -> ClusterValidationResult:
        
        validated_clusters: List[ValidatedCluster] = []
        
        # Build order lookup map for quick access
        order_map: Dict[UUID, OptimizationOrder] = {o.id: o for o in opt_input.orders}
        
        # Determine fleet capacity metrics
        max_vehicle_capacity = 0.0
        if opt_input.vehicles:
            # Multiply by load ratio right away to get effective available capacity
            max_vehicle_capacity = max(v.capacity_kg for v in opt_input.vehicles) * config.capacity.max_load_ratio

        for cluster in clustering_result.clusters:
            reasons: List[ValidationReason] = []
            status = "NEEDS_FURTHER_ROUTE_VALIDATION"
            
            # 1. Capacity Feasibility
            required_capacity = cluster.total_weight_kg
            capacity_ratio = None
            
            if not opt_input.vehicles:
                status = "NO_ELIGIBLE_VEHICLE"
                reasons.append(ValidationReason(
                    code="NO_ELIGIBLE_VEHICLE",
                    message="No vehicles available in the optimization input.",
                    details={"cluster_id": cluster.cluster_id}
                ))
            elif config.capacity.enforce_capacity:
                if max_vehicle_capacity > 0:
                    capacity_ratio = required_capacity / max_vehicle_capacity
                
                if required_capacity > max_vehicle_capacity:
                    status = "INFEASIBLE_CAPACITY"
                    reasons.append(ValidationReason(
                        code="CAPACITY_EXCEEDED",
                        message=f"Cluster weight ({required_capacity} kg) exceeds maximum available fleet capacity ({max_vehicle_capacity} kg).",
                        details={
                            "required_capacity_kg": required_capacity,
                            "maximum_available_capacity_kg": max_vehicle_capacity,
                            "max_load_ratio": config.capacity.max_load_ratio
                        }
                    ))
            
            # 2. Time-Window Validation (Order level)
            if config.time_windows.enforce_time_windows:
                has_invalid_windows = False
                for oid in cluster.order_ids:
                    order = order_map.get(oid)
                    if order:
                        start = order.delivery_window_start
                        end = order.delivery_window_end
                        if start and end and start > end:
                            has_invalid_windows = True
                            reasons.append(ValidationReason(
                                code="INVALID_TIME_WINDOW",
                                message=f"Order {order.reference_number} has an end time before its start time.",
                                details={
                                    "order_id": str(order.id),
                                    "start": start.isoformat(),
                                    "end": end.isoformat()
                                }
                            ))
                if has_invalid_windows and status != "INFEASIBLE_CAPACITY" and status != "NO_ELIGIBLE_VEHICLE":
                    status = "INVALID_TIME_WINDOW"
                    
            # 3. Geographic Distances (Haversine straight-line from centroid)
            max_dist = 0.0
            centroid = (cluster.centroid_latitude, cluster.centroid_longitude)
            for oid in cluster.order_ids:
                order = order_map.get(oid)
                if order:
                    pt = (order.destination_latitude, order.destination_longitude)
                    dist = self.distance_provider.distance_meters(centroid, pt)
                    if dist > max_dist:
                        max_dist = dist
                        
            # Note: Road-network routing distance is explicitly deferred to later stages.
            # We don't fail geographic validation here unless it's extreme, but config only 
            # specifies max_route_distance_km which is road-network based, so we defer it.

            val_cluster = ValidatedCluster(
                cluster_id=cluster.cluster_id,
                original_cluster=cluster,
                validation_status=status,
                validation_reasons=reasons,
                required_capacity_kg=required_capacity,
                maximum_available_capacity_kg=max_vehicle_capacity if opt_input.vehicles else None,
                capacity_ratio=capacity_ratio,
                max_distance_from_centroid_meters=max_dist
            )
            validated_clusters.append(val_cluster)

        return ClusterValidationResult(
            validated_clusters=validated_clusters,
            noise_order_ids=clustering_result.noise_order_ids,
            unclustered_order_ids=clustering_result.unclustered_order_ids,
            total_input_orders=clustering_result.total_input_orders,
            clustering_status=clustering_result.clustering_status
        )
