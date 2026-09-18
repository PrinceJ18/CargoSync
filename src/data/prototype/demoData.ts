export const OPERATORS = [
  { id: "OP-01", name: "Malwa Express Logistics", orders: 42, vehicles: 6, utilization: 78 },
  { id: "OP-02", name: "Indore FreightWorks", orders: 31, vehicles: 4, utilization: 71 },
  { id: "OP-03", name: "Rajwada Cargo Movers", orders: 27, vehicles: 3, utilization: 64 },
  { id: "OP-04", name: "Vindhya Transit Co.", orders: 19, vehicles: 3, utilization: 58 },
];

export const VEHICLES = [
  { id: "TRK-IND-01", operator: "OP-01", capacity: 1200, load: 940, stops: 7, distance: 41.3, util: 78, returnLoad: "Assigned" },
  { id: "TRK-IND-04", operator: "OP-01", capacity: 1200, load: 920, stops: 8, distance: 48.2, util: 77, returnLoad: "Assigned" },
  { id: "TRK-IND-09", operator: "OP-02", capacity: 900, load: 610, stops: 5, distance: 33.6, util: 68, returnLoad: "Pending" },
  { id: "TRK-IND-12", operator: "OP-03", capacity: 1500, load: 980, stops: 9, distance: 52.9, util: 65, returnLoad: "Assigned" },
];

export const RETURN_LOADS = [
  { id: "RL-IND-006", from: "Pithampur", to: "Indore", weightKg: 240, capacityOk: true, timeOk: true, distanceOk: true, sharingOk: true, status: "CANDIDATE", reason: null },
  { id: "RL-IND-011", from: "Dewas", to: "Indore", weightKg: 310, capacityOk: true, timeOk: true, distanceOk: false, sharingOk: true, status: "REJECTED", reason: "Excessive detour" },
  { id: "RL-IND-014", from: "Mhow", to: "Indore", weightKg: 180, capacityOk: true, timeOk: true, distanceOk: true, sharingOk: true, status: "ASSIGNED", reason: null },
];

export const IMPACT = [
  { name: "Baseline", distance: 612, cost: 38400 },
  { name: "CargoSync", distance: 471, cost: 27950 },
];
export const UTIL_TREND = [
  { run: "R-01", util: 54 }, { run: "R-02", util: 59 }, { run: "R-03", util: 63 },
  { run: "R-04", util: 68 }, { run: "R-05", util: 74 }, { run: "R-06", util: 77 },
];
export const RETURN_TREND = [
  { run: "R-01", loads: 2 }, { run: "R-02", loads: 3 }, { run: "R-03", loads: 3 },
  { run: "R-04", loads: 5 }, { run: "R-05", loads: 6 }, { run: "R-06", loads: 8 },
];

export const ORDERS = [
  { id: "ORD-2291", operator: "Malwa Express", customer: "Anup Traders", pickup: "Rajendra Nagar", delivery: "Vijay Nagar", weight: 180, priority: "High", status: "In Transit", returnEligible: true },
  { id: "ORD-2292", operator: "Indore FreightWorks", customer: "Shree Textiles", pickup: "MG Road", delivery: "Palasia", weight: 95, priority: "Normal", status: "Delivered", returnEligible: false },
  { id: "ORD-2293", operator: "Rajwada Cargo", customer: "Omkar Traders", pickup: "Bhawarkuan", delivery: "Sudama Nagar", weight: 240, priority: "High", status: "Pending", returnEligible: true },
  { id: "ORD-2294", operator: "Vindhya Transit", customer: "Kailash Store", pickup: "Sanwer Road", delivery: "Pithampur", weight: 310, priority: "Normal", status: "In Transit", returnEligible: true },
  { id: "ORD-2295", operator: "Malwa Express", customer: "Devi Agencies", pickup: "Vijay Nagar", delivery: "Rau", weight: 128, priority: "Low", status: "Delivered", returnEligible: false },
];

export const ROUTE_STOPS = [
  { id: "Depot", loadAfter: 920, x: 260, y: 200 },
  { id: "Stop 01", loadAfter: 780, x: 100, y: 90 },
  { id: "Stop 02", loadAfter: 620, x: 400, y: 70 },
  { id: "Stop 03", loadAfter: 430, x: 460, y: 220 },
  { id: "Delivery", loadAfter: 280, x: 340, y: 320 },
  { id: "Return Load", loadAfter: 520, x: 130, y: 300 },
  { id: "Depot", loadAfter: 520, x: 60, y: 200 },
];

export const PIPELINE = [
  "Order Validation", "Coordinate Validation", "DBSCAN", "Cluster Validation",
  "Capacity", "Road Distance", "OR-Tools", "Return Load", "Baseline", "Savings",
];

export const heroNetworkData = {
  depot: { id: "DEPOT", x: 70, y: 230, label: "Indore Depot" },
  orders: [
    { id: "o1", x: 150, y: 90, cluster: "A" },
    { id: "o2", x: 190, y: 60, cluster: "A" },
    { id: "o3", x: 170, y: 130, cluster: "A" },
    { id: "o4", x: 330, y: 110, cluster: "B" },
    { id: "o5", x: 360, y: 160, cluster: "B" },
    { id: "o6", x: 320, y: 190, cluster: "B" },
    { id: "o7", x: 250, y: 280, cluster: null }, // noise / outlier
  ],
  clusters: {
    A: { x: 170, y: 90, color: "coral" },
    B: { x: 335, y: 150, color: "navy" },
  },
  vehicle: { id: "TRK-IND-04", capacityKg: 1200 },
  route: { stops: ["A", "B"], loadAfterDelivery: 280 },
  returnLoad: { id: "RL-IND-006", from: "B", to: "DEPOT", weightKg: 240 },
};

export const HERO_STAGES = [
  { key: "orders", label: "Orders placed", dur: 1400 },
  { key: "dbscan", label: "DBSCAN clustering", dur: 1600 },
  { key: "capacity", label: "Vehicle capacity", dur: 1300 },
  { key: "route", label: "OR-Tools route", dur: 1700 },
  { key: "delivery", label: "Delivery in progress", dur: 1800 },
  { key: "returnload", label: "Return load matched", dur: 1600 },
  { key: "result", label: "Return load assigned", dur: 1600 },
];

export const STAGES = [
  { k: "orders", label: "Orders", detail: "Operators submit delivery orders with pickup, delivery and cargo detail." },
  { k: "coords", label: "Coordinates", detail: "Addresses resolve to validated geographic coordinates." },
  { k: "dbscan", label: "DBSCAN", detail: "Groups geographically dense delivery requests into candidate clusters." },
  { k: "validate", label: "Cluster Validation", detail: "Checks geographic coherence, capacity and time-window feasibility." },
  { k: "capacity", label: "Capacity", detail: "Matches cluster demand against available vehicle capacity." },
  { k: "ortools", label: "OR-Tools", detail: "Generates a feasible constrained vehicle-routing solution." },
  { k: "return", label: "Return Load", detail: "Evaluates compatible reverse shipments against capacity, time, distance and sharing constraints." },
  { k: "savings", label: "Savings", detail: "Compares the result against independent baseline routing." },
];
