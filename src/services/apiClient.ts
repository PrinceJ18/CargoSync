import { env } from "../config/env";
import type { ApiError } from "../types/api";
import { supabase } from "../lib/supabase/client";

/**
 * Normalizes HTTP fetch responses into a predictable ApiError structure.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorDetails;
    try {
      errorDetails = await response.json();
    } catch {
      errorDetails = await response.text();
    }

    const error: ApiError = {
      message: response.statusText || "An error occurred during the API request.",
      status: response.status,
      details: errorDetails,
    };
    throw error;
  }
  
  // Handle empty responses (e.g., 204 No Content)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

/**
 * Generic API request abstraction.
 * This establishes the boundary between UI components and backend fetching logic.
 */
export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${env.API_BASE_URL}${endpoint}`;

  // Fetch the current session to inject the JWT
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    return await handleResponse<T>(response);
  } catch (error) {
    // Normalize network/unknown errors if they aren't already ApiErrors
    if ((error as ApiError).status !== undefined) {
      throw error;
    }
    
    const networkError: ApiError = {
      message: error instanceof Error ? error.message : "Network or unknown error",
      code: "NETWORK_ERROR",
    };
    throw networkError;
  }
}

/**
 * Convenience methods for standard REST verbs.
 */
export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: "GET" }),
    
  post: <T>(endpoint: string, body: unknown, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: "POST", body: JSON.stringify(body) }),
    
  put: <T>(endpoint: string, body: unknown, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: "PUT", body: JSON.stringify(body) }),
    
  delete: <T>(endpoint: string, options?: RequestInit) => 
    request<T>(endpoint, { ...options, method: "DELETE" }),
};

import type { Order, Vehicle, ReturnLoad, AnalyticsMetricsResponse, OptimizationRunRequest, OptimizationRunResponse, Depot } from "../types/api";

export const api = {
  orders: {
    list: () => apiClient.get<Order[]>("/orders"),
  },
  fleet: {
    listVehicles: () => apiClient.get<Vehicle[]>("/vehicles"),
    listDepots: () => apiClient.get<Depot[]>("/depots"),
  },
  returnLoads: {
    list: () => apiClient.get<ReturnLoad[]>("/return-loads"),
  },
  optimization: {
    run: (data: OptimizationRunRequest) => apiClient.post<OptimizationRunResponse>("/optimization/runs", data),
    getLatest: (scenario = "DEMO") => apiClient.get<OptimizationRunResponse>(`/optimization/latest?scenario=${scenario}`),
  },
  analytics: {
    getMetrics: (scenario = "DEMO") => apiClient.get<AnalyticsMetricsResponse>(`/analytics/metrics?scenario=${scenario}`),
  }
};

