/**
 * Demo Fixture Data — Static data that reproduces the DEMO scenario.
 *
 * This data is generated to match the structure produced by
 * backend/scripts/generate_seed_sql.py for the "DEMO" scenario.
 *
 * It matches the three DEMO operators:
 *   - Shree Balaji Logistics (Operator 1, operator_id for the Business reference account)
 *   - Aakash Road Carriers (Operator 2)
 *   - Ramesh Transport Services (Operator 3)
 *
 * The Business demo shows data scoped to Shree Balaji Logistics (Operator 1).
 * The Admin demo shows all DEMO scenario data across all 3 operators.
 *
 * IMPORTANT: This file is ONLY used when demo mode is active.
 * Real authenticated users always fetch from the live backend API.
 */

import type {
  Order,
  Vehicle,
  Depot,
  ReturnLoad,
  AnalyticsMetricsResponse,
  OptimizationRunResponse,
  PaginatedResponse,
} from "../types/api";

// ─── Operator IDs (match seed.sql) ──────────────────────────────
const OP1_ID = "11111111-1111-1111-1111-111111111111"; // Shree Balaji Logistics
const OP2_ID = "22222222-2222-2222-2222-222222222222"; // Aakash Road Carriers
const OP3_ID = "33333333-3333-3333-3333-333333333333"; // Ramesh Transport Services

const OP1 = { id: OP1_ID, name: "Shree Balaji Logistics" };
const OP2 = { id: OP2_ID, name: "Aakash Road Carriers" };
const OP3 = { id: OP3_ID, name: "Ramesh Transport Services" };

// ─── Depot Centers (match seed.sql) ──────────────────────────────
// Operator index % 3 determines which center
// OP1 (idx 0) => Vijay Nagar, OP2 (idx 1) => Rajwada, OP3 (idx 2) => Palasia
const CENTERS = {
  "Vijay Nagar": { lat: 22.7533, lon: 75.8937 },
  "Rajwada": { lat: 22.7180, lon: 75.8550 },
  "Palasia": { lat: 22.7230, lon: 75.8850 },
};

// ─── Helper: deterministic pseudo-random (seedable) ─────────────
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateLocation(
  center: { lat: number; lon: number },
  radiusKm: number,
  rng: () => number
): { lat: number; lon: number } {
  const latOffset = ((rng() * 2 - 1) * radiusKm) / 111.0;
  const lonOffset = ((rng() * 2 - 1) * radiusKm) / 111.0;
  return {
    lat: Math.round((center.lat + latOffset) * 1000000) / 1000000,
    lon: Math.round((center.lon + lonOffset) * 1000000) / 1000000,
  };
}

// ─── Generate Depots ─────────────────────────────────────────────
function generateDepots(): Depot[] {
  return [
    {
      id: "d1-demo-vijay-nagar",
      operator_id: OP1_ID,
      operator: OP1,
      name: "Shree Balaji Logistics - Vijay Nagar Distribution Hub",
      latitude: CENTERS["Vijay Nagar"].lat,
      longitude: CENTERS["Vijay Nagar"].lon,
    },
    {
      id: "d2-demo-rajwada",
      operator_id: OP2_ID,
      operator: OP2,
      name: "Aakash Road Carriers - Rajwada Freight Yard",
      latitude: CENTERS["Rajwada"].lat,
      longitude: CENTERS["Rajwada"].lon,
    },
    {
      id: "d3-demo-palasia",
      operator_id: OP3_ID,
      operator: OP3,
      name: "Ramesh Transport Services - Palasia Distribution Centre",
      latitude: CENTERS["Palasia"].lat,
      longitude: CENTERS["Palasia"].lon,
    },
  ];
}

// ─── Generate Vehicles ───────────────────────────────────────────
const VEHICLE_MODELS: [string, string, number][] = [
  ["Tata 407", "VAN", 1000],
  ["Ashok Leyland Dost", "VAN", 1250],
  ["Mahindra Bolero Pickup", "VAN", 800],
  ["Tata 709", "TRUCK", 2500],
  ["Eicher Pro 2055", "TRUCK", 3000],
  ["BharatBenz 1217", "TRUCK", 5500],
  ["Tata 1109", "TRUCK", 6000],
];

