from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

class OptimizationConfigOverride(BaseModel):
    eps_km: Optional[float] = None
    min_samples: Optional[int] = None
    cost_per_km_inr: Optional[float] = None
    co2_per_km_kg: Optional[float] = None

class OptimizationRunRequest(BaseModel):
    scenario_id: str = Field(..., description="Scenario ID to optimize, e.g., 'DEMO'")
    operator_ids: Optional[List[UUID]] = Field(None, description="Optional list of operator UUIDs. Admins only.")
    config: Optional[OptimizationConfigOverride] = Field(None, description="Optional config overrides")

class OptimizationDiagnostic(BaseModel):
    level: str
    message: str
    record_id: Optional[str] = None
    record_type: Optional[str] = None

class OptimizationMetric(BaseModel):
    distance_meters: float
    duration_seconds: float
    vehicles_used: int

class OptimizationSavings(BaseModel):
    comparable_workload_count: int
    distance_saved_meters: float
    cost_saved_inr: Optional[float] = None
    co2_saved_kg: Optional[float] = None

class OptimizationMetricsResult(BaseModel):
    baseline: OptimizationMetric
    optimized: OptimizationMetric
    savings: OptimizationSavings

class OptimizationRunResponse(BaseModel):
    run_id: UUID = Field(description="A unique identifier for this orchestration run")
    status: str = Field(..., description="COMPLETED, FAILED, PARTIAL")
    scenario: str
    solver_status: Optional[str] = None
    diagnostics: List[OptimizationDiagnostic] = Field(default_factory=list)
    metrics: Optional[OptimizationMetricsResult] = None
    routes: List[Dict[str, Any]] = Field(default_factory=list, description="List of resulting routes including return loads and geometries")
    created_at: datetime = Field(default_factory=datetime.utcnow)
