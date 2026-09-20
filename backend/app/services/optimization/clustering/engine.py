import numpy as np
from sklearn.cluster import DBSCAN
from typing import List, Dict, Tuple
from uuid import UUID

from app.services.optimization.schemas import OptimizationInput, OptimizationOrder
from app.services.optimization.config import OptimizationConfig
from app.services.optimization.clustering.schemas import ClusteringResult, Cluster
from app.services.optimization.clustering.distance import DistanceProvider

class ClusteringEngine:
    def __init__(self, distance_provider: DistanceProvider):
        self.distance_provider = distance_provider
        
    def _calculate_centroid(self, orders: List[OptimizationOrder]) -> Tuple[float, float]:
        """
        Calculates the arithmetic mean of latitude and longitude for the given orders.
        """
        if not orders:
            return 0.0, 0.0
            
        lat_sum = sum(o.destination_latitude for o in orders)
        lon_sum = sum(o.destination_longitude for o in orders)
        count = len(orders)
        
        return lat_sum / count, lon_sum / count

    def run_clustering(self, opt_input: OptimizationInput, config: OptimizationConfig) -> ClusteringResult:
        """
        Executes DBSCAN clustering on the provided OptimizationInput orders.
        """
        
        # 1. Disabled Check
        if not config.clustering.enabled:
            return ClusteringResult(
                clustering_status="DISABLED",
                clusters=[],
                noise_order_ids=[],
                unclustered_order_ids=[o.id for o in opt_input.orders],
                total_input_orders=len(opt_input.orders),
                clustered_order_count=0,
                noise_order_count=0,
                epsilon_meters=config.clustering.epsilon_meters,
                min_samples=config.clustering.min_samples
            )
            
        # 2. Empty or Single Order Check
        orders = opt_input.orders
        n_orders = len(orders)
        
        if n_orders == 0:
            return ClusteringResult(
                clustering_status="COMPLETED",
                clusters=[],
                noise_order_ids=[],
                unclustered_order_ids=[],
                total_input_orders=0,
                clustered_order_count=0,
                noise_order_count=0,
                epsilon_meters=config.clustering.epsilon_meters,
                min_samples=config.clustering.min_samples
            )
            
        if n_orders < config.clustering.min_samples:
            # Everything is noise
            return ClusteringResult(
                clustering_status="COMPLETED",
                clusters=[],
                noise_order_ids=[o.id for o in orders],
                unclustered_order_ids=[],
                total_input_orders=n_orders,
                clustered_order_count=0,
                noise_order_count=n_orders,
                epsilon_meters=config.clustering.epsilon_meters,
                min_samples=config.clustering.min_samples
            )

        # 3. Calculate Pairwise Distance Matrix in Meters
        # O(n^2) matrix generation
        dist_matrix = np.zeros((n_orders, n_orders))
        for i in range(n_orders):
            pt_i = (orders[i].destination_latitude, orders[i].destination_longitude)
            for j in range(i + 1, n_orders):
                pt_j = (orders[j].destination_latitude, orders[j].destination_longitude)
                dist = self.distance_provider.distance_meters(pt_i, pt_j)
                dist_matrix[i, j] = dist
                dist_matrix[j, i] = dist # symmetric
                
        # 4. Execute DBSCAN
        dbscan = DBSCAN(
            eps=config.clustering.epsilon_meters, 
            min_samples=config.clustering.min_samples,
            metric="precomputed"
        )
        
        labels = dbscan.fit_predict(dist_matrix)
        
        # 5. Process Output
        # labels is an array of size n_orders. -1 is noise.
        cluster_map: Dict[int, List[OptimizationOrder]] = {}
        noise_ids: List[UUID] = []
        
        for idx, label in enumerate(labels):
            order = orders[idx]
            if label == -1:
                noise_ids.append(order.id)
            else:
                if label not in cluster_map:
                    cluster_map[label] = []
                cluster_map[label].append(order)
                
        # 6. Construct Domain Clusters
        # Sort cluster labels deterministically
        sorted_labels = sorted(cluster_map.keys())
        clusters: List[Cluster] = []
        
        for i, label in enumerate(sorted_labels):
            cluster_orders = cluster_map[label]
            # Ensure deterministic order ID ordering within the cluster just in case
            cluster_orders.sort(key=lambda o: str(o.id))
            
            lat, lon = self._calculate_centroid(cluster_orders)
            weight = sum(o.weight_kg for o in cluster_orders)
            
            cluster = Cluster(
                cluster_id=f"CLUSTER-{(i+1):03d}",
                order_ids=[o.id for o in cluster_orders],
                centroid_latitude=lat,
                centroid_longitude=lon,
                order_count=len(cluster_orders),
                total_weight_kg=weight
            )
            clusters.append(cluster)
            
        return ClusteringResult(
            clustering_status="COMPLETED",
            clusters=clusters,
            noise_order_ids=noise_ids,
            unclustered_order_ids=[],
            total_input_orders=n_orders,
            clustered_order_count=n_orders - len(noise_ids),
            noise_order_count=len(noise_ids),
            epsilon_meters=config.clustering.epsilon_meters,
            min_samples=config.clustering.min_samples
        )