function generateVehicles(): Vehicle[] {
  const vehicles: Vehicle[] = [];
  const rng = seededRandom(42);
  const operators = [
    { op: OP1, depotId: "d1-demo-vijay-nagar", depotName: "Vijay Nagar Distribution Hub" },
    { op: OP2, depotId: "d2-demo-rajwada", depotName: "Rajwada Freight Yard" },
    { op: OP3, depotId: "d3-demo-palasia", depotName: "Palasia Distribution Centre" },
  ];

  const rtos = ["09", "04", "13", "10", "43"];
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let idx = 0;

  for (const { op, depotId, depotName } of operators) {
    for (let v = 0; v < 5; v++) {
      const modelIdx = Math.floor(rng() * VEHICLE_MODELS.length);
      const [, vType, cap] = VEHICLE_MODELS[modelIdx];

      const rto = rtos[Math.floor(rng() * rtos.length)];
      const l1 = letters[Math.floor(rng() * 26)];
      const l2 = letters[Math.floor(rng() * 26)];
      const nums = (1000 + Math.floor(rng() * 9000)).toString();
      const ref = `MP${rto}${l1}${l2}${nums}`;

      const r = rng();
      const status: Vehicle["status"] = r < 0.6 ? "AVAILABLE" : r < 0.9 ? "IN_TRANSIT" : "MAINTENANCE";

      vehicles.push({
        id: `v-demo-${idx}`,
        reference_number: ref,
        vehicle_type: vType,
        operator_id: op.id,
        operator: op,
        depot_id: depotId,
        depot: { id: depotId, name: depotName },
        capacity_kg: cap,
        status,
        scenario: "DEMO",
        created_at: "2026-09-26T10:00:00Z",
      });
      idx++;
    }
  }
  return vehicles;
}

// ─── Generate Orders ─────────────────────────────────────────────
function generateOrders(): Order[] {
  const orders: Order[] = [];
  const rng = seededRandom(100);
  const prefixes = ["IND", "MPLOG", "CGR", "CARGO", "FRT"];

  const operatorCfgs = [
    { op: OP1, depotId: "d1-demo-vijay-nagar", depotName: "Vijay Nagar Distribution Hub", center: CENTERS["Vijay Nagar"], altCenter: CENTERS["Rajwada"] },
    { op: OP2, depotId: "d2-demo-rajwada", depotName: "Rajwada Freight Yard", center: CENTERS["Rajwada"], altCenter: CENTERS["Palasia"] },
    { op: OP3, depotId: "d3-demo-palasia", depotName: "Palasia Distribution Centre", center: CENTERS["Palasia"], altCenter: CENTERS["Vijay Nagar"] },
  ];

  let seq = 1;
  for (const cfg of operatorCfgs) {
    const count = 50; // Match seed: 50 orders per operator in DEMO
    for (let i = 0; i < count; i++) {
      const prefix = prefixes[Math.floor(rng() * prefixes.length)];
      const ref = `${prefix}-2609${seq.toString().padStart(3, "0")}`;

      const cluster = rng() < 0.5 ? cfg.center : cfg.altCenter;
      const loc = generateLocation(cluster, 2.0, rng);

      const wtClass = Math.floor(rng() * 6);
      let weight: number;
      if (wtClass < 3) weight = Math.round((5 + rng() * 45) * 10) / 10;
      else if (wtClass < 5) weight = Math.round((200 + rng() * 600) * 10) / 10;
      else weight = Math.round((1000 + rng() * 2500) * 10) / 10;

      const r = rng();
      const status: Order["status"] = r < 0.4 ? "PENDING" : r < 0.7 ? "SCHEDULED" : r < 0.9 ? "COMPLETED" : "FAILED";

      orders.push({
        id: `o-demo-${seq}`,
        reference_number: ref,
        operator_id: cfg.op.id,
        operator: cfg.op,
        origin_depot_id: cfg.depotId,
        origin_depot: { id: cfg.depotId, name: cfg.depotName },
        destination_latitude: loc.lat,
        destination_longitude: loc.lon,
        weight_kg: weight,
        status,
        scenario: "DEMO",
        created_at: "2026-09-26T10:00:00Z",
      });
      seq++;
    }
  }
  return orders;
}

