import { useState, useEffect } from "react";
import { Package, Truck, Gauge, TrendingDown, RefreshCw, AlertCircle, Loader2, Route, MapPin } from "lucide-react";
import { C, mono } from "../data/prototype/designTokens";
import { MetricCard } from "../components/shared/MetricCard";
import { Panel } from "../components/shared/Panel";

import { StatusBadge } from "../components/shared/StatusBadge";
import { NetworkMap } from "../features/map/NetworkMap";
import { useAuth } from "../contexts/AuthContext";
import { useMobile } from "../hooks/useMobile";
import type { OptimizationRunResponse, AnalyticsMetricsResponse } from "../types/api";

export function DashboardPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'ADMIN';
  const isMobile = useMobile();

  // Entity totals from PaginatedResponse
  const [totals, setTotals] = useState<{ orders: number, fleet: number, depots: number, returnLoads: number } | null>(null);

  // Real API data
  const [metrics, setMetrics] = useState<AnalyticsMetricsResponse | null>(null);
  const [latestRun, setLatestRun] = useState<OptimizationRunResponse | null>(null);
  const [returnLoads, setReturnLoads] = useState<any[] | null>(null);
  const [, setDepots] = useState<any[] | null>(null);
  const [orders, setOrders] = useState<any[] | null>(null);

  // Loading / error state
  const [fetchStatus, setFetchStatus] = useState<"idle" | "loading" | "success" | "error">("loading");
  const [pageError, setPageError] = useState<string | null>(null);


  const [scenario] = useState("DEMO");

  const fetchDashboardData = () => {
    setFetchStatus("loading");
    setPageError(null);

    
    import("../services/apiClient").then(({ api }) => {
      Promise.all([
        api.analytics.getMetrics(scenario),
        api.orders.list({ scenario }),
        api.fleet.listVehicles({ scenario }),
        api.fleet.listDepots({ scenario }),
        api.returnLoads.list({ scenario })
      ]).then(([metricsData, ordersData, fleetData, depotsData, rlData]) => {
        setMetrics(metricsData);
        setTotals({
          orders: ordersData.total,
          fleet: fleetData.total,
          depots: depotsData.total,
          returnLoads: rlData.total
        });
        setDepots(depotsData.items);
        setReturnLoads(rlData.items);
        setOrders(ordersData.items);
        setFetchStatus("success");
      }).catch(err => {
        console.error("Dashboard core fetch error:", err);
        setPageError(err.message || "Failed to load network overview data.");
        setFetchStatus("error");
      }).finally(() => {
        api.optimization.getLatest(scenario)
          .then(setLatestRun)
          .catch(err => {
            if (err.status === 404) setLatestRun(null);
          });
      });
    });
  };

  useEffect(() => {
    fetchDashboardData();
  }, [scenario]);

  const onAssign = (id: string) => setReturnLoads((prev) => prev ? prev.map((r) => r.id === id ? { ...r, status: "ASSIGNED" } : r) : null);

  // Derived optimization values (null-safe)
  const hasOptimization = latestRun !== null && latestRun.status === "COMPLETED";
  const optMetrics = hasOptimization ? latestRun.metrics : null;
  const routeCount = hasOptimization ? latestRun.routes.length : 0;
  const distSavedKm = optMetrics?.savings ? Math.round(optMetrics.savings.distance_saved_meters / 1000 * 10) / 10 : null;
  const costSaved = optMetrics?.savings?.cost_saved_inr ?? null;
  const co2Saved = optMetrics?.savings?.co2_saved_kg ?? null;

  if (fetchStatus === "error") {
    return (
      <div className="fade-in" style={{ padding: 26, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, gap: 12 }}>
        <AlertCircle size={24} color={C.coral} />
        <div style={{ fontSize: 14, color: C.ink }}>{pageError}</div>
        <button onClick={fetchDashboardData} style={{ background: C.ink, color: C.ivory, border: "none", padding: "8px 18px", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: isMobile ? 16 : 32, maxWidth: 1400, margin: "0 auto", width: "100%", paddingBottom: 60 }}>
      {isAdmin ? (
        <>
          {/* Admin Header */}
          <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em", marginBottom: 8 }}>
                CARGOSYNC NETWORK CONTROL CENTER
              </div>
              <div style={{ fontSize: 14.5, color: C.slate, maxWidth: 650, lineHeight: 1.5 }}>
                Monitor operators, demand, fleet capacity, optimization activity, routes, and network impact from a single control layer.
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(30,143,107,0.1)", color: C.emerald, padding: "6px 12px", borderRadius: 999, fontWeight: 600, fontSize: 12, border: "1px solid rgba(30,143,107,0.2)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.emerald }} />
              NETWORK LIVE
            </div>
          </div>

          {/* Section 1 - Network Operational Snapshot */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 16, marginBottom: 32, opacity: fetchStatus === "loading" ? 0.6 : 1 }}>
            <MetricCard icon={<MapPin size={16} color={C.navy} />} label="Active Hubs" value={totals ? totals.depots.toString() : "\u2014"} sub="Network nodes" />
            <MetricCard icon={<Package size={16} color={C.navy} />} label="Network Orders" value={totals ? totals.orders.toString() : "\u2014"} sub="Consolidated demand" />
            <MetricCard icon={<Truck size={16} color={C.navy} />} label="Network Vehicles" value={totals ? totals.fleet.toString() : "\u2014"} sub="Network capacity" />
            <MetricCard icon={<Route size={16} color={C.coral} />} label="Optimized Routes" value={routeCount.toString()} sub="Optimized paths" accent />
          </div>

          {/* Section 2 - Network Operations Flow */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 16, letterSpacing: "-0.01em" }}>Network Pipeline</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(5, 1fr)", gap: 16 }}>
              <WorkflowStep icon={<MapPin size={18} color={C.navy} />} title="Network Hubs" count={totals?.depots || 0} desc="Active depot locations" />
              <WorkflowStep icon={<Package size={18} color={C.navy} />} title="Orders" count={totals?.orders || 0} desc="Total demand" />
              <WorkflowStep icon={<RefreshCw size={18} color={C.coral} />} title="Optimization" count={hasOptimization ? 1 : 0} desc="Network-wide run" accent />
              <WorkflowStep icon={<Route size={18} color={C.navy} />} title="Routes" count={routeCount} desc="Optimized paths" />
              <WorkflowStep icon={<TrendingDown size={18} color={C.emerald} />} title="Return Loads" count={totals?.returnLoads || 0} desc="Matched backhauls" />
            </div>
          </div>

          {/* Section 3 - Network Map & Optimization Status */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 340px", gap: 24, marginBottom: 32 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em" }}>Network Operations Map</div>
                <div style={{ fontSize: 13, color: C.slate, marginTop: 4 }}>Live network view across participating operators, orders, vehicles and return-load activity.</div>
              </div>
              <div style={{ height: 440, borderRadius: 12, overflow: "hidden", border: `1px solid ${C.stone}`, position: "relative", zIndex: 1 }}>
                <NetworkMap />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: isMobile ? 0 : 58 }}>
              {/* Section 4 - Optimization Status */}
              <div style={{ background: C.navy, borderRadius: 12, padding: 24, color: C.ivory, border: `1px solid ${C.charcoal}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.peach, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 }}>Optimization Status</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>Latest Run</div>
                    <div style={{ fontSize: 13, fontFamily: mono, fontWeight: 600 }}>{latestRun?.run_id ? latestRun.run_id.slice(0, 18) + "..." : "No run found"}</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>Status</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: hasOptimization ? C.emerald : C.coral }}>{latestRun?.status || "\u2014"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>Routes Generated</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{routeCount}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 6 - Network Impact */}
              {hasOptimization && (
                <div style={{ background: C.ivory, borderRadius: 12, padding: 24, border: `1px solid ${C.stone}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.slate, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 16 }}>Network Impact</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <MiniRow label="Distance Saved" value={distSavedKm !== null ? `${distSavedKm} km` : "\u2014"} />
                    <MiniRow label="Cost Saved" value={costSaved !== null ? `\u20B9${Math.round(costSaved).toLocaleString("en-IN")}` : "\u2014"} accent />
                    <MiniRow label="Vehicles Used" value={optMetrics?.optimized.vehicles_used.toString() || "\u2014"} />
                    <MiniRow label="CO₂ Avoided" value={co2Saved !== null ? `${Math.round(co2Saved)} kg` : "\u2014"} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 5 - Network Activity */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 24 }}>
            <Panel title="Recent Network Orders">
              {fetchStatus === "loading" && !orders ? (
                <div style={{ padding: 20, textAlign: "center" }}><Loader2 size={16} color={C.slate} className="spin" /></div>
              ) : !orders || orders.length === 0 ? (
                <div style={{ fontSize: 13, color: C.slate, padding: "10px 0" }}>No active orders across the network.</div>
              ) : (
                orders.slice(0, 5).map((o: any) => (
                  <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${C.stone}` }}>
                    <div>
                      <div style={{ fontWeight: 600, color: C.ink, fontSize: 13, fontFamily: mono, marginBottom: 2 }}>{o.reference_number || o.id.slice(0, 8)}</div>
                      <div style={{ fontSize: 11.5, color: C.slate }}>{o.pickup_location?.name || "Pickup"} → {o.delivery_location?.name || "Delivery"}</div>
                    </div>
                    <StatusBadge status={o.status || "PENDING"} />
                  </div>
                ))
              )}
            </Panel>

            <Panel title="Network Return-Load Activity">
              {fetchStatus === "loading" && !returnLoads ? (
                <div style={{ padding: 20, textAlign: "center" }}><Loader2 size={16} color={C.slate} className="spin" /></div>
              ) : !returnLoads || returnLoads.length === 0 ? (
                <div style={{ fontSize: 13, color: C.slate, padding: "10px 0" }}>No return-load activity on the network.</div>
              ) : (
                returnLoads.slice(0, 5).map((r: any) => (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${C.stone}` }}>
                    <div>
                      <div style={{ fontWeight: 600, color: C.ink, fontSize: 13, fontFamily: mono, marginBottom: 2 }}>{r.reference_number || r.id.slice(0, 8)}</div>
                      <div style={{ fontSize: 11.5, color: C.slate }}>{r.origin?.name || "Origin"} → {r.destination?.name || "Destination"}</div>
                    </div>
                    <StatusBadge status={r.status || "PENDING"} />
                  </div>
                ))
              )}
            </Panel>
          </div>
        </>
      ) : (
        <>
          {/* Header */}
      <div style={{ marginBottom: 32, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.ink, letterSpacing: "-0.01em" }}>
            {profile?.operator_name || "Shree Balaji Logistics"}
          </div>
          <div style={{ fontSize: 14, color: C.slate }}>
            Indore, Madhya Pradesh
          </div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: "rgba(30,143,107,0.12)", color: C.emerald, border: `1px solid ${C.emerald}33` }}>OPERATIONAL</div>
      </div>

        {/* Section 1 - Operational Snapshot */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 16, marginBottom: 32, opacity: fetchStatus === "loading" ? 0.6 : 1 }}>
          <MetricCard icon={<Package size={16} color={C.navy} />} label="My Orders" value={totals ? totals.orders.toString() : "\u2014"} sub="Active delivery demand" />
          <MetricCard icon={<Truck size={16} color={C.navy} />} label="My Vehicles" value={totals ? totals.fleet.toString() : "\u2014"} sub="Available capacity" />
          <MetricCard icon={<Gauge size={16} color={C.navy} />} label="Current Utilization" value={metrics ? `${metrics.utilization_pct}%` : "\u2014"} sub="Network-wide" />
          <MetricCard icon={<MapPin size={16} color={C.coral} />} label="Active Depots" value={totals ? totals.depots.toString() : "\u2014"} sub="Network locations" accent />
        </div>

        {/* Section 2 - CargoSync Optimization */}
        <div style={{ background: C.navy, borderRadius: 12, padding: isMobile ? "24px 20px" : "28px 36px", color: C.ivory, marginBottom: 32, display: "flex", flexDirection: isMobile ? "column" : "row", gap: 32, alignItems: isMobile ? "flex-start" : "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, opacity: 0.05, pointerEvents: "none" }}>
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs><pattern id="grid-dark" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke={C.ivory} strokeWidth="1"/></pattern></defs>
              <rect width="100%" height="100%" fill="url(#grid-dark)" />
            </svg>
          </div>
          
          <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: C.coral, marginBottom: 10 }}>CARGOSYNC OPTIMIZATION</div>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, letterSpacing: "-0.01em" }}>{hasOptimization ? "Optimization Completed" : "Optimization Ready"}</div>
            <div style={{ fontSize: 14.5, color: "rgba(250,246,239,0.7)", maxWidth: 420, lineHeight: 1.5 }}>
              {hasOptimization ? "Your operational demand has been successfully coordinated with the network for improved efficiency." : "Run an optimization scenario to coordinate your orders and reduce empty miles."}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 16, position: "relative", zIndex: 1, width: isMobile ? "100%" : "auto" }}>
            <div style={{ background: "rgba(250,246,239,0.1)", borderRadius: 8, padding: "16px 20px", minWidth: 120 }}>
              <div style={{ fontSize: 12, color: "rgba(250,246,239,0.7)", marginBottom: 6 }}>Distance Saved</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: mono, color: C.coral }}>{distSavedKm !== null ? `${distSavedKm} km` : "\u2014"}</div>
            </div>
            <div style={{ background: "rgba(250,246,239,0.1)", borderRadius: 8, padding: "16px 20px", minWidth: 120 }}>
              <div style={{ fontSize: 12, color: "rgba(250,246,239,0.7)", marginBottom: 6 }}>Vehicles Used</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: mono }}>{hasOptimization && optMetrics ? optMetrics.optimized.vehicles_used : "\u2014"}</div>
            </div>
            <div style={{ background: "rgba(250,246,239,0.1)", borderRadius: 8, padding: "16px 20px", minWidth: 120, gridColumn: isMobile ? "span 2" : "auto" }}>
              <div style={{ fontSize: 12, color: "rgba(250,246,239,0.7)", marginBottom: 6 }}>Cost Saved</div>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: mono, color: C.emerald }}>{costSaved !== null ? `\u20B9${Math.round(costSaved).toLocaleString("en-IN")}` : "\u2014"}</div>
            </div>
          </div>
        </div>

        {/* Section 3 - Operational Workflow */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 16, letterSpacing: "-0.01em" }}>Operational Workflow</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(5, 1fr)", gap: 16 }}>
            <WorkflowStep icon={<Package size={18} color={C.navy} />} title="My Orders" count={totals?.orders || 0} desc="Active delivery demand" />
            <WorkflowStep icon={<Truck size={18} color={C.navy} />} title="My Vehicles" count={totals?.fleet || 0} desc="Active capacity" />
            <WorkflowStep icon={<RefreshCw size={18} color={C.coral} />} title="Optimization" count={hasOptimization ? 1 : 0} desc="Coordination run" accent />
            <WorkflowStep icon={<Route size={18} color={C.navy} />} title="Assigned Routes" count={routeCount} desc="Optimized plan" />
            <WorkflowStep icon={<TrendingDown size={18} color={C.emerald} />} title="Return Loads" count={totals?.returnLoads || 0} desc="Matched backhauls" />
          </div>
        </div>

        {/* Section 4 - Recent/Priority Operations & Return Loads */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 24 }}>
          {/* Recent Orders */}
          <Panel title="Priority Orders">
            {fetchStatus === "loading" && !orders ? (
              <div style={{ padding: 20, textAlign: "center" }}><Loader2 size={16} color={C.slate} className="spin" /></div>
            ) : !orders || orders.length === 0 ? (
              <div style={{ fontSize: 13, color: C.slate, padding: "10px 0" }}>No active orders.</div>
            ) : (
              orders.slice(0, 5).map((o: any) => (
                <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${C.stone}` }}>
                  <div>
                    <div style={{ fontWeight: 600, color: C.ink, fontSize: 13, fontFamily: mono, marginBottom: 2 }}>{o.reference_number || o.id.slice(0, 8)}</div>
                    <div style={{ fontSize: 11.5, color: C.slate }}>{o.pickup_location?.name || "Pickup"} → {o.delivery_location?.name || "Delivery"}</div>
                  </div>
                  <StatusBadge status={o.status || "PENDING"} />
                </div>
              ))
            )}
          </Panel>

          {/* Return Loads */}
          <Panel title="Return-Load Opportunities">
            {fetchStatus === "loading" && !returnLoads ? (
              <div style={{ padding: 20, textAlign: "center" }}><Loader2 size={16} color={C.slate} className="spin" /></div>
            ) : !returnLoads || returnLoads.length === 0 ? (
              <div style={{ fontSize: 13, color: C.slate, padding: "10px 0" }}>No return-load opportunities found.</div>
            ) : (
              returnLoads.slice(0, 5).map((r: any) => (
                <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${C.stone}` }}>
                  <div>
                    <div style={{ fontWeight: 600, color: C.ink, fontSize: 13, fontFamily: mono, marginBottom: 2 }}>{r.reference_number || r.id.slice(0, 8)}</div>
                    <div style={{ fontSize: 11.5, color: C.slate }}>{r.origin?.name || "Origin"} → {r.destination?.name || "Destination"}</div>
                  </div>
                  {r.status === "CANDIDATE" ? (
                    <button onClick={() => onAssign(r.id)} style={{ background: C.coral, color: C.ivory, border: "none", borderRadius: 4, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }} className="c-btn-hover">Assign</button>
                  ) : <StatusBadge status={r.status} />}
                </div>
              ))
            )}
          </Panel>
        </div>
        </>
      )}
      </div>
    );
  }





function MiniRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ fontSize: 11.5, display: "flex", justifyContent: "space-between" }}>
      <span style={{ color: C.slate }}>{label}</span>
      <span style={{ fontFamily: mono, fontWeight: 600, color: accent ? C.coral : C.ink }}>{value}</span>
    </div>
  );
}

/** Business Dashboard Workflow Step Card */
function WorkflowStep({ icon, title, count, desc, accent }: any) {
  return (
    <div className="c-card-hover" style={{ background: C.ivory, border: `1px solid ${accent ? C.coral : C.stone}`, borderRadius: 10, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: accent ? "rgba(232,84,46,0.1)" : "rgba(27,35,51,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 12, color: C.slate }}>{desc}</div>
      </div>
      <div style={{ marginTop: "auto", fontSize: 20, fontWeight: 700, fontFamily: mono, color: accent ? C.coral : C.ink }}>
        {count}
      </div>
    </div>
  );
}
