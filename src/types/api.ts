/**
 * Centralized API Domain and Response Types.
 * These align strictly with the FastAPI contracts outlined in 11_API_CONTRACTS.md.
 */

// --- Domain Models ---

export interface Order {
  id: string;
  operator_id: string;
  pickup_location: [number, number]; // [lat, lng]
  delivery_location: [number, number]; // [lat, lng]
  weight_kg: number;
  status: "PENDING" | "SCHEDULED" | "COMPLETED" | "FAILED";
}

export interface Vehicle {
  id: string;
  operator_id: string;
  capacity_kg: number;
  status: "AVAILABLE" | "IN_TRANSIT" | "MAINTENANCE";
}

export interface Depot {
  id: string;
  operator_id: string;
  location: [number, number]; // [lat, lng]
}

export interface ReturnLoad {
  id: string;
  operator_id: string;
  pickup_location: [number, number]; // [lat, lng]
  delivery_location: [number, number]; // [lat, lng]
  weight_kg: number;
}

// --- API Request/Response Contracts ---

// /api/optimization/run
export interface OptimizationRunRequest {
  scenario: string; // e.g., "DEMO"
  config_overrides?: Record<string, unknown>;
}

export interface OptimizationRunResponse {
  run_id: string; // uuid
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
