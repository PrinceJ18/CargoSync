from pydantic import BaseModel, Field
from typing import List
from uuid import UUID

class Cluster(BaseModel):
    cluster_id: str
    order_ids: List[UUID]
    centroid_latitude: float
    centroid_longitude: float
    order_count: int
    total_weight_kg: float

class ClusteringResult(BaseModel):
    clustering_status: str = "COMPLETED"
    clusters: List[Cluster]
    noise_order_ids: List[UUID]
    unclustered_order_ids: List[UUID] = Field(default_factory=list)
    total_input_orders: int
    clustered_order_count: int
    noise_order_count: int
    # Snapshot of the clustering config used
    epsilon_meters: float
    min_samples: int