// ─── Generate Return Loads ───────────────────────────────────────
function generateReturnLoads(): ReturnLoad[] {
  const loads: ReturnLoad[] = [];
  const rng = seededRandom(200);

  const operatorCfgs = [
    { op: OP1, center: CENTERS["Vijay Nagar"], altCenter: CENTERS["Rajwada"] },
    { op: OP2, center: CENTERS["Rajwada"], altCenter: CENTERS["Palasia"] },
    { op: OP3, center: CENTERS["Palasia"], altCenter: CENTERS["Vijay Nagar"] },
  ];

  const prefixes = ["RL", "RET", "BHA"];
  let seq = 1;

  for (const cfg of operatorCfgs) {
    const count = 5 + Math.floor(rng() * 6); // 5-10 per operator
    for (let i = 0; i < count; i++) {
      const prefix = prefixes[Math.floor(rng() * prefixes.length)];
      const ref = `${prefix}-2609${seq.toString().padStart(3, "0")}`;

      const pickupLoc = generateLocation(rng() < 0.5 ? cfg.center : cfg.altCenter, 4.0, rng);
      const deliveryLoc = generateLocation(cfg.center, 1.0, rng);

      const weight = Math.round((50 + rng() * 950) * 10) / 10;

      const r = rng();
      const status = r < 0.7 ? "PENDING" : r < 0.9 ? "MATCHED" : "FULFILLED";

      loads.push({
        id: `rl-demo-${seq}`,
        reference_number: ref,
        operator_id: cfg.op.id,
        operator: cfg.op,
        pickup_latitude: pickupLoc.lat,
        pickup_longitude: pickupLoc.lon,
        delivery_latitude: deliveryLoc.lat,
        delivery_longitude: deliveryLoc.lon,
        pickup_location: [pickupLoc.lat, pickupLoc.lon],
        delivery_location: [deliveryLoc.lat, deliveryLoc.lon],
        weight_kg: weight,
        status,
      });
      seq++;
    }
  }
  return loads;
}

// ─── Generate Optimization Run ───────────────────────────────────
function generateOptimizationRun(): OptimizationRunResponse {
  const rng = seededRandom(300);
  const routes: OptimizationRunResponse["routes"] = [];

  // Generate 8 realistic routes
  for (let i = 0; i < 8; i++) {
    const vehicleId = `v-demo-${i}`;
    const stops: OptimizationRunResponse["routes"][0]["stops"] = [];
    const coordinates: [number, number][] = [];

    // Each route visits 4-8 stops
    const numStops = 4 + Math.floor(rng() * 5);
    const center = i < 3 ? CENTERS["Vijay Nagar"] : i < 6 ? CENTERS["Rajwada"] : CENTERS["Palasia"];

    for (let s = 0; s < numStops; s++) {
      const loc = generateLocation(center, 3.0, rng);
      stops.push({
        order_id: `o-demo-${i * 6 + s + 1}`,
        stop_type: s === 0 ? "PICKUP" : "DELIVERY",
        sequence_index: s,
        location: [loc.lat, loc.lon],
      });
      coordinates.push([loc.lon, loc.lat]);
    }

    routes.push({
      vehicle_id: vehicleId,
      total_distance_meters: 15000 + Math.floor(rng() * 25000),
      total_duration_seconds: 1800 + Math.floor(rng() * 3600),
      geometry: {
        type: "LineString",
        coordinates,
      },
      stops,
      return_load: i < 3 ? { id: `rl-demo-${i + 1}` } : undefined,
    });
  }

  return {
    run_id: "demo-run-001-optimization-result-uuid",
    status: "COMPLETED",
    scenario: "DEMO",
    solver_status: "OPTIMAL",
    diagnostics: [],
    metrics: {
      baseline: {
        distance_meters: 248000,
        duration_seconds: 32400,
        vehicles_used: 12,
      },
      optimized: {
        distance_meters: 178500,
        duration_seconds: 24300,
        vehicles_used: 8,
      },
      savings: {
        comparable_workload_count: 150,
        distance_saved_meters: 69500,
        cost_saved_inr: 12450,
        co2_saved_kg: 42.8,
      },
    },
    routes,
  };
}

