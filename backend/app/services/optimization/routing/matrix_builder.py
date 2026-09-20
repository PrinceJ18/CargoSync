import uuid
from typing import List, Dict, Tuple, Optional

from app.services.routing.routing_service import RoutingService
from app.services.routing.schemas import Coordinate, MatrixRequest
from app.services.routing.exceptions import RoutingBaseException
from app.services.optimization.schemas import OptimizationInput
from app.services.optimization.config import OptimizationConfig
from app.services.optimization.preparation.schemas import CapacityPreparationResult
from app.services.optimization.routing.schemas import (
    RoutingNode,
    RoadCostEntry,
    RoadCostMatrix
)

class RoadCostMatrixBuilder:
    def __init__(self, routing_service: RoutingService):
        self.routing_service = routing_service
        
    async def build(
        self,
        opt_input: OptimizationInput,
        preparation_result: CapacityPreparationResult,
        config: OptimizationConfig
    ) -> RoadCostMatrix:
        
        nodes: List[RoutingNode] = []
        
        # 1. Add Depot Nodes
        for depot in opt_input.depots:
            nodes.append(RoutingNode(
                node_id=f"DEPOT-{depot.id}",
                node_type="DEPOT",
                latitude=depot.latitude,
                longitude=depot.longitude,
                depot_id=depot.id
            ))
            
        # Quick lookup for orders
        order_map = {o.id: o for o in opt_input.orders}
        
        # 2. Add Order Nodes from ready workload units
        # We ensure deterministic ordering by sorting the workload units, 
        # and then sorting the orders inside them.
        for wu in sorted(preparation_result.ready_workload_units, key=lambda w: w.workload_unit_id):
            for oid in sorted(wu.order_ids, key=lambda x: str(x)):
                order = order_map.get(oid)
                if order:
                    nodes.append(RoutingNode(
                        node_id=f"ORDER-{order.id}",
                        node_type="ORDER",
                        latitude=order.destination_latitude,
                        longitude=order.destination_longitude,
                        order_id=order.id,
                        workload_unit_id=wu.workload_unit_id,
                        parent_cluster_id=wu.parent_cluster_id
                    ))
                    
        # Node index mapping
        node_index: Dict[str, int] = {node.node_id: idx for idx, node in enumerate(nodes)}
        
        # Deduplicate coordinates to avoid redundant routing calls
        unique_coords: List[Coordinate] = []
        coord_to_unique_idx: Dict[Tuple[float, float], int] = {}
        
        for node in nodes:
            # Rounding to 6 decimals to avoid tiny float differences counting as distinct
            # but OSRM takes floats. We use exactly what's given.
            key = (node.latitude, node.longitude)
            if key not in coord_to_unique_idx:
                coord_to_unique_idx[key] = len(unique_coords)
                unique_coords.append(Coordinate(latitude=node.latitude, longitude=node.longitude))
                
        # Send matrix request
        if len(unique_coords) < 2:
            # Trivial matrix
            return self._build_trivial_matrix(nodes, node_index)
            
        try:
            req = MatrixRequest(locations=unique_coords)
            res = await self.routing_service.get_matrix(req)
            
            entries: List[RoadCostEntry] = []
            has_unavailable = False
            
            for i, origin in enumerate(nodes):
                for j, dest in enumerate(nodes):
                    if i == j:
                        # Self-edge is always 0
                        entries.append(RoadCostEntry(
                            origin_node_id=origin.node_id,
                            destination_node_id=dest.node_id,
                            distance_meters=0.0,
                            duration_seconds=0.0,
                            status="AVAILABLE"
                        ))
                    else:
                        u_idx_org = coord_to_unique_idx[(origin.latitude, origin.longitude)]
                        u_idx_dest = coord_to_unique_idx[(dest.latitude, dest.longitude)]
                        
                        dist = res.distances[u_idx_org][u_idx_dest] if u_idx_org < len(res.distances) and u_idx_dest < len(res.distances[u_idx_org]) else None
                        dur = res.durations[u_idx_org][u_idx_dest] if u_idx_org < len(res.durations) and u_idx_dest < len(res.durations[u_idx_org]) else None
                        
                        if dist is not None and dur is not None:
                            entries.append(RoadCostEntry(
                                origin_node_id=origin.node_id,
                                destination_node_id=dest.node_id,
                                distance_meters=dist,
                                duration_seconds=dur,
                                status="AVAILABLE"
                            ))
                        else:
                            has_unavailable = True
                            entries.append(RoadCostEntry(
                                origin_node_id=origin.node_id,
                                destination_node_id=dest.node_id,
                                status="UNAVAILABLE",
                                failure_reason="No route found between points"
                            ))
            
            status = "PARTIAL" if has_unavailable else "SUCCESS"
            return RoadCostMatrix(
                nodes=nodes,
                node_index=node_index,
                entries=entries,
                status=status
            )
            
        except RoutingBaseException as e:
            return RoadCostMatrix(
                nodes=nodes,
                node_index=node_index,
                entries=[],
                status="FAILED",
                failure_reason=str(e)
            )

    def _build_trivial_matrix(self, nodes: List[RoutingNode], node_index: Dict[str, int]) -> RoadCostMatrix:
        entries = []
        for o in nodes:
            for d in nodes:
                entries.append(RoadCostEntry(
                    origin_node_id=o.node_id,
                    destination_node_id=d.node_id,
                    distance_meters=0.0,
                    duration_seconds=0.0,
                    status="AVAILABLE"
                ))
        return RoadCostMatrix(
            nodes=nodes,
            node_index=node_index,
            entries=entries,
            status="SUCCESS"
        )
