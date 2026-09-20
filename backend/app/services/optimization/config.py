from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional

# ---------------------------------------------------------
# Section Models
# ---------------------------------------------------------

class ClusteringConfig(BaseModel):
    enabled: bool = True
    epsilon_meters: float = Field(..., gt=0.0)
    min_samples: int = Field(..., ge=1)

class CapacityConstraints(BaseModel):
    enforce_capacity: bool = True
    max_load_ratio: float = Field(..., gt=0.0, le=1.0)
    
class RouteConstraints(BaseModel):
    max_route_distance_km: float = Field(..., gt=0.0)
    max_route_duration_minutes: float = Field(..., gt=0.0)
    max_stops_per_route: int = Field(..., ge=1)
    enforce_duration_limits: bool = True

class TimeWindowPolicy(BaseModel):
    enforce_time_windows: bool = True
    allow_missing_windows: bool = True
    wait_time_allowed_minutes: float = Field(..., ge=0.0)

class OptimizationObjectives(BaseModel):
    minimize_distance_weight: float = Field(..., ge=0.0)
    minimize_duration_weight: float = Field(..., ge=0.0)
    # Utilization is intentionally reporting-only, not an active solver objective
    utilization_reporting_only: bool = True
    
    minimize_vehicles_weight: float = Field(..., ge=0.0)

class ReturnLoadPolicy(BaseModel):
    enabled: bool = False
    min_compatibility_score: float = Field(..., ge=0.0, le=1.0)
    max_detour_km: float = Field(..., ge=0.0)

class BaselinePolicy(BaseModel):
    perform_baseline_comparison: bool = True

class MetricsPolicy(BaseModel):
    cost_per_km_inr: float = Field(..., ge=0.0)
    emission_factor_kg_per_km: float = Field(..., ge=0.0)

# ---------------------------------------------------------
# Resolved Config
# ---------------------------------------------------------

class OptimizationConfig(BaseModel):
    """The fully resolved and immutable configuration for one optimization run."""
    scenario: str
    clustering: ClusteringConfig
    capacity: CapacityConstraints
    route: RouteConstraints
    time_windows: TimeWindowPolicy
    objectives: OptimizationObjectives
    return_load: ReturnLoadPolicy
    baseline: BaselinePolicy
    metrics: MetricsPolicy

# ---------------------------------------------------------
# Overrides
# ---------------------------------------------------------

class ClusteringOverrides(BaseModel):
    enabled: Optional[bool] = None
    epsilon_meters: Optional[float] = Field(None, gt=0.0)
    min_samples: Optional[int] = Field(None, ge=1)

class CapacityOverrides(BaseModel):
    enforce_capacity: Optional[bool] = None
    max_load_ratio: Optional[float] = Field(None, gt=0.0, le=1.0)

class RouteOverrides(BaseModel):
    max_route_distance_km: Optional[float] = Field(None, gt=0.0)
    max_route_duration_minutes: Optional[float] = Field(None, gt=0.0)
    max_stops_per_route: Optional[int] = Field(None, ge=1)
    enforce_duration_limits: Optional[bool] = None

class TimeWindowOverrides(BaseModel):
    enforce_time_windows: Optional[bool] = None
    allow_missing_windows: Optional[bool] = None
    wait_time_allowed_minutes: Optional[float] = Field(None, ge=0.0)

class ObjectiveOverrides(BaseModel):
    minimize_distance_weight: Optional[float] = Field(None, ge=0.0)
    minimize_duration_weight: Optional[float] = Field(None, ge=0.0)
    utilization_reporting_only: Optional[bool] = None
    minimize_vehicles_weight: Optional[float] = Field(None, ge=0.0)

class ReturnLoadOverrides(BaseModel):
    enabled: Optional[bool] = None
    min_compatibility_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    max_detour_km: Optional[float] = Field(None, ge=0.0)

class BaselineOverrides(BaseModel):
    perform_baseline_comparison: Optional[bool] = None

class MetricsOverrides(BaseModel):
    cost_per_km_inr: Optional[float] = Field(None, ge=0.0)
    emission_factor_kg_per_km: Optional[float] = Field(None, ge=0.0)

class OptimizationConfigOverrides(BaseModel):
    """Optional overrides for an optimization run."""
    model_config = {"extra": "forbid"}

    clustering: Optional[ClusteringOverrides] = None
    capacity: Optional[CapacityOverrides] = None
    route: Optional[RouteOverrides] = None
    time_windows: Optional[TimeWindowOverrides] = None
    objectives: Optional[ObjectiveOverrides] = None
    return_load: Optional[ReturnLoadOverrides] = None
    baseline: Optional[BaselineOverrides] = None
    metrics: Optional[MetricsOverrides] = None


# ---------------------------------------------------------
# Canonical Defaults & Resolution
# ---------------------------------------------------------

def _get_base_defaults(scenario: str) -> dict:
    """Returns the base canonical defaults (prototypes/TBD) before overrides."""
    return {
        "clustering": {
            "enabled": True,
            "epsilon_meters": 5000.0,  # Prototype default
            "min_samples": 3           # Prototype default
        },
        "capacity": {
            "enforce_capacity": True,
            "max_load_ratio": 1.0
        },
        "route": {
            "max_route_distance_km": 500.0,
            "max_route_duration_minutes": 720.0,
            "max_stops_per_route": 20,
            "enforce_duration_limits": True
        },
        "time_windows": {
            "enforce_time_windows": True,
            "allow_missing_windows": True,
            "wait_time_allowed_minutes": 60.0
        },
        "objectives": {
            # Prototype weights
            "minimize_distance_weight": 1.0,
            "minimize_duration_weight": 1.0,
            "utilization_reporting_only": True,
            "minimize_vehicles_weight": 5.0
        },
        "return_load": {
            "enabled": False,
            "min_compatibility_score": 0.5, # Prototype default
            "max_detour_km": 25.0           # Prototype default
        },
        "baseline": {
            "perform_baseline_comparison": True
        },
        "metrics": {
            "cost_per_km_inr": 40.0,
            "emission_factor_kg_per_km": 0.8
        }
    }

def resolve_optimization_config(
    scenario: str,
    overrides: Optional[OptimizationConfigOverrides] = None
) -> OptimizationConfig:
    """
    Builds the final immutable OptimizationConfig by merging canonical defaults
    with optional strict-validated overrides.
    """
    defaults = _get_base_defaults(scenario)
    
    # We deeply merge overrides into defaults
    if overrides:
        override_dict = overrides.model_dump(exclude_unset=True)
        for section, section_overrides in override_dict.items():
            if section_overrides is not None:
                for key, val in section_overrides.items():
                    defaults[section][key] = val
                    
    # The final parse acts as a structural validation boundary
    return OptimizationConfig(
        scenario=scenario,
        **defaults
    )
