from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID

class OptimizationSavings(BaseModel):
    comparable_workload_count: int

    baseline_distance_meters: Optional[float] = None
    optimized_distance_meters: Optional[float] = None
    distance_saved_meters: Optional[float] = None
    distance_saved_pct: Optional[float] = None

    cost_per_km_inr: float
    baseline_cost_inr: Optional[float] = None
    optimized_cost_inr: Optional[float] = None
    cost_saved_inr: Optional[float] = None
    cost_saved_pct: Optional[float] = None

    emission_factor_kg_per_km: float
    baseline_co2_kg: Optional[float] = None
    optimized_co2_kg: Optional[float] = None
    co2_saved_kg: Optional[float] = None
    co2_saved_pct: Optional[float] = None

    diagnostics: List[str]

class MetricsInput(BaseModel):
    baseline_successful_order_ids: List[UUID]
    optimized_successful_order_ids: List[UUID]
    
    # Explicit Domain Contract: 
    # The architecture requires filtering/aggregation before the calculator.
    # These distances MUST strictly correspond to the intersection of the two workloads.
    aligned_baseline_distance_meters: Optional[float] = None
    aligned_optimized_distance_meters: Optional[float] = None

    cost_per_km_inr: float = Field(..., ge=0.0)
    emission_factor_kg_per_km: float = Field(..., ge=0.0)