// ─── Generate Analytics Metrics ──────────────────────────────────
function generateAnalyticsMetrics(): AnalyticsMetricsResponse {
  return {
    total_distance: 178500,
    total_cost: 45200,
    utilization_pct: 72,
    empty_returns_reduced: 35,
    return_loads_matched: 12,
    co2_reduced: 42.8,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Public API: Demo data service
// ═══════════════════════════════════════════════════════════════════

// Singleton caches
let _depots: Depot[] | null = null;
let _vehicles: Vehicle[] | null = null;
let _orders: Order[] | null = null;
let _returnLoads: ReturnLoad[] | null = null;
let _optimizationRun: OptimizationRunResponse | null = null;
let _analyticsMetrics: AnalyticsMetricsResponse | null = null;

function getDepots(): Depot[] {
  if (!_depots) _depots = generateDepots();
  return _depots;
}
function getVehicles(): Vehicle[] {
  if (!_vehicles) _vehicles = generateVehicles();
  return _vehicles;
}
function getOrders(): Order[] {
  if (!_orders) _orders = generateOrders();
  return _orders;
}
function getReturnLoads(): ReturnLoad[] {
  if (!_returnLoads) _returnLoads = generateReturnLoads();
  return _returnLoads;
}
function getOptimizationRun(): OptimizationRunResponse {
  if (!_optimizationRun) _optimizationRun = generateOptimizationRun();
  return _optimizationRun;
}
function getAnalyticsMetrics(): AnalyticsMetricsResponse {
  if (!_analyticsMetrics) _analyticsMetrics = generateAnalyticsMetrics();
  return _analyticsMetrics;
}

// Paginate helper
function paginate<T>(items: T[], page: number, pageSize: number): PaginatedResponse<T> {
  const start = (page - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);
  return {
    items: paged,
    total: items.length,
    page,
    size: pageSize,
    pages: Math.ceil(items.length / pageSize),
  };
}

/**
 * Resolves a demo API call by matching the endpoint pattern.
 * Returns the appropriate fixture data, or null if the endpoint is unrecognized.
 *
 * This function is called from apiClient.ts ONLY when demo mode is active.
 */
export function resolveDemoApiCall<T>(endpoint: string, _options?: RequestInit): T | null {
  // Normalize: remove leading slash
  const ep = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;

  // Parse query parameters
  const [path, queryString] = ep.split("?");
  const params = new URLSearchParams(queryString || "");
  const page = parseInt(params.get("page") || "1", 10);
  const pageSize = parseInt(params.get("page_size") || "20", 10);
  const statusFilter = params.get("status") || "";

  // ─── Orders ───
  if (path === "orders") {
    let items = getOrders();
    if (statusFilter) items = items.filter((o) => o.status === statusFilter);
    return paginate(items, page, pageSize) as T;
  }

  // ─── Vehicles ───
  if (path === "vehicles") {
    let items = getVehicles();
    if (statusFilter) items = items.filter((v) => v.status === statusFilter);
    return paginate(items, page, pageSize) as T;
  }

  // ─── Depots ───
  if (path === "depots") {
    return paginate(getDepots(), page, pageSize) as T;
  }

  // ─── Return Loads ───
  if (path === "return-loads") {
    let items = getReturnLoads();
    if (statusFilter) items = items.filter((r) => r.status === statusFilter);
    return paginate(items, page, pageSize) as T;
  }

  // ─── Optimization Latest ───
  if (path === "optimization/latest") {
    return getOptimizationRun() as T;
  }

  // ─── Optimization Runs (POST — demo does not actually run, returns the cached result) ───
  if (path === "optimization/runs") {
    return getOptimizationRun() as T;
  }

  // ─── Analytics Metrics ───
  if (path === "analytics/metrics") {
    return getAnalyticsMetrics() as T;
  }

  // ─── Auth Me (demo profile — should not be called, but handle gracefully) ───
  if (path === "auth/me") {
    // This should not be reached in demo mode since AuthContext handles it,
    // but return a reasonable response to avoid errors.
    return {
      id: "demo-user",
      role: "OPERATOR",
      operator_id: OP1_ID,
      operator_name: "Shree Balaji Logistics",
      email: "demo@cargosync.ai",
    } as T;
  }

  // Unrecognized endpoint — return null to signal the caller
  console.warn(`[Demo Mode] Unrecognized API endpoint: ${endpoint}`);
  return null;
}
