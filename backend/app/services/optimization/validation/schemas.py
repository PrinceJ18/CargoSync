from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from uuid import UUID

from app.services.optimization.clustering.schemas import Cluster, ClusteringResult

class ValidationReason(BaseModel):
    code: str
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)

class ValidatedCluster(BaseModel):
    cluster_id: str
    original_cluster: Cluster
    
    validation_status: str
    validation_reasons: List[ValidationReason] = Field(default_factory=list)
    
    required_capacity_kg: float
    maximum_available_capacity_kg: Optional[float] = None
    capacity_ratio: Optional[float] = None
    
    # Geographic metrics derivable without road-network
    max_distance_from_centroid_meters: Optional[float] = None

class ClusterValidationResult(BaseModel):
    validated_clusters: List[ValidatedCluster]
    noise_order_ids: List[UUID]
    unclustered_order_ids: List[UUID]
    total_input_orders: int
    clustering_status: str
