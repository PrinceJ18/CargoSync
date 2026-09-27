import { env } from "../config/env";
import type { ApiError, ApiErrorCode } from "../types/api";
import { supabase } from "../lib/supabase/client";

function mapStatusCodeToEnum(status: number): ApiErrorCode {
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "UNAUTHORIZED";
  if (status === 404) return "NOT_FOUND";
  if (status === 422 || status === 400) return "VALIDATION_ERROR";
  if (status >= 500) return "SERVER_ERROR";
  return "UNKNOWN_ERROR";
}

function getErrorMessage(status: number, statusText: string): string {
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You do not have permission to access this data.";
  if (status === 404) return "The requested resource could not be found.";
  if (status === 422 || status === 400) return "The request could not be processed. Please check the provided data.";
  if (status >= 500) return "CargoSync services are temporarily unavailable. Please try again.";
  return statusText || "An unexpected error occurred.";
}

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
      message: getErrorMessage(response.status, response.statusText),
      status: response.status,
      code: mapStatusCodeToEnum(response.status),
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
  // ─── Demo Mode Intercept ───────────────────────────────────────
  // When demo mode is active, return fixture data instead of calling the backend.
  // We read directly from sessionStorage (same key as DemoContext) because this
  // module is not a React component and cannot use hooks.
  try {
    const demoState = sessionStorage.getItem("cargosync_demo_mode");
    if (demoState) {
      const parsed = JSON.parse(demoState);
      if (parsed.isDemo) {
        const { resolveDemoApiCall } = await import("./demoApiData");
        const demoResult = resolveDemoApiCall<T>(endpoint, options);
        if (demoResult !== null) {
          return demoResult;
        }
        // If null, the endpoint wasn't recognized — fall through to real API
        // (this shouldn't happen in practice, but is a safe fallback)
      }
    }
  } catch {
    // Ignore sessionStorage/parse errors — proceed with real API
  }
  // ─── End Demo Mode Intercept ───────────────────────────────────

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
    if ((error as ApiError).status !== undefined || (error as ApiError).code !== undefined) {
      throw error;
    }
    
    const isNetwork = error instanceof Error && (error.message.includes("fetch") || error.message.includes("network") || error.message.includes("Failed to fetch"));

    const networkError: ApiError = {
      message: isNetwork ? "Unable to connect to CargoSync services. Check your connection and try again." : (error instanceof Error ? error.message : "An unexpected error occurred."),
      code: isNetwork ? "NETWORK_ERROR" : "UNKNOWN_ERROR",
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

import type { Order, Vehicle, ReturnLoad, AnalyticsMetricsResponse, OptimizationRunRequest, OptimizationRunResponse, Depot, PaginatedResponse } from "../types/api";

export const api = {
  orders: {
    list: (params?: { page?: number; page_size?: number; status?: string; scenario?: string }) => {
      const p = new URLSearchParams();
      if (params?.page) p.set("page", params.page.toString());
      if (params?.page_size) p.set("page_size", params.page_size.toString());
      if (params?.status) p.set("status", params.status);
      if (params?.scenario) p.set("scenario", params.scenario);
      const qs = p.toString();
      return apiClient.get<PaginatedResponse<Order>>(`/orders${qs ? `?${qs}` : ""}`);
    },
  },
  fleet: {
    listVehicles: (params?: { page?: number; page_size?: number; status?: string; scenario?: string }) => {
      const p = new URLSearchParams();
      if (params?.page) p.set("page", params.page.toString());
      if (params?.page_size) p.set("page_size", params.page_size.toString());
      if (params?.status) p.set("status", params.status);
      if (params?.scenario) p.set("scenario", params.scenario);
      const qs = p.toString();
      return apiClient.get<PaginatedResponse<Vehicle>>(`/vehicles${qs ? `?${qs}` : ""}`);
    },
    listDepots: (params?: { page?: number; page_size?: number; status?: string; scenario?: string }) => {
      const p = new URLSearchParams();
      if (params?.page) p.set("page", params.page.toString());
      if (params?.page_size) p.set("page_size", params.page_size.toString());
      if (params?.status) p.set("status", params.status);
      if (params?.scenario) p.set("scenario", params.scenario);
      const qs = p.toString();
      return apiClient.get<PaginatedResponse<Depot>>(`/depots${qs ? `?${qs}` : ""}`);
    },
  },
  returnLoads: {
    list: (params?: { page?: number; page_size?: number; status?: string; scenario?: string }) => {
      const p = new URLSearchParams();
      if (params?.page) p.set("page", params.page.toString());
      if (params?.page_size) p.set("page_size", params.page_size.toString());
      if (params?.status) p.set("status", params.status);
      if (params?.scenario) p.set("scenario", params.scenario);
      const qs = p.toString();
      return apiClient.get<PaginatedResponse<ReturnLoad>>(`/return-loads${qs ? `?${qs}` : ""}`);
    },
  },
  optimization: {
    run: (data: OptimizationRunRequest) => apiClient.post<OptimizationRunResponse>("/optimization/runs", data),
    getLatest: (scenario = "DEMO") => apiClient.get<OptimizationRunResponse>(`/optimization/latest?scenario=${scenario}`),
  },
  analytics: {
    getMetrics: (scenario = "DEMO") => apiClient.get<AnalyticsMetricsResponse>(`/analytics/metrics?scenario=${scenario}`),
  }
};

