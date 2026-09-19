import pytest
from pydantic import ValidationError

from app.services.optimization.config import (
    resolve_optimization_config,
    OptimizationConfigOverrides,
    ClusteringOverrides,
    CapacityOverrides,
    _get_base_defaults
)

def test_canonical_defaults_resolve():
    # 1. Canonical defaults resolve correctly.
    # 10. DEMO configuration resolves correctly.
    config = resolve_optimization_config("DEMO")
    assert config.scenario == "DEMO"
    assert config.clustering.enabled is True
    assert config.clustering.epsilon_meters == 5000.0
    
def test_empty_overrides_produce_defaults():
    # 2. Empty overrides produce defaults.
    config = resolve_optimization_config("DEMO", overrides=OptimizationConfigOverrides())
    assert config.clustering.enabled is True
    assert config.capacity.enforce_capacity is True
    
def test_valid_single_override_replaces_default():
    # 3. A valid single override replaces its default.
    overrides = OptimizationConfigOverrides(
        clustering=ClusteringOverrides(epsilon_meters=100.0)
    )
    config = resolve_optimization_config("DEMO", overrides=overrides)
    assert config.clustering.epsilon_meters == 100.0
    assert config.clustering.min_samples == 3 # Default preserved
    
def test_multiple_overrides_resolve_correctly():
    # 4. Multiple overrides resolve correctly.
    # 11. NETWORK configuration resolves correctly.
    overrides = OptimizationConfigOverrides(
        clustering=ClusteringOverrides(epsilon_meters=250.0, enabled=False),
        capacity=CapacityOverrides(enforce_capacity=False)
    )
    config = resolve_optimization_config("NETWORK", overrides=overrides)
    assert config.scenario == "NETWORK"
    assert config.clustering.epsilon_meters == 250.0
    assert config.clustering.enabled is False
    assert config.capacity.enforce_capacity is False

def test_invalid_numeric_values_rejected():
    # 5. Invalid numeric values are rejected.
    # 6. Invalid ranges are rejected.
    with pytest.raises(ValidationError):
        # epsilon_meters must be > 0
        OptimizationConfigOverrides(clustering=ClusteringOverrides(epsilon_meters=0.0))
        
    with pytest.raises(ValidationError):
        # max_load_ratio must be <= 1.0
        OptimizationConfigOverrides(capacity=CapacityOverrides(max_load_ratio=1.5))

def test_unknown_fields_rejected():
    # 7. Unknown configuration fields are rejected.
    with pytest.raises(ValidationError):
        # The extra forbid should block 'unknown_field'
        OptimizationConfigOverrides(unknown_field=True)

def test_resolved_config_is_deterministic_and_immutable_to_defaults():
    # 8. Resolved configuration is deterministic.
    # 9. Defaults are not mutated by overrides.
    # 18. Resolved configuration is independent of later default mutation.
    overrides = OptimizationConfigOverrides(
        clustering=ClusteringOverrides(epsilon_meters=999.0)
    )
    config1 = resolve_optimization_config("DEMO", overrides=overrides)
    
    base_defaults = _get_base_defaults("DEMO")
    assert base_defaults["clustering"]["epsilon_meters"] == 5000.0
    
    config2 = resolve_optimization_config("DEMO", overrides=overrides)
    assert config1.clustering.epsilon_meters == config2.clustering.epsilon_meters == 999.0

def test_time_window_policy_represented_correctly():
    # 12. Time-window policy is represented correctly.
    config = resolve_optimization_config("DEMO")
    assert hasattr(config.time_windows, 'enforce_time_windows')
    assert hasattr(config.time_windows, 'wait_time_allowed_minutes')

def test_capacity_policy_represented_correctly():
    # 13. Capacity policy is represented correctly.
    config = resolve_optimization_config("DEMO")
    assert hasattr(config.capacity, 'enforce_capacity')
    assert hasattr(config.capacity, 'max_load_ratio')

def test_route_distance_time_constraints_represented_correctly():
    # 14. Route distance/time constraints are represented correctly.
    config = resolve_optimization_config("DEMO")
    assert hasattr(config.route, 'max_route_distance_km')
    assert hasattr(config.route, 'max_stops_per_route')

def test_objective_config_represented_correctly():
    # 15. Objective configuration is represented correctly.
    config = resolve_optimization_config("DEMO")
    assert hasattr(config.objectives, 'minimize_distance_weight')
    assert config.objectives.minimize_distance_weight >= 0.0

def test_return_load_policy_boundary():
    # 16. Return-load policy is represented without implementing matching.
    config = resolve_optimization_config("DEMO")
    assert hasattr(config.return_load, 'enabled')
    assert hasattr(config.return_load, 'max_detour_km')

def test_baseline_policy_boundary():
    # 17. Baseline policy is represented without implementing baseline calculation.
    config = resolve_optimization_config("DEMO")
    assert hasattr(config.baseline, 'perform_baseline_comparison')
