from app.services.optimization.metrics.schemas import MetricsInput, OptimizationSavings
from app.services.optimization.metrics.exceptions import MetricsCalculationError

class MetricsCalculator:
    def calculate_savings(self, inputs: MetricsInput) -> OptimizationSavings:
        baseline_set = set(inputs.baseline_successful_order_ids)
        optimized_set = set(inputs.optimized_successful_order_ids)
        comparable_set = baseline_set.intersection(optimized_set)
        
        diagnostics = []
        diagnostics.append(f"baseline_successful_count={len(baseline_set)}")
        diagnostics.append(f"optimized_successful_count={len(optimized_set)}")
        diagnostics.append(f"comparable_count={len(comparable_set)}")
        diagnostics.append(f"baseline_excluded_count={len(baseline_set - comparable_set)}")
        diagnostics.append(f"optimized_excluded_count={len(optimized_set - comparable_set)}")
        
        if len(comparable_set) == 0:
            diagnostics.append("NO_COMPARABLE_WORKLOAD")
            return OptimizationSavings(
                comparable_workload_count=0,
                cost_per_km_inr=inputs.cost_per_km_inr,
                emission_factor_kg_per_km=inputs.emission_factor_kg_per_km,
                diagnostics=diagnostics
            )
            
        if inputs.aligned_baseline_distance_meters is None or inputs.aligned_optimized_distance_meters is None:
            diagnostics.append("DISTANCES_NOT_PROVIDED")
            return OptimizationSavings(
                comparable_workload_count=len(comparable_set),
                cost_per_km_inr=inputs.cost_per_km_inr,
                emission_factor_kg_per_km=inputs.emission_factor_kg_per_km,
                diagnostics=diagnostics
            )
            
        b_dist_m = inputs.aligned_baseline_distance_meters
        o_dist_m = inputs.aligned_optimized_distance_meters
        
        dist_saved_m = b_dist_m - o_dist_m
        dist_saved_pct = (dist_saved_m / b_dist_m * 100.0) if b_dist_m > 0 else None
        
        b_cost = (b_dist_m / 1000.0) * inputs.cost_per_km_inr
        o_cost = (o_dist_m / 1000.0) * inputs.cost_per_km_inr
        cost_saved = b_cost - o_cost
        cost_saved_pct = (cost_saved / b_cost * 100.0) if b_cost > 0 else None
        
        b_co2 = (b_dist_m / 1000.0) * inputs.emission_factor_kg_per_km
        o_co2 = (o_dist_m / 1000.0) * inputs.emission_factor_kg_per_km
        co2_saved = b_co2 - o_co2
        co2_saved_pct = (co2_saved / b_co2 * 100.0) if b_co2 > 0 else None
        
        if b_dist_m == 0:
            diagnostics.append("ZERO_BASELINE_DISTANCE")
            
        return OptimizationSavings(
            comparable_workload_count=len(comparable_set),
            
            baseline_distance_meters=b_dist_m,
            optimized_distance_meters=o_dist_m,
            distance_saved_meters=dist_saved_m,
            distance_saved_pct=dist_saved_pct,
            
            cost_per_km_inr=inputs.cost_per_km_inr,
            baseline_cost_inr=b_cost,
            optimized_cost_inr=o_cost,
            cost_saved_inr=cost_saved,
            cost_saved_pct=cost_saved_pct,
            
            emission_factor_kg_per_km=inputs.emission_factor_kg_per_km,
            baseline_co2_kg=b_co2,
            optimized_co2_kg=o_co2,
            co2_saved_kg=co2_saved,
            co2_saved_pct=co2_saved_pct,
            
            diagnostics=diagnostics
        )
