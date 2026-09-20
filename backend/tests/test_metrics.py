import pytest
from uuid import uuid4
from pydantic import ValidationError

from app.services.optimization.metrics.schemas import MetricsInput
from app.services.optimization.metrics.calculator import MetricsCalculator

def test_1_to_11_basic_savings():
    # Covers tests 1, 2, 4, 6, 7, 8, 9, 10, 11
    calc = MetricsCalculator()
    
    order_a = uuid4()
    order_b = uuid4()
    
    inputs = MetricsInput(
        baseline_successful_order_ids=[order_a, order_b],
        optimized_successful_order_ids=[order_a, order_b],
        aligned_baseline_distance_meters=100000.0,  # 100 km
        aligned_optimized_distance_meters=80000.0,  # 80 km
        cost_per_km_inr=40.0,
        emission_factor_kg_per_km=0.8
    )
    
    res = calc.calculate_savings(inputs)
    
    # distance
    assert res.baseline_distance_meters == 100000.0
    assert res.optimized_distance_meters == 80000.0
    assert res.distance_saved_meters == 20000.0
    assert res.distance_saved_pct == 20.0
    
    # cost (100km * 40 = 4000)
    assert res.baseline_cost_inr == 4000.0
    assert res.optimized_cost_inr == 3200.0
    assert res.cost_saved_inr == 800.0
    assert res.cost_saved_pct == 20.0
    
    # CO2 (100km * 0.8 = 80)
    assert res.baseline_co2_kg == 80.0
    assert res.optimized_co2_kg == 64.0
    assert res.co2_saved_kg == 16.0
    assert res.co2_saved_pct == 20.0

def test_3_5_configured_overrides():
    calc = MetricsCalculator()
    order_a = uuid4()
    
    inputs = MetricsInput(
        baseline_successful_order_ids=[order_a],
        optimized_successful_order_ids=[order_a],
        aligned_baseline_distance_meters=100000.0,
        aligned_optimized_distance_meters=80000.0,
        cost_per_km_inr=50.0, # Override
        emission_factor_kg_per_km=1.2 # Override
    )
    
    res = calc.calculate_savings(inputs)
    
    assert res.baseline_cost_inr == 5000.0
    assert res.baseline_co2_kg == 120.0

def test_12_13_workload_intersection():
    calc = MetricsCalculator()
    
    order_a = uuid4()
    order_b = uuid4()
    order_c = uuid4()
    order_d = uuid4()
    
    inputs = MetricsInput(
        baseline_successful_order_ids=[order_a, order_b, order_c],
        optimized_successful_order_ids=[order_b, order_c, order_d],
        aligned_baseline_distance_meters=50000.0,
        aligned_optimized_distance_meters=40000.0,
        cost_per_km_inr=40.0,
        emission_factor_kg_per_km=0.8
    )
    
    res = calc.calculate_savings(inputs)
    assert res.comparable_workload_count == 2
    assert "baseline_excluded_count=1" in res.diagnostics
    assert "optimized_excluded_count=1" in res.diagnostics

def test_14_15_zero_comparable_workload():
    calc = MetricsCalculator()
    
    order_a = uuid4()
    order_b = uuid4()
    
    inputs = MetricsInput(
        baseline_successful_order_ids=[order_a],
        optimized_successful_order_ids=[order_b],
        aligned_baseline_distance_meters=50000.0,
        aligned_optimized_distance_meters=40000.0,
        cost_per_km_inr=40.0,
        emission_factor_kg_per_km=0.8
    )
    
    res = calc.calculate_savings(inputs)
    assert res.comparable_workload_count == 0
    assert "NO_COMPARABLE_WORKLOAD" in res.diagnostics
    assert res.distance_saved_meters is None
    assert res.cost_saved_inr is None

def test_16_17_18_zero_baseline():
    calc = MetricsCalculator()
    
    order_a = uuid4()
    
    inputs = MetricsInput(
        baseline_successful_order_ids=[order_a],
        optimized_successful_order_ids=[order_a],
        aligned_baseline_distance_meters=0.0,
        aligned_optimized_distance_meters=0.0,
        cost_per_km_inr=40.0,
        emission_factor_kg_per_km=0.8
    )
    
    res = calc.calculate_savings(inputs)
    assert res.baseline_distance_meters == 0.0
    assert res.distance_saved_pct is None
    assert res.cost_saved_pct is None
    assert res.co2_saved_pct is None
    assert "ZERO_BASELINE_DISTANCE" in res.diagnostics

def test_19_invalid_config_values():
    with pytest.raises(ValidationError):
        MetricsInput(
            baseline_successful_order_ids=[],
            optimized_successful_order_ids=[],
            aligned_baseline_distance_meters=0.0,
            aligned_optimized_distance_meters=0.0,
            cost_per_km_inr=-10.0, # Negative
            emission_factor_kg_per_km=0.8
        )
        
    from app.services.optimization.config import OptimizationConfigOverrides, MetricsOverrides
    with pytest.raises(ValidationError):
        OptimizationConfigOverrides(
            metrics=MetricsOverrides(cost_per_km_inr=-5.0)
        )

def test_20_21_precision_and_determinism():
    calc = MetricsCalculator()
    order_a = uuid4()
    
    # Test floating point precision, ensure no premature rounding
    inputs = MetricsInput(
        baseline_successful_order_ids=[order_a],
        optimized_successful_order_ids=[order_a],
        aligned_baseline_distance_meters=33333.333,
        aligned_optimized_distance_meters=11111.111,
        cost_per_km_inr=40.0,
        emission_factor_kg_per_km=0.8
    )
    
    res = calc.calculate_savings(inputs)
    assert abs(res.distance_saved_meters - 22222.222) < 0.001
    assert abs(res.baseline_cost_inr - 1333.33332) < 0.001

def test_22_23_regression_integration():
    # Verifies the metrics integration plays nicely with baseline/optimization outputs conceptually
    from app.services.optimization.baseline.schemas import BaselineResult
    from app.services.optimization.solver.schemas import OptimizationResult, OptimizationResultRoute
    
    br = BaselineResult(
        distance_reference_m=100000.0,
        duration_reference_s=3600.0,
        order_count=1,
        successfully_routed_order_count=1,
        failed_order_count=0,
        diagnostics=[]
    )
    
    orr = OptimizationResultRoute(
        route_id="R1",
        vehicle_id=uuid4(),
        ordered_node_ids=["N1", "N2"],
        ordered_order_ids=[uuid4()],
        total_distance_meters=80000.0,
        total_duration_seconds=3000.0,
        total_weight_kg=100.0,
        capacity_kg=200.0,
        utilization_ratio=0.5,
        workload_unit_ids=["W1"],
        parent_cluster_ids=["C1"]
    )
    
    or_res = OptimizationResult(
        status="OPTIMAL",
        routes=[orr],
        total_distance_meters=80000.0,
        total_duration_seconds=3000.0
    )
    
    # Simulate extraction
    inputs = MetricsInput(
        baseline_successful_order_ids=orr.ordered_order_ids,
        optimized_successful_order_ids=orr.ordered_order_ids,
        aligned_baseline_distance_meters=br.distance_reference_m,
        aligned_optimized_distance_meters=or_res.total_distance_meters,
        cost_per_km_inr=40.0,
        emission_factor_kg_per_km=0.8
    )
    
    calc = MetricsCalculator()
    savings = calc.calculate_savings(inputs)
    or_res.savings = savings
    
    assert or_res.savings.distance_saved_meters == 20000.0
    assert or_res.savings.cost_saved_inr == 800.0
