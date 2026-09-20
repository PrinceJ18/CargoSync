from typing import List, Dict, Any, Tuple
from uuid import UUID

from app.services.optimization.schemas import OptimizationInput, OptimizationOrder
from app.services.optimization.config import OptimizationConfig
from app.services.optimization.clustering.schemas import ClusteringResult
from app.services.optimization.validation.schemas import ClusterValidationResult, ValidatedCluster
from app.services.optimization.preparation.schemas import (
    CapacityPreparationResult,
    WorkloadUnit,
    UnserviceableOrder
)

class CapacityPreparer:
    def prepare(self, 
                opt_input: OptimizationInput, 
                clustering_result: ClusteringResult, 
                validation_result: ClusterValidationResult, 
                config: OptimizationConfig) -> CapacityPreparationResult:
        
        ready_workload_units: List[WorkloadUnit] = []
        unserviceable_orders: List[UnserviceableOrder] = []
        
        # Quick lookup for orders
        order_map: Dict[UUID, OptimizationOrder] = {o.id: o for o in opt_input.orders}
        
        # Calculate max usable vehicle capacity
        max_usable_capacity = 0.0
        if opt_input.vehicles:
            max_usable_capacity = max(v.capacity_kg for v in opt_input.vehicles) * config.capacity.max_load_ratio
            
        for val_cluster in validation_result.validated_clusters:
            # 1. No Eligible Vehicles
            if val_cluster.validation_status == "NO_ELIGIBLE_VEHICLE":
                for oid in val_cluster.original_cluster.order_ids:
                    order = order_map.get(oid)
                    if order:
                        unserviceable_orders.append(UnserviceableOrder(
                            order_id=order.id,
                            reference_number=order.reference_number,
                            required_weight_kg=order.weight_kg,
                            maximum_usable_capacity_kg=max_usable_capacity if max_usable_capacity > 0 else None,
                            reason_code="NO_ELIGIBLE_VEHICLE"
                        ))
                continue
            
            # 2. Cluster Fits (or capacity enforcement is disabled and we don't care)
            # A cluster might be flagged INFEASIBLE_CAPACITY if enforcement is ON and it's too big.
            if val_cluster.validation_status != "INFEASIBLE_CAPACITY":
                ready_workload_units.append(WorkloadUnit(
                    workload_unit_id=f"{val_cluster.cluster_id}-W01",
                    parent_cluster_id=val_cluster.cluster_id,
                    order_ids=list(val_cluster.original_cluster.order_ids),
                    order_count=val_cluster.original_cluster.order_count,
                    total_weight_kg=val_cluster.original_cluster.total_weight_kg,
                    capacity_limit_kg=max_usable_capacity,
                    utilization_ratio=(val_cluster.original_cluster.total_weight_kg / max_usable_capacity) if max_usable_capacity > 0 else 0.0,
                    centroid_latitude=val_cluster.original_cluster.centroid_latitude,
                    centroid_longitude=val_cluster.original_cluster.centroid_longitude,
                    status="READY",
                    split_reason=None
                ))
                continue
                
            # 3. Cluster Exceeds Capacity -> Deterministic Split
            # Gather cluster orders
            cluster_orders = []
            for oid in val_cluster.original_cluster.order_ids:
                order = order_map.get(oid)
                if order:
                    cluster_orders.append(order)
            
            # Sort: descending weight, then ascending ID (for deterministic tie-breaking)
            cluster_orders.sort(key=lambda o: (-o.weight_kg, str(o.id)))
            
            # Bins for splitting
            # Each bin is a list of orders
            bins: List[List[OptimizationOrder]] = []
            
            for order in cluster_orders:
                # 3a. Order itself exceeds max capacity
                if order.weight_kg > max_usable_capacity:
                    unserviceable_orders.append(UnserviceableOrder(
                        order_id=order.id,
                        reference_number=order.reference_number,
                        required_weight_kg=order.weight_kg,
                        maximum_usable_capacity_kg=max_usable_capacity,
                        reason_code="UNSERVICEABLE_ORDER_CAPACITY"
                    ))
                    continue
                
                # 3b. Try to fit order into an existing bin (First Fit strategy)
                placed = False
                for b in bins:
                    bin_weight = sum(o.weight_kg for o in b)
                    if bin_weight + order.weight_kg <= max_usable_capacity:
                        b.append(order)
                        placed = True
                        break
                
                # 3c. If it didn't fit, create a new bin
                if not placed:
                    bins.append([order])
            
            # Create WorkloadUnits from bins
            for i, b in enumerate(bins):
                b_weight = sum(o.weight_kg for o in b)
                b_order_ids = [o.id for o in b]
                
                # Calculate new centroid for this bin
                c_lat = sum(o.destination_latitude for o in b) / len(b)
                c_lon = sum(o.destination_longitude for o in b) / len(b)
                
                ready_workload_units.append(WorkloadUnit(
                    workload_unit_id=f"{val_cluster.cluster_id}-W{i+1:02d}",
                    parent_cluster_id=val_cluster.cluster_id,
                    order_ids=b_order_ids,
                    order_count=len(b),
                    total_weight_kg=b_weight,
                    capacity_limit_kg=max_usable_capacity,
                    utilization_ratio=b_weight / max_usable_capacity if max_usable_capacity > 0 else 0.0,
                    centroid_latitude=c_lat,
                    centroid_longitude=c_lon,
                    status="SPLIT",
                    split_reason="CAPACITY_EXCEEDED"
                ))

        # Sort the overall results for absolute determinism
        ready_workload_units.sort(key=lambda w: w.workload_unit_id)
        unserviceable_orders.sort(key=lambda u: str(u.order_id))

        return CapacityPreparationResult(
            ready_workload_units=ready_workload_units,
            unserviceable_orders=unserviceable_orders,
            noise_order_ids=list(clustering_result.noise_order_ids),
            unclustered_order_ids=list(clustering_result.unclustered_order_ids),
            clustering_status=clustering_result.clustering_status
        )
