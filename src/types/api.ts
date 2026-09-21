/**
 * Centralized API Domain and Response Types.
 * These align strictly with the FastAPI contracts outlined in 11_API_CONTRACTS.md.
 */

// --- Domain Models ---

export interface Order {
  id: string;
  reference_number?: string;
  operator_id: string;
  origin_depot_id?: string;
  destination_latitude: number;
  destination_longitude: number;
  weight_kg: number;
  status: "PENDING" | "SCHEDULED" | "COMPLETED" | "FAILED";
}

export interface Vehicle {
  id: string;
  reference_number?: string;
  operator_id: string;
  capacity_kg: number;
  status: "AVAILABLE" | "IN_TRANSIT" | "MAINTENANCE";
}

export interface Depot {
  id: string;
  operator_id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface ReturnLoad {
  id: string;
  reference_number?: string;
  operator_id: string;
  pickup_latitude: number;
  pickup_longitude: number;
  delivery_latitude: number;
  delivery_longitude: number;
  weight_kg: number;
}

// --- API Request/Response Contracts ---

// /api/optimization/run
export interface OptimizationRunRequest {
  scenario_id: string; // e.g., "DEMO"
  config?: Record<string, unknown>;
}

export interface OptimizationRunResponse {
  run_id: string; // uuid
  status: "COMPLETED" | "FAILED" | "PARTIAL";
  scenario: string;
  solver_status?: string;
  diagnostics: Array<{
    level: string;
    message: string;
    record_id?: string;
    record_type?: string;
  }>;
  metrics?: {
    baseline: {
      distance_meters: number;
      duration_seconds: number;
      vehicles_used: number;
    };
    optimized: {
      distance_meters: number;
      duration_seconds: number;
      vehicles_used: number;
    };
    savings: {
      comparable_workload_count: number;
      distance_saved_meters: number;
      cost_saved_inr?: number;
      co2_saved_kg?: number;
    };
  };
  routes: Array<{
    vehicle_id: string;
    total_distance_meters: number;
    total_duration_seconds: number;
    geometry: {
      type: string;
      coordinates: Array<[number, number]>;
    };
    stops: Array<{
      order_id?: string;
      return_load_id?: string;
      stop_type?: string;
      sequence_index?: number;
      location?: [number, number];
    }>;
    return_load?: unknown;
  }>;
}

// /api/optimization/{run_id}/status
export interface OptimizationStatusResponse {
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  progress: number;
  stage: string;
}

// /api/optimization/{run_id} (OptimizationResult schema)
export interface OptimizationResult {
  run_id: string;
  status: "COMPLETED" | "FAILED";
  diagnostics?: string[];
  routes: Array<{
    vehicle_id: string;
    geometry_polyline: string;
    stops: Array<{
      location: [number, number];
      weight_kg: number;
    }>;
  }>;
  savings: {
    distance_pct: number;
    cost_pct: number;
    empty_returns_pct: number;
    co2_pct: number;
  };
}

// /api/analytics/metrics
export interface AnalyticsMetricsResponse {
  total_distance: number;
  total_cost: number;
  utilization_pct: number;
  empty_returns_reduced: number;
  return_loads_matched: number;
  co2_reduced: number;
}

// --- Standardized UI Error Representation ---

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: unknown;
}
